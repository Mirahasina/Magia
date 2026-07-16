import imaplib
import smtplib
import email
import base64
import requests
import os
import logging
from email.mime.text import MIMEText
from email.header import decode_header
from email.utils import parsedate_to_datetime
from datetime import datetime, timedelta, timezone
from .llm_service import get_llm_response, classify_pertinence
from .models import ChatMessage, Agent
from .prospection_service import mark_prospect_replied, schedule_followup_after_ai

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, 'agent.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def decode_mime_words(s):
    if not s:
        return ""
    parts = decode_header(s)
    decoded_parts = []
    for part, encoding in parts:
        if isinstance(part, bytes):
            decoded_parts.append(part.decode(encoding or 'utf-8', errors='replace'))
        else:
            decoded_parts.append(part)
    return "".join(decoded_parts)


def normalize_email_address(raw: str) -> str:
    from email.utils import parseaddr
    _name, addr = parseaddr(raw or "")
    addr = (addr or raw or "").strip().lower()
    return addr


def display_name_from_header(raw: str) -> str:
    from email.utils import parseaddr
    name, addr = parseaddr(raw or "")
    return (name or addr or raw or "").strip()


def extract_email_body(msg):
    """
    Extracts the body of an email message, prioritizing HTML if available.
    More robust version to handle deep nested parts and prevent empty overwrites.
    """
    body_text = None
    body_html = None
    
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))

            if "attachment" in content_disposition:
                continue

            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    decoded = payload.decode('utf-8', errors='replace').strip()
                    if decoded and (not body_text or len(decoded) > len(body_text or "")):
                        body_text = decoded
            elif content_type == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    decoded = payload.decode('utf-8', errors='replace').strip()
                    if decoded and (not body_html or len(decoded) > len(body_html or "")):
                        body_html = decoded
    else:
        content_type = msg.get_content_type()
        payload = msg.get_payload(decode=True)
        if payload:
            decoded = payload.decode('utf-8', errors='replace').strip()
            if content_type == "text/html":
                body_html = decoded
            else:
                body_text = decoded

    if body_html is not None and len(body_html) > 50:
        return body_html
    body = body_html if body_html else (body_text if body_text else "")
    if body:
        return body
    # Keep attachment-only / empty-body mails visible in the inbox
    subject = decode_mime_words(msg.get('Subject'))
    if subject:
        return f"[Sans corps de message] {subject}"
    return "[Message sans contenu texte]"

def get_google_auth_string(user, token):
    return f"user={user}\x01auth=Bearer {token}\x01\x01"

def refresh_google_token(config):
    client_id = (os.getenv('GOOGLE_CLIENT_ID') or '').strip().strip('"').strip("'")
    client_secret = (os.getenv('GOOGLE_CLIENT_SECRET') or '').strip().strip('"').strip("'")

    if not config.refresh_token:
        return None
        
    response = requests.post('https://oauth2.googleapis.com/token', data={
        'client_id': client_id,
        'client_secret': client_secret,
        'refresh_token': config.refresh_token,
        'grant_type': 'refresh_token'
    })
    
    if response.status_code == 200:
        new_tokens = response.json()
        config.oauth_token = new_tokens['access_token']
        config.save()
        return config.oauth_token
    return None

def process_emails_for_agent(agent_id):
    try:
        agent = Agent.objects.get(id=agent_id)
        config = agent.email_config
        
        if not config or not config.is_active or not config.email:
            logger.debug(f"Configuration email absente ou inactive pour l'agent {agent.name}.")
            return

        mail = imaplib.IMAP4_SSL(config.imap_server or "imap.gmail.com")
        
        if not config.oauth_token and not config.refresh_token:
            logger.warning(
                "Email %s: SMTP/mot de passe interdit - Google OAuth requis.",
                config.email,
            )
            return

        try:
            auth_string = get_google_auth_string(config.email, config.oauth_token)
            mail.authenticate('XOAUTH2', lambda x: auth_string)
        except imaplib.IMAP4.error:
            token = refresh_google_token(config)
            if token:
                auth_string = get_google_auth_string(config.email, token)
                mail.authenticate('XOAUTH2', lambda x: auth_string)
            else:
                raise

        mail.select("inbox")
        logger.info(f"Recherche d'emails pour l'agent {agent.name} (Canal Email actif)...")

        status, messages = mail.search(None, 'ALL')
        if status != 'OK' or not messages[0]:
            logger.info("Aucun email trouvé dans la boîte de réception.")
            return

        all_msg_ids = messages[0].split()
        logger.info(f"Total de {len(all_msg_ids)} emails trouvés. Analyse des 50 plus récents...")

        msg_ids = list(reversed(all_msg_ids))[:50] 

        ai_processed_count = 0
        new_clones_count = 0
        
        for num in msg_ids:
            status, data = mail.fetch(num, '(BODY.PEEK[HEADER.FIELDS (DATE FROM SUBJECT)])')
            if status != 'OK' or not data[0]:
                continue

            msg_header = email.message_from_bytes(data[0][1])
            date_header = msg_header.get('Date')
            
            is_recent = True
            if date_header:
                try:
                    msg_date = parsedate_to_datetime(date_header)
                    now = datetime.now(timezone.utc)
                    if msg_date.tzinfo is None:
                        msg_date = msg_date.replace(tzinfo=timezone.utc)
                    
                    if now - msg_date > timedelta(days=2):
                        is_recent = False
                except Exception as e:
                    logger.error(f"Erreur lors du parsing de la date: {str(e)}")
            
            status, data = mail.fetch(num, '(FLAGS BODY.PEEK[])')
            if status != 'OK':
                logger.error(f"Erreur lors de la récupération du corps du mail {num}")
                continue

            flags = b''
            raw_email = b''
            if len(data) > 0 and isinstance(data[0], tuple):
                flags = data[0][0]
                raw_email = data[0][1]

            msg = email.message_from_bytes(raw_email)
            is_read = b'\\Seen' in flags
            subject = decode_mime_words(msg['Subject'])
            sender = decode_mime_words(msg['From'])
            
            body = extract_email_body(msg)

            # Duplicate check
            exists = ChatMessage.objects.filter(
                user=config.user,
                content=body,
                contact_info=sender,
                source='email'
            ).exists()
            
            if exists:
                continue

            # Save the email so the user can manually reply if needed
            chat_msg = ChatMessage.objects.create(
                user=config.user,
                agent=agent,
                sender='user',
                content=body,
                contact_info=sender,
                source='email',
                is_read=is_read,
                status='new' if is_recent else 'archived',
                email_config=config
            )
            if is_recent:
                mark_prospect_replied(config.user, sender, 'email')

            # AI processing is only for recent emails, limited to 10 per run
            if not is_recent or ai_processed_count >= 10:
                continue

            ai_processed_count += 1
            logger.info(f"Nouvel email de {sender} détecté : '{subject}'. Analyse en cours...")

            classification_prompt = f"""
            Analyse cet email et dis si ce message mérite une réponse de l'agent.
            
            Répond OUI si le message est :
            - Une salutation / bonjour / bonsoir
            - Une demande d'information sur des produits ou services
            - Une question sur les tarifs ou l'offre
            - Une demande de contact ou de rappel
            - Un message de remerciement ou de gratitude
            - Toute autre forme d'intérêt commercial ou de prospection
            
            Répond NON si le message est clairement hors-sujet, spam, ou n'attend pas de réponse.
            
            Sujet : "{subject}"
            Message : "{body}"
            
            Répond UNIQUEMENT par 'OUI' ou 'NON'. Aucune explication.
            """
            
            is_relevant = get_llm_response(
                agent_name=agent.name,
                agent_role="Analyseur de leads",
                system_prompt="Tu es un expert en qualification de leads. Tu dois dire si un message mérite une réponse commerciale ou de politesse.",
                knowledge_context="",
                user_message=classification_prompt,
                model_name=agent.llm_model
            )
            logger.info(f"Classification Email pour '{subject}': {is_relevant}")

            if "épuisé mon quota" in is_relevant.lower():
                logger.warning("Quota LLM épuisé lors de la classification")
                continue

            if 'OUI' not in is_relevant.upper():
                logger.info(f"Email de {sender} ignoré (non pertinent)")
                chat_msg.status = 'new' # Leave as new for manual processing
                chat_msg.save()
                mail.store(num, '+FLAGS', '\\Seen')
                continue

            kbs = agent.knowledge_bases.all()
            kb_text = "\n\n".join([kb.raw_content for kb in kbs if kb.raw_content])
            
            context = f"Base de connaissances :\n{kb_text if kb_text.strip() else '[Aucun document fourni]'}\n\nEmail reçu de : {sender}\nSujet : {subject}"
            
            response_prompt = f"""
            Réponds à cet email de manière professionnelle et concise en utilisant la base de connaissances.
            
            Si c'est une salutation, réponds chaleureusement.
            Si c'est un message de remerciement, réponds de façon courtoise et très professionnelle.
            Si c'est une question commerciale, utilise les informations fournies.
            Si tu ne connais pas la réponse précise, réponds EXACTEMENT "[UNKNOWN]".
            
            Sujet : "{subject}"
            Contenu de l'email :\n{body}
            """

            response_text = get_llm_response(
                agent_name=agent.name,
                agent_role=agent.role,
                system_prompt=agent.system_prompt,
                knowledge_context=context,
                user_message=response_prompt,
                model_name=agent.llm_model
            )
            logger.info(f"Réponse générée (50 cars): {response_text[:50]}...")

            if "épuisé mon quota" in response_text.lower():
                logger.warning("Quota LLM épuisé lors de la génération de réponse")
                continue

            if "[UNKNOWN]" in response_text:
                logger.info("Réponse [UNKNOWN] détectée, utilisation du fallback")
                response_text = "Merci de votre intérêt. Je n'ai pas la réponse précise à votre question pour le moment, mais un responsable commercial va prendre contact avec vous très rapidement."

            status_val = classify_pertinence(agent.role, body)
            if "épuisé mon quota" in status_val.lower():
                status_val = "new_lead"

            # Update the original message status
            chat_msg.status = status_val
            chat_msg.save()

            # Create the AI's reply message
            ChatMessage.objects.create(agent=agent, sender=agent.name, content=response_text, contact_info=sender, source='email', status='new')
            new_clones_count += 1

            success = send_email_reply(config, sender, f"Re: {subject}", response_text)
            if success:
                logger.info(f"Réponse envoyée avec succès à {sender}")
                schedule_followup_after_ai(config.user, sender, 'email', analyze=True)
                mail.store(num, '+FLAGS', '\\Seen')
            else:
                logger.error(f"ÉCHEC de l'envoi de la réponse à {sender}")

        logger.info(f"Traitement terminé pour {agent.name}. {new_clones_count} nouveaux messages clonés.")
        mail.logout()
    except Exception as e:
        logger.error(f"Erreur globale process_emails_for_agent: {str(e)}", exc_info=True)

def send_email_reply(config, recipient, subject, body):
    try:
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = config.email
        msg['To'] = recipient

        server = smtplib.SMTP_SSL(config.smtp_server or "smtp.gmail.com", 465, timeout=10)
        server.ehlo()
        
        if not config.oauth_token and not config.refresh_token:
            logger.warning("Envoi email refusé: Google OAuth requis (SMTP password désactivé).")
            return False

        auth_str = get_google_auth_string(config.email, config.oauth_token)
        auth_b64 = base64.b64encode(auth_str.encode()).decode()
        code, resp = server.docmd('AUTH', 'XOAUTH2 ' + auth_b64)

        if code != 235:
            token = refresh_google_token(config)
            if token:
                auth_str = get_google_auth_string(config.email, token)
                auth_b64 = base64.b64encode(auth_str.encode()).decode()
                code, resp = server.docmd('AUTH', 'XOAUTH2 ' + auth_b64)
                if code != 235:
                    return False
            else:
                return False

        server.send_message(msg)
        server.quit()
        return True
    except Exception:
        return False

def get_sent_folder_name(mail):
    """
    Tente de trouver le nom du dossier des messages envoyés sur le serveur IMAP.
    """
    try:
        status, folders = mail.list()
        if status != 'OK':
            return None
        
        sent_keywords = ['sent', 'envoyé', 'envoyes', 'outbox']
        
        for folder_raw in folders:
            folder_str = folder_raw.decode('utf-8', errors='replace').lower()
            if any(keyword in folder_str for keyword in sent_keywords):
                import re
                match = re.search(r'"([^"]+)"\s*$', folder_str)
                if match:
                    return match.group(1)
                match = re.search(r'([^\s/]+)\s*$', folder_str)
                if match:
                    return match.group(1)
        
        # Fallback pour Gmail et standard
        status, data = mail.select('"[Gmail]/Messages envoy&AOk-s"') 
        if status == 'OK': return '"[Gmail]/Messages envoy&AOk-s"'
        
        status, data = mail.select('"[Gmail]/Sent Mail"') 
        if status == 'OK': return '"[Gmail]/Sent Mail"'

        status, data = mail.select("Sent")
        if status == 'OK': return "Sent"

        status, data = mail.select("Sent Messages")
        if status == 'OK': return "Sent Messages"
        
    except Exception:
        pass
    return None

def sync_email_history(config, max_messages_per_folder: int = 2500):
    """
    Import IMAP history into ChatMessage for the inbox.
    Returns a stats dict: {imported, skipped, folders, error}.
    Does not create CRM Contact rows (prospection is intentional only).
    """
    stats = {'imported': 0, 'skipped': 0, 'folders': [], 'error': None}
    try:
        if not config or not config.email:
            stats['error'] = 'Configuration email inactive ou incomplete.'
            return stats

        # Prefer a fresh OAuth token before long IMAP sync
        if config.refresh_token:
            refresh_google_token(config)
            config.refresh_from_db()

        if not config.oauth_token and not config.refresh_token:
            stats['error'] = 'Google OAuth requis (SMTP / mot de passe désactivé).'
            return stats

        mail = imaplib.IMAP4_SSL(config.imap_server or "imap.gmail.com")
        try:
            auth_string = get_google_auth_string(config.email, config.oauth_token)
            mail.authenticate('XOAUTH2', lambda x: auth_string)
        except imaplib.IMAP4.error:
            token = refresh_google_token(config)
            if token:
                auth_string = get_google_auth_string(config.email, token)
                mail.authenticate('XOAUTH2', lambda x: auth_string)
            else:
                stats['error'] = 'Token Google expiré - reconnectez Gmail.'
                return stats

        folders_to_sync = ["INBOX"]
        sent_folder = get_sent_folder_name(mail)
        if sent_folder:
            folders_to_sync.append(sent_folder)

        my_email = (config.email or '').lower()

        for folder in folders_to_sync:
            try:
                select_arg = folder if '"' in folder else f'"{folder}"'
                status, data = mail.select(select_arg, readonly=True)
                if status != 'OK':
                    logger.warning('Cannot select folder %s: %s', folder, data)
                    continue

                status, messages = mail.search(None, 'ALL')
                if status != 'OK' or not messages[0]:
                    continue

                all_msg_ids = messages[0].split()
                # Most recent first, capped for performance
                msg_ids = list(reversed(all_msg_ids))[:max_messages_per_folder]
                stats['folders'].append({'folder': folder, 'candidates': len(msg_ids)})

                for num in msg_ids:
                    try:
                        status, data = mail.fetch(num, '(FLAGS BODY.PEEK[])')
                        if status != 'OK':
                            continue

                        flags = b''
                        raw_email = b''
                        if len(data) > 0 and isinstance(data[0], tuple):
                            flags = data[0][0]
                            raw_email = data[0][1]

                        msg = email.message_from_bytes(raw_email)
                        is_read = b'\\Seen' in flags
                        sender_raw = decode_mime_words(msg['From'])
                        to_raw = decode_mime_words(msg['To'])
                        message_id = (msg.get('Message-ID') or '').strip()

                        sender_addr = normalize_email_address(sender_raw)
                        is_sent_by_me = bool(my_email and my_email in sender_addr)

                        if is_sent_by_me:
                            contact_info = normalize_email_address(to_raw)
                            contact_name = display_name_from_header(to_raw)
                        else:
                            contact_info = sender_addr
                            contact_name = display_name_from_header(sender_raw)

                        if not contact_info:
                            stats['skipped'] += 1
                            continue

                        body = extract_email_body(msg)

                        # Dedup by Message-ID when available, else content+contact
                        if message_id and ChatMessage.objects.filter(
                            user=config.user, source='email', whatsapp_message_id=message_id
                        ).exists():
                            stats['skipped'] += 1
                            continue
                        if not message_id and ChatMessage.objects.filter(
                            user=config.user, content=body, contact_info=contact_info, source='email'
                        ).exists():
                            stats['skipped'] += 1
                            continue

                        agent = Agent.objects.filter(email_config=config).first()

                        ChatMessage.objects.create(
                            user=config.user,
                            agent=agent,
                            sender='ai' if is_sent_by_me else 'user',
                            content=body,
                            contact_info=contact_info,
                            contact_name=contact_name or contact_info,
                            source='email',
                            is_read=is_read,
                            status='archived',
                            email_config=config,
                            whatsapp_message_id=message_id or None,
                        )
                        # Do not auto-create CRM prospects from mailbox history -
                        # inbox shows ChatMessage threads; CRM is for intentional prospection.
                        stats['imported'] += 1
                    except Exception as e:
                        logger.error(f"Erreur sync email individuel ({folder}): {e}")
                        stats['skipped'] += 1
            except Exception as e:
                logger.error(f"Erreur dossier {folder}: {e}")

        mail.logout()
        logger.info(
            'Email sync done for %s: imported=%s skipped=%s folders=%s',
            config.email, stats['imported'], stats['skipped'], stats['folders'],
        )
    except Exception as e:
        logger.error(f"Erreur globale sync_email_history: {e}")
        stats['error'] = str(e)
    return stats


def test_email_connection(config):
    """Google OAuth only - password/SMTP login is disabled."""
    if not config.oauth_token and not config.refresh_token:
        return {
            'imap': {'status': 'error', 'message': 'Google OAuth requis'},
            'smtp': {'status': 'error', 'message': 'SMTP password désactivé'},
        }
    results = {}
    try:
        mail = imaplib.IMAP4_SSL(config.imap_server or "imap.gmail.com")
        auth_string = get_google_auth_string(config.email, config.oauth_token)
        mail.authenticate('XOAUTH2', lambda x: auth_string)
        mail.logout()
        results['imap'] = {'status': 'success'}
    except Exception as e:
        results['imap'] = {'status': 'error', 'message': str(e)}

    try:
        msg = MIMEText("Ceci est un test de connexion pour MAGIA AI.")
        msg['Subject'] = "Test de connexion MAGIA"
        msg['From'] = config.email
        msg['To'] = config.email

        server = smtplib.SMTP_SSL(config.smtp_server or "smtp.gmail.com", 465)
        auth_str = get_google_auth_string(config.email, config.oauth_token)
        server.docmd('AUTH', 'XOAUTH2 ' + base64.b64encode(auth_str.encode()).decode())
        server.send_message(msg)
        server.quit()
        results['smtp'] = {'status': 'success'}
    except Exception as e:
        results['smtp'] = {'status': 'error', 'message': str(e)}
    return results

def send_email_via_config(config, recipient, subject, body):
    return send_email_reply(config, recipient, subject, body)
