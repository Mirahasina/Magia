import imaplib
import smtplib
import email
import time
import base64
import requests
import os
import logging
from email.mime.text import MIMEText
from email.header import decode_header
from email.utils import parsedate_to_datetime
from datetime import datetime, timedelta, timezone
from .llm_service import get_llm_response, classify_pertinence
from .models import EmailConfig, ChatMessage, Agent

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

def get_google_auth_string(user, token):
    return f"user={user}\x01auth=Bearer {token}\x01\x01"

def refresh_google_token(config):
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    
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
            return

        mail = imaplib.IMAP4_SSL(config.imap_server or "imap.gmail.com")
        
        if config.oauth_token:
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
        else:
            mail.login(config.email, config.password)
            
        mail.select("inbox")
        logger.info(f"Recherche d'emails non lus pour l'agent {agent.name}...")

        status, messages = mail.search(None, 'UNSEEN')
        if status != 'OK' or not messages[0]:
            logger.info("Aucun nouvel email non lu trouvé.")
            return

        logger.info(f"{len(messages[0].split())} email(s) non lu(s) trouvé(s).")

        msg_ids = messages[0].split()
        msg_ids = list(reversed(msg_ids)) 

        processed_count = 0
        for num in msg_ids:
            if processed_count >= 10:
                break
                
            status, data = mail.fetch(num, '(BODY.PEEK[HEADER.FIELDS (DATE FROM SUBJECT)])')
            if status != 'OK' or not data[0]:
                continue

            msg_header = email.message_from_bytes(data[0][1])
            date_header = msg_header.get('Date')
            
            if date_header:
                try:
                    msg_date = parsedate_to_datetime(date_header)
                    now = datetime.now(timezone.utc)
                    if msg_date.tzinfo is None:
                        msg_date = msg_date.replace(tzinfo=timezone.utc)
                    
                    if now - msg_date > timedelta(hours=24):
                        logger.info(f"Email ignoré: trop ancien ({msg_date})")
                        continue
                except Exception as e:
                    logger.error(f"Erreur lors du parsing de la date: {str(e)}")
                    continue
            
            status, data = mail.fetch(num, '(BODY.PEEK[])')
            if status != 'OK':
                logger.error(f"Erreur lors de la récupération du corps du mail {num}")
                continue

            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)
            subject = decode_mime_words(msg['Subject'])
            sender = decode_mime_words(msg['From'])
            
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        body = part.get_payload(decode=True).decode('utf-8', errors='replace')
                        break
            else:
                body = msg.get_payload(decode=True).decode('utf-8', errors='replace')

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
                user_message=classification_prompt
            )
            logger.info(f"Classification Email pour '{subject}': {is_relevant}")

            if "épuisé mon quota" in is_relevant.lower():
                logger.warning("Quota LLM épuisé lors de la classification")
                continue

            if 'OUI' not in is_relevant.upper():
                logger.info(f"Email de {sender} ignoré (non pertinent)")
                mail.store(num, '+FLAGS', '\\Seen')
                continue

            kbs = agent.knowledge_bases.all()
            kb_text = "\n\n".join([kb.raw_content for kb in kbs if kb.raw_content])
            
            context = f"Base de connaissances :\n{kb_text if kb_text.strip() else '[Aucun document fourni]'}\n\nEmail reçu de : {sender}\nSujet : {subject}"
            
            response_prompt = f"""
            Réponds à cet email de manière professionnelle et concise en utilisant la base de connaissances.
            
            Si c'est une salutation, réponds chaleureusement.
            Si c'est un message de remerciement, réponds de façon courtoise et très professionnelle (par exemple, en restant à disposition).
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
                user_message=response_prompt
            )
            logger.info(f"Réponse générée (50 cars): {response_text[:50]}...")

            if "épuisé mon quota" in response_text.lower():
                logger.warning("Quota LLM épuisé lors de la génération de réponse")
                continue

            if "[UNKNOWN]" in response_text:
                logger.info("Réponse [UNKNOWN] détectée, utilisation du fallback")
                response_text = "Merci de votre intérêt. Je n'ai pas la réponse précise à votre question pour le moment, mais un responsable commercial va prendre contact avec vous très rapidement. Vous pouvez aussi nous joindre par téléphone au +261 34 00 000 00."

            # Classify status (pertinence)
            status = classify_pertinence(agent.role, body)

            ChatMessage.objects.create(agent=agent, sender='user', content=body, contact_info=sender, source='email', status=status)
            ChatMessage.objects.create(agent=agent, sender=agent.name, content=response_text, contact_info=sender, source='email', status='new')

            success = send_email_reply(config, sender, f"Re: {subject}", response_text)
            if success:
                logger.info(f"Réponse envoyée avec succès à {sender}")
                mail.store(num, '+FLAGS', '\\Seen')
            else:
                logger.error(f"ÉCHEC de l'envoi de la réponse à {sender}")
            
            processed_count += 1

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
        
        if config.oauth_token:
            auth_str = get_google_auth_string(config.email, config.oauth_token)
            auth_b64 = base64.b64encode(auth_str.encode()).decode()
            code, resp = server.docmd('AUTH', 'XOAUTH2 ' + auth_b64)
            
            if code != 235:
                # Tentative de rafraîchissement
                token = refresh_google_token(config)
                if token:
                    auth_str = get_google_auth_string(config.email, token)
                    auth_b64 = base64.b64encode(auth_str.encode()).decode()
                    code, resp = server.docmd('AUTH', 'XOAUTH2 ' + auth_b64)
                    if code != 235:
                        return False
                else:
                    return False
            
        else:
            if not config.password:
                return False
            server.login(config.email, config.password)
            
        server.send_message(msg)
        server.quit()
        return True
    except Exception:
        return False

def test_email_connection(config):
    results = {}
    try:
        mail = imaplib.IMAP4_SSL(config.imap_server or "imap.gmail.com")
        if config.oauth_token:
            auth_string = get_google_auth_string(config.email, config.oauth_token)
            mail.authenticate('XOAUTH2', lambda x: auth_string)
        else:
            mail.login(config.email, config.password)
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
        if config.oauth_token:
            auth_str = get_google_auth_string(config.email, config.oauth_token)
            server.docmd('AUTH', 'XOAUTH2 ' + base64.b64encode(auth_str.encode()).decode())
        else:
            server.login(config.email, config.password)
        server.send_message(msg)
        server.quit()
        results['smtp'] = {'status': 'success'}
    except Exception as e:
        results['smtp'] = {'status': 'error', 'message': str(e)}
    return results

def send_email_via_config(config, recipient, subject, body):
    """Alias for send_email_reply compatible with views.py"""
    return send_email_reply(config, recipient, subject, body)
