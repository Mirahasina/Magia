import logging
import requests
from django.conf import settings
from .models import WhatsAppConfig

logger = logging.getLogger(__name__)

def get_whatsapp_port(user_id):
    if user_id == 'global':
        return 3001
    uid_str = str(user_id)
    return 3001 + (sum(ord(c) for c in uid_str) % 100)

class MessagingService:
    @staticmethod
    def send_whatsapp(user, contact_info, text):
        """
        Envoie un message WhatsApp via le service Baileys local exécuté sur sa propre adresse de port.
        """
        config = WhatsAppConfig.objects.filter(user=user).first()
        if not config or not config.is_connected:
            logger.warning(f"Impossible d'envoyer le message : WhatsApp non connecté pour {user.email}")
            return False

        port = get_whatsapp_port(user.id)
        url = f"http://localhost:{port}/send_message"
        payload = {
            "to": contact_info,
            "text": text
        }
        try:
            logger.info(f"Envoi du message WhatsApp via Baileys à {contact_info} (port {port})")
            res = requests.post(url, json=payload, timeout=10)
            if res.status_code == 200 and res.json().get("success"):
                logger.info(f"Message WhatsApp envoyé avec succès à {contact_info}")
                return True
            logger.error(f"Échec de l'envoi WhatsApp (Status {res.status_code}): {res.text}")
            return False
        except Exception as e:
            logger.error(f"Erreur de connexion au service Baileys WhatsApp sur le port {port}: {e}")
            return False

    @staticmethod
    def send_message(user, contact_info, text, source):
        """
        Envoie un message générique basé sur la source (whatsapp, email, linkedin, facebook).
        """
        if source == 'whatsapp':
            return MessagingService.send_whatsapp(user, contact_info, text)
        elif source == 'email':
            from .email_service import send_email_reply, EmailConfig
            email_config = EmailConfig.objects.filter(user=user).first()
            if not email_config:
                logger.warning(f"Aucune configuration email active pour {user.email}")
                return False
            return send_email_reply(email_config, contact_info, "Message de Magia", text)
        elif source == 'linkedin':
            logger.warning(f"L'envoi automatique LinkedIn n'est plus supporté après la suppression d'Unipile. Destinataire: {contact_info}")
            return False
        elif source == 'facebook':
            logger.warning(f"L'envoi automatique Facebook n'est plus supporté après la suppression d'Unipile. Destinataire: {contact_info}")
            return False
        else:
            logger.error(f"Source de messagerie inconnue ou non supportée : {source}")
            return False
