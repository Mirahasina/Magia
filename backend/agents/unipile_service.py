import requests
import logging
import os
from django.utils import timezone
import environ
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
env = environ.Env()

class UnipileService:
    def __init__(self):
        # Try different ways to get the key
        self.api_key = env('UNIPILE_API_KEY', default='')
        if not self.api_key:
            self.api_key = os.getenv('UNIPILE_API_KEY', '')
            
        if not self.api_key:
            from pathlib import Path
            base_dir = Path(__file__).resolve().parent.parent
            env_file = os.path.join(base_dir, '.env')
            if os.path.exists(env_file):
                with open(env_file, 'r') as f:
                    for line in f:
                        if line.startswith('UNIPILE_API_KEY='):
                            self.api_key = line.split('=', 1)[1].strip()
                            break

        self.dsn = env('UNIPILE_DSN', default='')
        if not self.dsn:
            self.dsn = os.getenv('UNIPILE_DSN', 'https://api1.unipile.com')

        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'X-API-KEY': self.api_key,
            'accept': 'application/json'
        }
        
        if self.api_key:
            logger.info(f"UnipileService initialized. Key starts with: {self.api_key[:4]}... Length: {len(self.api_key)}")
        else:
            logger.error("UnipileService initialized WITHOUT API KEY! Checked env, os.environ and .env file.")

    def fetch_accounts(self):
        url = f"{self.dsn}/api/v1/accounts"
        try:
            res = requests.get(url, headers=self.headers)
            if res.status_code == 200:
                return res.json().get('items', [])
            return []
        except Exception as e:
            logger.error(f"Unipile fetch_accounts failed: {e}")
            return []

    def get_connection_url(self, provider, user_id, config_id):
        """
        Generates a hosted account connection URL.
        provider: 'LINKEDIN', 'WHATSAPP', 'FACEBOOK', 'GMAIL', 'OUTLOOK', etc.
        """
        if not self.api_key:
            logger.error("UNIPILE_API_KEY is missing in .env")
            return None

        url = f"{self.dsn}/api/v1/hosted/accounts/link"
        
        expires_on = (datetime.utcnow() + timedelta(days=1)).strftime('%Y-%m-%dT%H:%M:%S.000Z')
        
        provider_map = {
            'linkedin': 'LINKEDIN',
            'whatsapp': 'WHATSAPP',
            'facebook': 'MESSENGER',
            'email': 'MAIL',
            'gmail': 'GOOGLE',
            'outlook': 'OUTLOOK'
        }
        
        target_provider = provider_map.get(provider.lower(), provider.upper())
        
        payload = {
            "type": "create",
            "providers": [target_provider],
            "api_url": self.dsn,
            "expiresOn": expires_on,
            "name": f"{target_provider}_{user_id}_{config_id}",
            "success_redirect_url": f"http://localhost:5173/dashboard?view=settings&tab={provider.lower()}&status=success&id={config_id}",
            "failure_redirect_url": f"http://localhost:5173/dashboard?view=settings&tab={provider.lower()}&status=failure&id={config_id}"
        }
        try:
            res = requests.post(url, headers=self.headers, json=payload)
            if res.status_code == 201:
                return res.json().get('url')
            
            logger.error(f"Unipile hosted_session failed (Status {res.status_code}): {res.text}")
            return None
        except Exception as e:
            logger.error(f"Unipile get_connection_url failed: {e}")
            return None

    def fetch_chats(self, account_id):
        url = f"{self.dsn}/api/v1/chats?account_id={account_id}"
        try:
            res = requests.get(url, headers=self.headers)
            if res.status_code == 200:
                return res.json().get('items', [])
            return []
        except Exception as e:
            logger.error(f"Unipile fetch_chats failed: {e}")
            return []

    def send_message(self, chat_id, text):
        url = f"{self.dsn}/api/v1/chats/{chat_id}/messages"
        payload = {"text": text}
        try:
            res = requests.post(url, headers=self.headers, json=payload)
            return res.status_code == 201
        except Exception as e:
            logger.error(f"Unipile send_message failed: {e}")
            return False

    def search_people(self, account_id, query):
        url = f"{self.dsn}/api/v1/linkedin/search/people"
        params = {
            "account_id": account_id,
            "q": query,
            "count": 10
        }
        try:
            res = requests.get(url, headers=self.headers, params=params)
            if res.status_code == 200:
                return res.json().get('items', [])
            return []
        except Exception as e:
            logger.error(f"Unipile LinkedIn search failed: {e}")
            return []

    def send_invitation(self, account_id, profile_id, message=None):
        url = f"{self.dsn}/api/v1/linkedin/invitations"
        payload = {
            "account_id": account_id,
            "provider_id": profile_id,
            "message": message
        }
        try:
            res = requests.post(url, headers=self.headers, json=payload)
            return res.status_code == 201
        except Exception as e:
            logger.error(f"Unipile LinkedIn invitation failed: {e}")
            return False

    def fetch_messages(self, chat_id, limit=50):
        url = f"{self.dsn}/api/v1/chats/{chat_id}/messages?limit={limit}"
        try:
            res = requests.get(url, headers=self.headers)
            if res.status_code == 200:
                return res.json().get('items', [])
            return []
        except Exception as e:
            logger.error(f"Unipile fetch_messages failed: {e}")
            return []

def sync_unipile_inbox(config, provider='linkedin'):
    """
    Generic sync for Unipile inbox.
    """
    if not config.unipile_account_id:
        return
    
    # Optional: check if messaging is active (for LinkedIn/Facebook)
    if hasattr(config, 'is_messaging_active') and not config.is_messaging_active:
        return
    
    service = UnipileService()
    chats = service.fetch_chats(config.unipile_account_id)
    
    from .models import ChatMessage, Contact
    from django.utils.dateparse import parse_datetime
    
    for chat in chats:
        chat_id = chat.get('id')
        if not chat_id:
            continue
        
        chat_name = chat.get('name') or chat.get('id')
        
        # Get or create contact
        contact, created = Contact.objects.get_or_create(
            user=config.user,
            source=provider,
            contact_info=chat_id,
            defaults={
                'name': chat_name,
                'status': 'new',
            }
        )
        
        # Fetch latest messages for this chat
        messages = service.fetch_messages(chat_id)
        for message in messages:
            msg_id = message.get('id')
            if not msg_id:
                continue
            
            # Check if already exists
            if ChatMessage.objects.filter(user=config.user, source=provider, whatsapp_message_id=msg_id).exists():
                continue
            
            # Parse text/body
            text = message.get('text') or message.get('body') or ""
            
            # Parse timestamp
            timestamp_str = message.get('timestamp') or message.get('created_at')
            if timestamp_str:
                try:
                    created_at = parse_datetime(timestamp_str) or timezone.now()
                except Exception:
                    created_at = timezone.now()
            else:
                created_at = timezone.now()
            
            # Create message
            ChatMessage.objects.create(
                user=config.user,
                sender='ai' if message.get('from_me') else 'user',
                contact_info=chat_id,
                contact_name=chat_name,
                source=provider,
                content=text,
                whatsapp_message_id=msg_id,
                is_read=True,
                created_at=created_at
            )
            
        # Update last_message_at
        latest_msg = ChatMessage.objects.filter(user=config.user, contact_info=chat_id, source=provider).order_by('-created_at').first()
        if latest_msg:
            contact.last_message_at = latest_msg.created_at
            contact.save()

    if hasattr(config, 'last_sync_at'):
        config.last_sync_at = timezone.now()
        config.save()

def sync_linkedin_inbox(config):
    return sync_unipile_inbox(config, provider='linkedin')
