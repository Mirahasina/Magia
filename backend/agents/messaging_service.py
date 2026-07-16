import logging
import time
import requests
from .models import WhatsAppConfig, FacebookConfig

logger = logging.getLogger(__name__)

def get_whatsapp_port(user_id):
    if user_id == 'global':
        return 3001
    uid_str = str(user_id)
    return 3001 + (sum(ord(c) for c in uid_str) % 100)


def _wa_error_payload(res):
    try:
        data = res.json()
        return data.get('error') or data.get('message') or res.text
    except Exception:
        return res.text or f'HTTP {res.status_code}'


def _ensure_whatsapp_service(user, auth_token: str = ''):
    """
    Ensure Baileys is reachable for an already-linked account.
    Never creates a new session without QR — that must go through Paramètres.
    """
    from .whatsapp_process import start_for_user, is_running, auth_dir_for_user

    port = get_whatsapp_port(user.id)
    creds = auth_dir_for_user(user.id) / 'creds.json'
    if not creds.exists():
        return False, (
            "WhatsApp n'a plus de session active. "
            "Scannez le QR code dans Paramètres pour vous reconnecter."
        )

    try:
        health = requests.get(f"http://localhost:{port}/health", timeout=3)
        if health.ok and health.json().get('connected'):
            return True, None
        # Restart only if credentials still exist (active linked device)
        start_for_user(user, auth_token=auth_token, force_restart=True)
        time.sleep(2.5)
        health2 = requests.get(f"http://localhost:{port}/health", timeout=3)
        if health2.ok and health2.json().get('connected'):
            return True, None
        return False, (
            "Session WhatsApp fermée. "
            "Scannez à nouveau le QR code dans Paramètres."
        )
    except requests.RequestException:
        if is_running(user.id):
            start_for_user(user, auth_token=auth_token, force_restart=True)
        else:
            start_for_user(user, auth_token=auth_token, force_restart=False)
        time.sleep(2.5)
        try:
            health = requests.get(f"http://localhost:{port}/health", timeout=3)
            if health.ok and health.json().get('connected'):
                return True, None
        except requests.RequestException:
            pass
        return False, (
            "Le service WhatsApp ne répond pas. "
            "Reconnectez WhatsApp dans Paramètres (scan QR)."
        )


class MessagingService:
    @staticmethod
    def send_whatsapp(user, contact_info, text):
        ok, _ = MessagingService.send_whatsapp_detailed(user, contact_info, text)
        return ok

    @staticmethod
    def send_whatsapp_detailed(user, contact_info, text):
        """
        Returns (success: bool, error_message: str|None).
        """
        config = WhatsAppConfig.objects.filter(user=user).first()
        if not config or not config.is_connected:
            logger.warning(f"Impossible d'envoyer le message : WhatsApp non connecté pour {user.email}")
            return False, (
                "WhatsApp n'est pas connecté. "
                "Ouvrez Paramètres et reconnectez WhatsApp (scan QR)."
            )

        ok, err = _ensure_whatsapp_service(user)
        if not ok:
            return False, err

        port = get_whatsapp_port(user.id)
        url = f"http://localhost:{port}/send_message"
        payload = {
            "to": contact_info,
            "text": text
        }
        try:
            logger.info(f"Envoi du message WhatsApp via Baileys à {contact_info} (port {port})")
            res = requests.post(url, json=payload, timeout=20)
            if res.status_code == 200 and res.json().get("success"):
                logger.info(f"Message WhatsApp envoyé avec succès à {contact_info}")
                return True, None
            err_msg = _wa_error_payload(res)
            logger.error(f"Échec de l'envoi WhatsApp (Status {res.status_code}): {err_msg}")
            # One retry after force restart on connection errors
            if res.status_code in (500, 503) or 'connection' in str(err_msg).lower():
                start_ok, start_err = _ensure_whatsapp_service(user)
                if start_ok:
                    res2 = requests.post(url, json=payload, timeout=20)
                    if res2.status_code == 200 and res2.json().get("success"):
                        return True, None
                    err_msg = _wa_error_payload(res2)
            return False, str(err_msg) or "Échec de l'envoi WhatsApp."
        except Exception as e:
            logger.error(f"Erreur de connexion au service Baileys WhatsApp sur le port {port}: {e}")
            return False, (
                "Impossible de joindre le service WhatsApp. "
                "Reconnectez WhatsApp dans Paramètres."
            )

    @staticmethod
    def send_facebook(user, recipient_psid, text):
        ok, _ = MessagingService.send_facebook_detailed(user, recipient_psid, text)
        return ok

    @staticmethod
    def send_facebook_detailed(user, recipient_psid, text):
        """Returns (success: bool, error_message: str|None)."""
        config = FacebookConfig.objects.filter(user=user, is_connected=True).first()
        if not config or not config.page_access_token:
            logger.warning(f"Impossible d'envoyer : Facebook Page non connectée pour {user.email}")
            return False, "Page Facebook non connectée. Configurez-la dans Paramètres."

        try:
            resp = requests.post(
                f"https://graph.facebook.com/v18.0/{config.page_id}/messages",
                params={'access_token': config.page_access_token},
                json={
                    'recipient': {'id': recipient_psid},
                    'messaging_type': 'RESPONSE',
                    'message': {'text': text},
                },
                timeout=10
            )
            if resp.status_code == 200:
                logger.info(f"Message Facebook envoyé avec succès à PSID {recipient_psid}")
                return True, None
            err = resp.json().get('error', {})
            err_msg = err.get('message', 'Erreur inconnue')
            logger.error(f"Échec envoi Facebook (Status {resp.status_code}): {err_msg}")
            return False, (
                f"{err_msg} "
                "(Le contact doit avoir écrit à la Page dans les 24h — règle Meta.)"
            )
        except Exception as e:
            logger.error(f"Erreur de connexion à Graph API Facebook: {e}")
            return False, str(e)

    @staticmethod
    def send_message(user, contact_info, text, source):
        if source == 'whatsapp':
            return MessagingService.send_whatsapp(user, contact_info, text)
        elif source == 'email':
            from .email_service import send_email_reply, EmailConfig
            email_config = EmailConfig.objects.filter(user=user, is_active=True).first()
            if not email_config:
                logger.warning(f"Aucune configuration email active pour {user.email}")
                return False
            return send_email_reply(email_config, contact_info, "Message de Magia", text)
        elif source == 'facebook':
            return MessagingService.send_facebook(user, contact_info, text)
        elif source == 'linkedin':
            logger.warning(
                "Envoi LinkedIn indisponible (canal retiré). Destinataire: %s",
                contact_info,
            )
            return False
        else:
            logger.error(f"Source de messagerie inconnue ou non supportée : {source}")
            return False
