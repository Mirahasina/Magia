import requests
import logging
import os
from django.utils import timezone
import environ

logger = logging.getLogger(__name__)
env = environ.Env()

class UnipileService:
    def __init__(self):
        self.api_key = env('UNIPILE_API_KEY', default='')
        self.dsn = env('UNIPILE_DSN', default='https://api1.unipile.com')
        self.headers = {
            'X-API-KEY': self.api_key,
            'accept': 'application/json'
        }

    def get_connection_url(self, user_id, config_id):
        url = f"{self.dsn}/api/v1/accounts/hosted_session"
        payload = {
            "type": "LINKEDIN",
            "name": f"LinkedIn_{user_id}_{config_id}",
            "success_url": "http://localhost:3000/parametres?status=success",
            "failure_url": "http://localhost:3000/parametres?status=failure"
        }
        try:
            res = requests.post(url, headers=self.headers, json=payload)
            if res.status_code == 201:
                return res.json().get('url')
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

def sync_linkedin_inbox(config):
    if not config.unipile_account_id or not config.is_messaging_active:
        return
    
    service = UnipileService()
    chats = service.fetch_chats(config.unipile_account_id)
    
    from .models import ChatMessage, Contact, Agent
    
    for chat in chats:
        chat_id = chat.get('id')
        last_message = chat.get('last_message')
        if not last_message: continue
        
        pass

    config.last_sync_at = timezone.now()
    config.save()
