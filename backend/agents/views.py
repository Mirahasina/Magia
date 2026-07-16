from .messaging_service import MessagingService
import logging
import os
import re
import datetime
import json
import threading
import time
import traceback
import urllib.parse

import requests
from google import genai
import environ

logger = logging.getLogger(__name__)
import pandas as pd
import PyPDF2
import docx
from accounts.models import User, PLAN_LIMITS, WorkspaceMember
from django.utils import timezone
from rest_framework import viewsets, status, parsers, permissions
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from odf.opendocument import load as odf_load
from odf.text import P
from odf import teletype
from pptx import Presentation
from .models import (
    Agent, KnowledgeBase, Template, WhatsAppConfig, ChatMessage, EmailConfig, LinkedInConfig, FacebookConfig, AgentTeam, AgentLink, ContactAssignment, AuditLog, Contact
)
from .serializers import (
    AgentSerializer, KnowledgeBaseSerializer, TemplateSerializer, 
    WhatsAppConfigSerializer, ChatMessageSerializer, EmailConfigSerializer,
    AgentFeedbackSerializer, AgentTeamSerializer, AgentLinkSerializer,
    ContactAssignmentSerializer, AuditLogSerializer, LinkedInConfigSerializer,
    FacebookConfigSerializer
)
from .llm_service import get_llm_response, classify_pertinence, DEFAULT_GEMINI_MODELS
from .email_service import (
    process_emails_for_agent, test_email_connection, sync_email_history, send_email_reply
)
from django.db.models import Q, Count, Max as MaxAgg
from django.db.models.functions import TruncDay
from rest_framework.exceptions import PermissionDenied
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .rag_service import add_texts_to_knowledge_base, search_knowledge_base, search_agent_and_team_knowledge_base
from .prospection_service import (
    mark_prospect_replied,
    schedule_followup_after_ai,
    infer_channels_for_team_agent,
    attach_user_channel_configs,
    build_handoff_intro,
)



env = environ.Env()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))



def get_whatsapp_port(user_id):
    if user_id == 'global':
        return 3001
    uid_str = str(user_id)
    return 3001 + (sum(ord(c) for c in uid_str) % 100)

def check_ai_quota(user):
    plan = 'gratuit'
    if hasattr(user, 'subscription'):
        plan = user.subscription.plan_name
    
    if plan == 'entreprise':
        return True, None
        
    limit = 50 if plan == 'gratuit' else 1000
    last_24h = timezone.now() - datetime.timedelta(hours=24)
    count = ChatMessage.objects.filter(user=user, sender='ai', created_at__gt=last_24h).count()
    
    if count >= limit:
        return False, f"Quota journalier atteint pour le plan {plan} ({limit} messages). Veuillez passer au plan supérieur."
    return True, None


def _extract_text(file_obj) -> str:
    filename = file_obj.name.lower()
    if filename.endswith('.txt'):
        return file_obj.read().decode('utf-8')
    if filename.endswith('.pdf'):
        reader = PyPDF2.PdfReader(file_obj)
        return ''.join(
            (page.extract_text() or '') + '\n'
            for page in reader.pages
        )
    if filename.endswith('.docx'):
        doc = docx.Document(file_obj)
        return '\n'.join(para.text for para in doc.paragraphs)
    if filename.endswith(('.xlsx', '.xls')):
        return pd.read_excel(file_obj).to_string()
    if filename.endswith('.pptx'):
        prs = Presentation(file_obj)
        return '\n'.join(
            getattr(shape, 'text', '')
            for slide in prs.slides
            for shape in slide.shapes
            if getattr(shape, 'text', None) is not None
        )
    if filename.endswith(('.odt', '.ods', '.odp')):
        doc = odf_load(file_obj)
        paragraphs = doc.text.getElementsByType(P)
        return '\n'.join(teletype.extractText(p) for p in paragraphs)
    return ''

class WhatsAppConfigViewSet(viewsets.ModelViewSet):
    serializer_class = WhatsAppConfigSerializer

    def get_queryset(self):
        return WhatsAppConfig.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def get_connection_url(self, request, pk=None):
        config = self.get_object()
        if config.is_connected:
            return Response({"status": "connected", "phone_number": config.phone_number})
        if config.qr_code:
            return Response({"qr_code": config.qr_code})
        return Response({"status": "generating_qr", "message": "Le code QR est en cours de génération par le service WhatsApp local. Veuillez rafraîchir dans quelques secondes."})

    @action(detail=True, methods=['get'])
    def refresh_connection(self, request, pk=None):
        config = self.get_object()
        return Response({
            "status": "connected" if config.is_connected else "not_connected",
            "is_connected": config.is_connected,
            "phone_number": config.phone_number,
            "qr_code": config.qr_code
        })

    @action(detail=True, methods=['post'])
    def sync_messages(self, request, pk=None):
        return Response({"status": "Synchronisation en temps réel via le service local active."})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def update_qr(self, request):
        user_id = request.data.get('user_id')
        qr_code = request.data.get('qr_code')
        if not user_id or user_id == 'global':
            return Response({'error': 'User ID required'}, status=400)
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        
        config, created = WhatsAppConfig.objects.get_or_create(user=user)
        config.qr_code = qr_code
        config.is_connected = False
        config.save()
        return Response({'status': 'updated'})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def set_connected(self, request):
        user_id = request.data.get('user_id')
        phone_number = request.data.get('phone_number')
        if not user_id or user_id == 'global':
            return Response({'error': 'User ID required'}, status=400)
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        
        config, created = WhatsAppConfig.objects.get_or_create(user=user)
        config.is_connected = True
        config.phone_number = phone_number
        config.qr_code = None
        config.save()
        return Response({'status': 'connected'})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def set_disconnected(self, request):
        user_id = request.data.get('user_id')
        if not user_id or user_id == 'global':
            return Response({'error': 'User ID required'}, status=400)
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        
        config, created = WhatsAppConfig.objects.get_or_create(user=user)
        config.is_connected = False
        config.qr_code = None
        config.save()
        return Response({'status': 'disconnected'})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def sync_whatsapp_contacts(self, request):
        user_id = request.data.get('user_id')
        contacts = request.data.get('contacts', [])
        if not user_id or user_id == 'global':
            return Response({'error': 'User ID required'}, status=400)
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        
        synced_count = 0
        for c in contacts:
            contact_info = c.get('id')
            if not contact_info:
                continue
            name = c.get('name') or c.get('notify') or c.get('verifiedName') or contact_info.split('@')[0]
            contact, created = Contact.objects.get_or_create(
                user=user,
                source='whatsapp',
                contact_info=contact_info,
                defaults={'name': name, 'status': 'new'}
            )
            if not created and name and contact.name != name:
                contact.name = name
                contact.save()
            synced_count += 1
            
        return Response({'status': 'success', 'synced': synced_count})

    def perform_destroy(self, instance):
        ChatMessage.objects.filter(user=instance.user, source='whatsapp').delete()
        Contact.objects.filter(user=instance.user, source='whatsapp').delete()
        super().perform_destroy(instance)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def whatsapp_gateway(self, request):
        user_id = request.data.get('user_id')
        message = request.data.get('message', '').strip()
        wa_id = request.data.get('message_id', '')
        wa_sender = request.data.get('sender', '')
        push_name = request.data.get('push_name')
        is_historical = request.data.get('is_historical', False)
        is_me = request.data.get('is_me', False)
        
        if not user_id or user_id == 'global':
            return Response({'error': 'User ID required'}, status=400)
            
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        if wa_id and ChatMessage.objects.filter(user=user, whatsapp_message_id=wa_id).exists():
            return Response({'status': 'ignored', 'reason': 'duplicate'})

        assignment = ContactAssignment.objects.filter(user=user, contact_info=wa_sender).first()
        effective_agent = None
        if assignment:
            effective_agent = assignment.agent
        else:
            active_agents = Agent.objects.filter(user=user, is_active=True)
            for agent in active_agents:
                if agent.channels and any(str(c).lower() == 'whatsapp' for c in agent.channels):
                    effective_agent = agent
                    break
            if not effective_agent:
                effective_agent = active_agents.first()

        ChatMessage.objects.create(
            user=user,
            agent=effective_agent,
            sender='ai' if is_me else 'user',
            content=message,
            contact_info=wa_sender,
            contact_name=push_name,
            source='whatsapp',
            whatsapp_message_id=wa_id,
            is_read=bool(is_historical),
            status='archived' if is_historical else 'new'
        )

        if not is_historical and message:
            if is_me:
                schedule_followup_after_ai(user, wa_sender, 'whatsapp', analyze=False)
            else:
                mark_prospect_replied(user, wa_sender, 'whatsapp')

        return Response({'status': 'received'})


    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def whatsapp_gateway_bulk(self, request):
        user_id = request.data.get('user_id')
        messages = request.data.get('messages', [])
        
        if not user_id or user_id == 'global':
            return Response({'error': 'User ID required'}, status=400)
            
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        existing_ids = set(ChatMessage.objects.filter(user=user, source='whatsapp').values_list('whatsapp_message_id', flat=True))
        
        new_messages = []
        contacts_to_update = {}
        
        for msg_data in messages:
            wa_id = msg_data.get('message_id', '')
            if not wa_id or wa_id in existing_ids:
                continue
                
            wa_sender = msg_data.get('sender', '')
            push_name = msg_data.get('push_name')
            is_me = msg_data.get('is_me', False)
            content = msg_data.get('message', '').strip()
            
            if not content: continue
            
            new_messages.append(ChatMessage(
                user=user,
                sender='ai' if is_me else 'user',
                content=content,
                contact_info=wa_sender,
                contact_name=push_name,
                source='whatsapp',
                whatsapp_message_id=wa_id,
                is_read=True,
                status='archived'
            ))
            
            if wa_sender not in contacts_to_update or push_name:
                contacts_to_update[wa_sender] = push_name
        
        if new_messages:
            ChatMessage.objects.bulk_create(new_messages, ignore_conflicts=True)
            
            for sender, name in contacts_to_update.items():
                contact, _ = Contact.objects.get_or_create(user=user, source='whatsapp', contact_info=sender)
                if name: 
                    contact.name = name
                    contact.save()

        return Response({'status': 'success', 'processed': len(new_messages)})


class EmailConfigViewSet(viewsets.ModelViewSet):
    serializer_class = EmailConfigSerializer

    def get_queryset(self):
        return EmailConfig.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """Allow updating imap_server, smtp_server, email, password."""
        instance = serializer.save()
        # Save password separately (not in serializer for security, sent via PATCH)
        password = self.request.data.get('password')
        if password:
            instance.password = password
            instance.save(update_fields=['password'])

    @action(detail=True, methods=['get'])
    def get_connection_url(self, request, pk=None):
        return Response({"error": "Veuillez configurer directement votre serveur SMTP/IMAP dans les champs de saisie (pas d'URL de connexion nécessaire)."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test IMAP + SMTP connectivity with current config."""
        config = self.get_object()
        # Allow overriding password inline (not persisted)
        password_override = request.data.get('password')
        if password_override:
            config.password = password_override
        results = test_email_connection(config)
        imap_ok = results.get('imap', {}).get('status') == 'success'
        smtp_ok = results.get('smtp', {}).get('status') == 'success'
        return Response({
            'imap': results.get('imap', {}),
            'smtp': results.get('smtp', {}),
            'success': imap_ok and smtp_ok
        })

    @action(detail=True, methods=['post'])
    def configure(self, request, pk=None):
        """Save IMAP/SMTP config and activate the account."""
        config = self.get_object()
        config.email = request.data.get('email', config.email)
        config.imap_server = request.data.get('imap_server', config.imap_server)
        config.smtp_server = request.data.get('smtp_server', config.smtp_server)
        password = request.data.get('password')
        if password:
            config.password = password
        config.is_active = True
        config.save()
        # Kick off history sync in background
        thread = threading.Thread(target=sync_email_history, args=(config,))
        thread.daemon = True
        thread.start()
        return Response({'status': 'configured', 'email': config.email, 'is_active': True})

    @action(detail=True, methods=['post'])
    def sync_messages(self, request, pk=None):
        config = self.get_object()
        thread = threading.Thread(target=sync_email_history, args=(config,))
        thread.daemon = True
        thread.start()
        return Response({"status": "Synchronisation Email démarrée"})

    def perform_destroy(self, instance):
        ChatMessage.objects.filter(email_config=instance).delete()
        super().perform_destroy(instance)

class FacebookConfigViewSet(viewsets.ModelViewSet):
    serializer_class = FacebookConfigSerializer

    def get_queryset(self):
        return FacebookConfig.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def get_connection_url(self, request, pk=None):
        fb_app_id = env('FACEBOOK_APP_ID', default='')
        if not fb_app_id:
            return Response({"error": "FACEBOOK_APP_ID n'est pas configuré dans le fichier .env du backend."}, status=status.HTTP_400_BAD_REQUEST)
        
        redirect_uri = request.query_params.get('redirect_uri')
        if not redirect_uri:
            return Response({"error": "redirect_uri est requis."}, status=status.HTTP_400_BAD_REQUEST)
        
        params = {
            'client_id': fb_app_id,
            'redirect_uri': redirect_uri,
            'scope': 'pages_messaging,pages_show_list,pages_read_engagement',
            'state': str(pk)
        }
        url = f"https://www.facebook.com/v18.0/dialog/oauth?{urllib.parse.urlencode(params)}"
        return Response({"url": url})

    @action(detail=True, methods=['post'])
    def exchange_code(self, request, pk=None):
        """Exchange auth code for long-lived user access token and list available Pages."""
        code = request.data.get('code')
        redirect_uri = request.data.get('redirect_uri')
        if not code or not redirect_uri:
            return Response({"error": "code et redirect_uri sont requis."}, status=status.HTTP_400_BAD_REQUEST)
        
        fb_app_id = env('FACEBOOK_APP_ID', default='')
        fb_app_secret = env('FACEBOOK_APP_SECRET', default='')
        if not fb_app_id or not fb_app_secret:
            return Response({"error": "FACEBOOK_APP_ID ou FACEBOOK_APP_SECRET non configuré."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 1. Exchange code for short-lived user access token
        try:
            resp = requests.get(
                "https://graph.facebook.com/v18.0/oauth/access_token",
                params={
                    'client_id': fb_app_id,
                    'redirect_uri': redirect_uri,
                    'client_secret': fb_app_secret,
                    'code': code
                },
                timeout=10
            )
            if resp.status_code != 200:
                err = resp.json().get('error', {}).get('message', 'Impossible d\'échanger le code.')
                return Response({"error": f"Erreur Facebook : {err}"}, status=status.HTTP_400_BAD_REQUEST)
            
            user_token = resp.json().get('access_token')
        except Exception as e:
            return Response({"error": f"Impossible de contacter Facebook : {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # 2. Exchange short-lived user access token for a long-lived user access token
        try:
            resp = requests.get(
                "https://graph.facebook.com/v18.0/oauth/access_token",
                params={
                    'grant_type': 'fb_exchange_token',
                    'client_id': fb_app_id,
                    'client_secret': fb_app_secret,
                    'fb_exchange_token': user_token
                },
                timeout=10
            )
            if resp.status_code == 200:
                user_token = resp.json().get('access_token', user_token)
        except Exception:
            pass
        
        # 3. Retrieve list of pages managed by this user
        try:
            resp = requests.get(
                "https://graph.facebook.com/v18.0/me/accounts",
                params={
                    'access_token': user_token,
                    'fields': 'id,name,access_token'
                },
                timeout=10
            )
            if resp.status_code != 200:
                err = resp.json().get('error', {}).get('message', 'Impossible de récupérer la liste des pages.')
                return Response({"error": f"Erreur Facebook Pages : {err}"}, status=status.HTTP_400_BAD_REQUEST)
            
            pages_data = resp.json().get('data', [])
            pages = []
            for p in pages_data:
                pages.append({
                    'id': p.get('id'),
                    'name': p.get('name'),
                    'access_token': p.get('access_token')
                })
            
            return Response({"pages": pages})
        except Exception as e:
            return Response({"error": f"Erreur de communication Pages : {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def refresh_connection(self, request, pk=None):
        config = self.get_object()
        if config.is_connected and config.page_access_token:
            # Verify token is still valid via Graph API
            try:
                resp = requests.get(
                    f"https://graph.facebook.com/v18.0/{config.page_id}",
                    params={'access_token': config.page_access_token, 'fields': 'id,name'},
                    timeout=5
                )
                if resp.status_code == 200:
                    data = resp.json()
                    config.page_name = data.get('name', config.page_name)
                    config.save(update_fields=['page_name'])
                    return Response({'status': 'connected', 'page_name': config.page_name})
            except Exception:
                pass
            config.is_connected = False
            config.save(update_fields=['is_connected'])
        return Response({'status': 'disconnected', 'message': 'Token invalide ou expiré.'})

    @action(detail=True, methods=['post'])
    def configure(self, request, pk=None):
        """Save Page ID + Page Access Token and verify via Graph API."""
        config = self.get_object()
        page_id = request.data.get('page_id', '').strip()
        page_access_token = request.data.get('page_access_token', '').strip()

        if not page_id or not page_access_token:
            return Response({'error': 'page_id et page_access_token sont requis.'}, status=400)

        # Verify token against Graph API
        try:
            resp = requests.get(
                f"https://graph.facebook.com/v18.0/{page_id}",
                params={'access_token': page_access_token, 'fields': 'id,name'},
                timeout=10
            )
            if resp.status_code != 200:
                err = resp.json().get('error', {}).get('message', 'Token invalide.')
                return Response({'error': f'Échec vérification Graph API : {err}'}, status=400)
            page_data = resp.json()
        except Exception as e:
            return Response({'error': f'Impossible de joindre Facebook : {str(e)}'}, status=500)

        config.page_id = page_id
        config.page_access_token = page_access_token
        config.page_name = page_data.get('name', '')
        config.is_connected = True
        config.save()
        return Response({
            'status': 'connected',
            'page_name': config.page_name,
            'page_id': config.page_id
        })

    @action(detail=True, methods=['post'])
    def send_facebook_message(self, request, pk=None):
        """Send a message to a Facebook user via Graph API (Page Messaging)."""
        config = self.get_object()
        if not config.is_connected:
            return Response({'error': 'Page Facebook non connectée.'}, status=400)
        recipient_id = request.data.get('recipient_psid')
        text = request.data.get('text', '')
        if not recipient_id or not text:
            return Response({'error': 'recipient_psid et text requis.'}, status=400)
        try:
            resp = requests.post(
                f"https://graph.facebook.com/v18.0/{config.page_id}/messages",
                params={'access_token': config.page_access_token},
                json={'recipient': {'id': recipient_id}, 'message': {'text': text}},
                timeout=10
            )
            if resp.status_code == 200:
                return Response({'status': 'sent'})
            return Response({'error': resp.json().get('error', {}).get('message', 'Erreur envoi.')}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['get', 'post'], permission_classes=[AllowAny], authentication_classes=[])
    def webhook(self, request):
        """Facebook Messenger webhook: GET for verification, POST for incoming messages."""
        VERIFY_TOKEN = env('FACEBOOK_VERIFY_TOKEN', default='magia_fb_webhook_2024')

        if request.method == 'GET':
            mode = request.query_params.get('hub.mode')
            token = request.query_params.get('hub.verify_token')
            challenge = request.query_params.get('hub.challenge')
            if mode == 'subscribe' and token == VERIFY_TOKEN:
                from django.http import HttpResponse
                return HttpResponse(challenge, content_type='text/plain')
            return Response({'error': 'Forbidden'}, status=403)

        # POST: incoming message event
        body = request.data
        if body.get('object') != 'page':
            return Response({'status': 'ignored'})

        for entry in body.get('entry', []):
            page_id = entry.get('id', '')
            config = FacebookConfig.objects.filter(page_id=page_id, is_connected=True).first()
            if not config:
                continue
            user = config.user
            for messaging in entry.get('messaging', []):
                sender_id = messaging.get('sender', {}).get('id', '')
                msg = messaging.get('message', {})
                text = msg.get('text', '').strip()
                if not text or sender_id == page_id:
                    continue  # skip echoes
                # Dedup
                msg_id = msg.get('mid', '')
                if msg_id and ChatMessage.objects.filter(user=user, whatsapp_message_id=msg_id).exists():
                    continue
                # Find active agent with facebook channel
                active_agents = Agent.objects.filter(user=user, is_active=True)
                agent = None
                for a in active_agents:
                    if a.channels and any(str(c).lower() == 'facebook' for c in a.channels):
                        agent = a
                        break
                if not agent:
                    agent = active_agents.first()

                ChatMessage.objects.create(
                    user=user,
                    agent=agent,
                    sender='user',
                    content=text,
                    contact_info=sender_id,
                    source='facebook',
                    whatsapp_message_id=msg_id,
                    status='new'
                )
                # Update/create contact
                Contact.objects.get_or_create(
                    user=user, source='facebook', contact_info=sender_id,
                    defaults={'name': sender_id, 'status': 'new'}
                )

        return Response({'status': 'EVENT_RECEIVED'})

    @action(detail=True, methods=['post'])
    def sync_messages(self, request, pk=None):
        config = self.get_object()
        if not config.is_connected or not config.page_access_token:
            return Response({'status': 'Facebook non connecté'})
        # Poll recent conversations via Graph API
        try:
            resp = requests.get(
                f"https://graph.facebook.com/v18.0/{config.page_id}/conversations",
                params={'access_token': config.page_access_token, 'fields': 'participants,messages{message,from,created_time,id}'},
                timeout=15
            )
            if resp.status_code != 200:
                return Response({'error': 'Erreur Graph API'}, status=400)
            data = resp.json()
            synced = 0
            user = request.user
            for conv in data.get('data', []):
                for msg_data in conv.get('messages', {}).get('data', []):
                    mid = msg_data.get('id', '')
                    text = msg_data.get('message', '').strip()
                    sender_info = msg_data.get('from', {})
                    sender_id = sender_info.get('id', '')
                    is_me = sender_id == config.page_id
                    if not text:
                        continue
                    if ChatMessage.objects.filter(user=user, whatsapp_message_id=mid).exists():
                        continue
                    ChatMessage.objects.create(
                        user=user,
                        sender='ai' if is_me else 'user',
                        content=text,
                        contact_info=sender_id,
                        source='facebook',
                        whatsapp_message_id=mid,
                        is_read=True,
                        status='archived'
                    )
                    synced += 1
            return Response({'status': 'synced', 'count': synced})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def perform_destroy(self, instance):
        ChatMessage.objects.filter(user=instance.user, source='facebook').delete()
        Contact.objects.filter(user=instance.user, source='facebook').delete()
        super().perform_destroy(instance)

class AgentTeamViewSet(viewsets.ModelViewSet):
    serializer_class = AgentTeamSerializer
    def get_queryset(self):
        return AgentTeam.objects.filter(user=self.request.user)
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        AuditLog.objects.create(
            user=self.request.user,
            action="Création d'équipe",
            details=f"Équipe '{serializer.validated_data['name']}' créée."
        )

    @action(detail=False, methods=['post'])
    def deploy_plan(self, request):
        plan = request.data.get('plan')
        if not plan:
            return Response({'error': 'Plan manquant.'}, status=400)
            
        team = AgentTeam.objects.create(
            user=request.user,
            name=plan['name'],
            description=plan['description'],
            color=plan.get('color', '#1e3a8a')
        )
        
        agents_created = []
        for agent_def in plan['agents']:
            channels = agent_def.get('channels') or infer_channels_for_team_agent(
                agent_def.get('name', ''),
                agent_def.get('role', ''),
                agent_def.get('system_prompt', ''),
            )
            agent = Agent.objects.create(
                user=request.user,
                team=team,
                name=agent_def['name'],
                role=agent_def['role'],
                system_prompt=agent_def['system_prompt'],
                is_team_agent=True,
                is_deployed=True,
                llm_model='gemini-2.0-flash',
                execution_mode='auto',
                channels=channels,
            )
            attach_user_channel_configs(agent, request.user)
            agents_created.append(agent)
            
        for link_def in plan.get('links', []):
            try:
                AgentLink.objects.create(
                    user=request.user,
                    source_agent=agents_created[link_def['from']],
                    target_agent=agents_created[link_def['to']],
                    trigger_type=link_def['trigger'],
                    description=link_def.get('description', '')
                )
            except Exception:
                pass
                
        AuditLog.objects.create(
            user=request.user,
            action="Déploiement d'équipe",
            details=f"Équipe '{team.name}' déployée avec {len(agents_created)} agents."
        )
        
        return Response({'id': team.id, 'status': 'deployed'})

    @action(detail=False, methods=['post'], url_path='design_team')
    def design_team(self, request):
        """
        AI-powered conversational team builder.
        Receives { history: [{role, content}], message: str }
        Returns { reply: str, ready: bool, plan: {...} | null }
        """

        history = request.data.get('history', [])
        user_message = request.data.get('message', '').strip()

        if not user_message:
            return Response({'error': 'Message requis.'}, status=400)

        SYSTEM = """Tu es MAGIA AI, l'architecte expert des solutions d'ingénierie d'agents.
Ton rôle est de concevoir l'équipe de l'utilisateur le plus RAPIDEMENT possible via des choix multiples (QCM).

INSTRUCTIONS DE TON ET STYLE :
- Ton Corporate, Expert et Ultra-Précis.
- NE JAMAIS utiliser de gras (pas de **).
- Réponses épurées.
- Chaque réponse doit être un JSON valide.

STRUCTURE DE RÉPONSE OBLIGATOIRE (JSON) :
{
  "reply": "Ton message court (sans gras)",
  "options": ["Choix 1", "Choix 2", "Choix 3"], 
  "allow_multiple": false,
  "ready": false,
  "plan": null
}

Si plusieurs choix sont possibles, mets "allow_multiple": true.

Si l'équipe est prête :
{
  "reply": "L'équipe est prête.",
  "options": [],
  "ready": true,
  "plan": {
    "name": "Nom prestigieux",
    "description": "Objectif",
    "color": "#1e3a8a",
    "agents": [
      {"name": "Nom Agent", "role": "Expertise", "system_prompt": "Instructions pro sans gras", "channels": ["chat", "whatsapp", "email"]}
    ],
    "links": [
      {"from": 0, "to": 1, "trigger": "interest", "description": "Trigger"}
    ]
  }
}

Triggers : interest, email_requested, whatsapp_requested, manual.
Pour chaque agent, inclus "channels" parmi chat, whatsapp, email selon son rôle."""

        conversation_text = f"SYSTEM: {SYSTEM}\n\n"
        for msg in history[-10:]:
            role = "Utilisateur" if msg.get('role') == 'user' else "MAGIA AI"
            conversation_text += f"{role}: {msg.get('content', '')}\n"
        conversation_text += f"Utilisateur: {user_message}\nMAGIA AI:"

        try:
            api_key = env('GEMINI_API_KEY', default=None)
            if not api_key:
                return Response({'error': 'Clé Gemini manquante dans le fichier .env.'}, status=500)

            client = genai.Client(api_key=api_key)
            
            models_to_try = DEFAULT_GEMINI_MODELS
            reply_text = "Désolé, je rencontre une difficulté."
            
            for m in models_to_try:
                try:
                    response = client.models.generate_content(model=m, contents=conversation_text)
                    reply_text = response.text.strip()
                    break
                except Exception as ex:
                    if m == models_to_try[-1]:
                        return Response({'error': f'Erreur AI : {str(ex)}'}, status=500)
                    continue

            try:
                json_match = re.search(r'(\{.*\})', reply_text, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group(1))
                    return Response({
                        'reply': data.get('reply', 'Plan conçu.'),
                        'options': data.get('options', []),
                        'ready': data.get('ready', False),
                        'plan': data.get('plan'),
                    })
            except Exception:  
                pass

            return Response({'reply': reply_text, 'options': [], 'ready': False, 'plan': None})

        except Exception as exc:
            logger.error('design_team error: %s\n%s', exc, traceback.format_exc())
            return Response({'error': f'Erreur AI : {exc}'}, status=500)

    @action(detail=True, methods=['post'], url_path='upload_knowledge', parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def upload_knowledge(self, request, pk=None):
        team = self.get_object()
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=400)
            
        name = request.data.get('name', getattr(file_obj, 'name', 'Document'))
        
        apply_to_all = request.data.get('apply_to_all_agents', 'false').lower() == 'true'
        agent_ids_str = request.data.get('agent_ids', '')
        
        selected_agent_ids = []
        if apply_to_all:
            selected_agent_ids = list(team.members.values_list('id', flat=True))
        elif agent_ids_str:
            selected_agent_ids = [aid.strip() for aid in agent_ids_str.split(',') if aid.strip()]
            
        try:
            file_binary = file_obj.read()
            file_extension = os.path.splitext(file_obj.name)[1].lower()
            file_obj.seek(0)
            extracted_text = _extract_text(file_obj)
            
            kb_team = KnowledgeBase.objects.create(
                name=name,
                team=team,
                source_type=request.data.get('source_type', 'file'),
                file_binary=file_binary,
                file_extension=file_extension
            )
            
            if extracted_text:
                add_texts_to_knowledge_base(team_id=team.id, raw_text=extracted_text, source_name=kb_team.name)
                
            kbs_created = [{'type': 'team', 'id': kb_team.id}]
            
            for agent_id in selected_agent_ids:
                try:
                    agent = team.members.get(id=agent_id)
                    kb_agent = KnowledgeBase.objects.create(
                        name=name,
                        agent=agent,
                        source_type=request.data.get('source_type', 'file'),
                        file_binary=file_binary,
                        file_extension=file_extension
                    )
                    if extracted_text:
                        add_texts_to_knowledge_base(agent_id=agent.id, raw_text=extracted_text, source_name=kb_agent.name)
                    kbs_created.append({'type': 'agent', 'agent_id': agent.id, 'id': kb_agent.id})
                except Exception:
                    pass
                    
            return Response({'status': 'uploaded', 'results': kbs_created})
        except Exception as exc:
            return Response({'error': str(exc)}, status=400)

class AgentLinkViewSet(viewsets.ModelViewSet):
    serializer_class = AgentLinkSerializer
    def get_queryset(self):
        return AgentLink.objects.filter(user=self.request.user)
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class LinkedInConfigViewSet(viewsets.ModelViewSet):
    serializer_class = LinkedInConfigSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LinkedInConfig.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def refresh_connection(self, request, pk=None):
        return Response({
            "status": "unavailable",
            "message": "LinkedIn n'est plus disponible. Utilisez WhatsApp ou Email.",
        })

    @action(detail=True, methods=['post'])
    def sync_messages(self, request, pk=None):
        return Response({
            "status": "unavailable",
            "message": "LinkedIn n'est plus disponible. Utilisez WhatsApp ou Email.",
        })

    @action(detail=True, methods=['get'])
    def get_connection_url(self, request, pk=None):
        return Response({
            "error": "LinkedIn n'est plus disponible. Utilisez WhatsApp ou Email."
        }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def prospect(self, request, pk=None):
        return Response({
            "error": "LinkedIn n'est plus disponible. Utilisez WhatsApp ou Email."
        }, status=status.HTTP_400_BAD_REQUEST)

    def create(self, request, *args, **kwargs):
        return Response({
            "error": "LinkedIn n'est plus disponible. Utilisez WhatsApp ou Email."
        }, status=status.HTTP_400_BAD_REQUEST)

class ContactAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = ContactAssignmentSerializer
    def get_queryset(self):
        return ContactAssignment.objects.filter(user=self.request.user)

class ContactViewSet(viewsets.ModelViewSet):
    from .serializers import ContactSerializer
    serializer_class = ContactSerializer

    def get_queryset(self):
        return Contact.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        source = serializer.validated_data.get('source', '')
        if source in ('linkedin', 'facebook'):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'source': (
                    f"Le canal {source} n'est plus disponible. "
                    "Utilisez whatsapp ou email."
                )
            })
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def run_followups(self, request):
        """Manual trigger for follow-up batch (also run by the background scheduler)."""
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command('run_followups', stdout=out)
        return Response({'status': 'ok', 'output': out.getvalue()})

    @action(detail=False, methods=['post'], parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def import_contacts(self, request):
        """
        Import contacts from a CSV or Excel file.
        Expected columns: name, contact_info, source (whatsapp/email), notes (optional), status (optional)
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'Aucun fichier fourni.'}, status=400)

        filename = file_obj.name.lower()
        try:
            if filename.endswith('.csv'):
                df = pd.read_csv(file_obj, dtype=str)
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_obj, dtype=str)
            else:
                return Response({'error': 'Format non supporté. Utilisez .csv, .xlsx ou .xls'}, status=400)
        except Exception as exc:
            return Response({'error': f'Erreur de lecture du fichier : {str(exc)}'}, status=400)

        # Normalize column names
        df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]

        # Check required columns
        if 'contact_info' not in df.columns:
            return Response({
                'error': 'Colonne "contact_info" manquante.',
                'columns_found': list(df.columns),
                'hint': 'Colonnes attendues : name, contact_info, source, notes'
            }, status=400)

        created_count = 0
        skipped_count = 0
        errors = []
        valid_statuses = {'new', 'contacted', 'interested', 'ready', 'no'}
        # LinkedIn / Facebook outreach are retired; keep values for legacy imports but prefer WA/Email
        valid_sources = {'whatsapp', 'email', 'facebook', 'linkedin', 'chat'}

        for idx, row in df.iterrows():
            contact_info = str(row.get('contact_info', '')).strip()
            if not contact_info or contact_info == 'nan':
                skipped_count += 1
                continue

            name = str(row.get('name', contact_info)).strip()
            if name == 'nan':
                name = contact_info

            source = str(row.get('source', 'whatsapp')).strip().lower()
            if source in ('linkedin', 'facebook'):
                errors.append(
                    f"Ligne {idx + 2}: canal {source} indisponible — contact importé en 'whatsapp'."
                )
                source = 'whatsapp'
            elif source not in valid_sources:
                source = 'whatsapp'

            notes = str(row.get('notes', '')).strip()
            if notes == 'nan':
                notes = ''

            row_status = str(row.get('status', 'new')).strip().lower()
            if row_status not in valid_statuses:
                row_status = 'new'

            try:
                contact, created = Contact.objects.get_or_create(
                    user=request.user,
                    source=source,
                    contact_info=contact_info,
                    defaults={
                        'name': name,
                        'notes': notes,
                        'status': row_status,
                    }
                )
                if created:
                    created_count += 1
                else:
                    skipped_count += 1
            except Exception as exc:
                errors.append({'row': idx + 2, 'contact_info': contact_info, 'error': str(exc)})

        return Response({
            'status': 'done',
            'created': created_count,
            'skipped': skipped_count,
            'errors': errors,
            'total_rows': len(df)
        })

    @action(detail=True, methods=['post'], url_path='contact_via_agent')
    def contact_via_agent(self, request, pk=None):
        """
        Confie ce prospect à un Agent IA qui génère et envoie un premier message
        via WhatsApp ou Email selon le canal du contact.
        """
        contact = self.get_object()
        agent_id = request.data.get('agent_id')

        if not agent_id:
            return Response({'error': 'agent_id requis.'}, status=400)

        try:
            agent = Agent.objects.get(id=agent_id, user=request.user)
        except Agent.DoesNotExist:
            return Response({'error': 'Agent introuvable.'}, status=404)

        source = contact.source
        contact_info = contact.contact_info
        contact_name = contact.name or contact_info
        notes = contact.notes or ''

        intro_prompt = (
            f"Tu dois écrire un premier message de prise de contact à destination de {contact_name}. "
            f"Tes notes sur ce prospect : {notes if notes else 'Aucune note spécifique.'}. "
            f"Ce message doit être court, chaleureux, professionnel et adapté à ton rôle. "
            f"N'utilise pas de gras ni de formatage spécial. Écris uniquement le message."
        )

        try:
            response_text = get_llm_response(
                agent_name=agent.name,
                agent_role=agent.role,
                system_prompt=agent.system_prompt,
                knowledge_context='',
                user_message=intro_prompt,
                model_name=agent.llm_model,
            )
        except Exception as exc:
            logger.error('contact_via_agent LLM error: %s', exc)
            response_text = f"Bonjour {contact_name}, je suis {agent.name}. Je serais ravi d'échanger avec vous."

        if source in ['facebook', 'linkedin']:
            return Response({
                'error': (
                    f"Le canal {source} n'est plus disponible. "
                    "Utilisez WhatsApp ou Email pour contacter ce prospect."
                )
            }, status=400)

        sent = MessagingService.send_message(request.user, contact_info, response_text, source)

        if not sent:
            return Response({'error': f'Échec de l\'envoi via {source}'}, status=500)

        ChatMessage.objects.create(
            user=request.user,
            agent=agent,
            sender='ai',
            content=response_text,
            contact_info=contact_info,
            contact_name=contact_name,
            source=source,
            status='new',
        )

        ContactAssignment.objects.update_or_create(
            user=request.user,
            contact_info=contact_info,
            defaults={'agent': agent},
        )

        if contact.status == 'new':
            contact.status = 'contacted'
        contact.replied_since_last_ai = False
        contact.next_followup_date = timezone.now() + timezone.timedelta(hours=48)
        contact.save()

        return Response({
            'status': 'sent' if sent else 'logged_only',
            'message': response_text,
            'agent': agent.name,
            'source': source,
        })


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        return ChatMessage.objects.filter(user=self.request.user).order_by('-created_at')

class TemplateViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TemplateSerializer

    def get_queryset(self):
        return Template.objects.all()

class KnowledgeBaseViewSet(viewsets.ModelViewSet):
    serializer_class = KnowledgeBaseSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        user_agents = Agent.objects.filter(user=self.request.user).values_list('id', flat=True)
        user_teams = AgentTeam.objects.filter(user=self.request.user).values_list('id', flat=True)
        return KnowledgeBase.objects.filter(
            Q(agent_id__in=user_agents) | Q(team_id__in=user_teams)
        )

    def perform_create(self, serializer):
        file_obj = self.request.FILES.get('file')
        instance = serializer.save()

        if file_obj:
            try:
                instance.file_binary = file_obj.read()
                instance.file_extension = os.path.splitext(file_obj.name)[1].lower()
                file_obj.seek(0)

                extracted_text = _extract_text(file_obj)

                if extracted_text or instance.file_binary:
                    instance.save()
                    if extracted_text:
                        if instance.agent:
                            add_texts_to_knowledge_base(agent_id=instance.agent.id, raw_text=extracted_text, source_name=instance.name)
                        elif instance.team:
                            add_texts_to_knowledge_base(team_id=instance.team.id, raw_text=extracted_text, source_name=instance.name)
            except Exception:  # noqa: BLE001
                pass

@method_decorator(csrf_exempt, name='dispatch')
class AgentViewSet(viewsets.ModelViewSet):
    serializer_class = AgentSerializer


    def get_queryset(self):
        user = self.request.user
        owner_agents = Agent.objects.filter(user=user)
        workspaces_as_member = WorkspaceMember.objects.filter(member_user=user).values_list('workspace_owner', flat=True)
        member_agents = Agent.objects.filter(user__in=workspaces_as_member)
        
        return (owner_agents | member_agents).distinct()

    def check_permissions(self, request):
        super().check_permissions(request)
        if hasattr(self, 'detail') and self.detail:
            try:
                obj = self.get_object()
                self.check_workspace_role(request, obj)
            except Exception:
                pass

    def check_workspace_role(self, request, obj):
        if obj.user == request.user:
            return  
        try:
            member = WorkspaceMember.objects.get(workspace_owner=obj.user, member_user=request.user)
            if request.method not in permissions.SAFE_METHODS:
                if member.role != 'editor':
                    raise PermissionDenied("Accès refusé : vous n'avez pas les droits d'édition dans ce workspace.")
        except WorkspaceMember.DoesNotExist:
            raise PermissionDenied("Accès refusé : vous n'êtes pas membre de ce workspace.")

    def perform_create(self, serializer):
        user = self.request.user
        try:
            subscription = user.subscription
            plan = subscription.plan_name
            num_agents_choice = subscription.num_agents
        except Exception:
            plan = 'gratuit'
            num_agents_choice = 2
        
        limits = PLAN_LIMITS.get(plan, PLAN_LIMITS['gratuit'])
        
        if plan == 'pro':
            max_agents = num_agents_choice
        else:
            max_agents = limits['max_agents']
        
        if max_agents is not None:
            current_count = Agent.objects.filter(user=user).count()
            if current_count >= max_agents:
                raise PermissionDenied(
                    f"Limite atteinte : votre abonnement {plan} personnalisé permet {max_agents} agent(s) maximum. "
                    f"Veuillez passer au niveau supérieur pour créer davantage d'agents."
                )
        agent = serializer.save(user=self.request.user)
        if agent.is_team_agent:
            if not agent.channels:
                agent.channels = infer_channels_for_team_agent(
                    agent.name, agent.role, agent.system_prompt
                )
                agent.save(update_fields=['channels'])
            attach_user_channel_configs(agent, self.request.user)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        user = request.user
        agents = Agent.objects.filter(user=user)
        agent_ids = agents.values_list('id', flat=True)

        messages = ChatMessage.objects.filter(agent_id__in=agent_ids)
        human_conversations = messages.filter(sender='user').count()
        ai_responses = messages.filter(sender='ai').count()
        
        pertinent_escalations = messages.filter(status='pertinent').count()
        automation_rate = "100%"
        if human_conversations > 0:
            rate = max(0, 100 - (pertinent_escalations / human_conversations * 100))
            automation_rate = f"{int(rate)}%"

        total_minutes_saved = ai_responses * 5
        hours_saved = total_minutes_saved // 60
        time_saved_str = f"{hours_saved}h" if hours_saved > 0 else f"{total_minutes_saved}m"

        economy = hours_saved * 15
        active_agents_count = agents.filter(is_deployed=True).count()

        recent_msgs = messages.filter(sender='ai').select_related('agent').order_by('-created_at')[:5]
        
        now = timezone.now()
        recent_activities = []
        colors = ['bg-blue-500', 'bg-blue-400', 'bg-blue-600', 'bg-blue-900', 'bg-blue-300']
        
        for i, msg in enumerate(recent_msgs):
            diff = now - msg.created_at
            if diff.total_seconds() < 60:
                time_str = "À l'instant"
            elif diff.total_seconds() < 3600:
                time_str = f"{int(diff.total_seconds() // 60)}m"
            elif diff.total_seconds() < 86400:
                time_str = f"{int(diff.total_seconds() // 3600)}h"
            else:
                time_str = f"{int(diff.total_seconds() // 86400)}j"

            recent_activities.append({
                'user': msg.agent.name,
                'action': msg.content[:30] + '...' if len(msg.content) > 30 else msg.content,
                'color': colors[i % len(colors)],
                'time': time_str,
                'avatar': msg.agent.avatar if msg.agent.avatar else None
            })

        # Aggregation pour le graphique (derniers 7 jours)
        last_7_days_cutoff = timezone.now() - datetime.timedelta(days=7)
        daily_stats = (
            messages.filter(created_at__gte=last_7_days_cutoff)
            .annotate(day=TruncDay('created_at'))
            .values('day', 'sender')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        
        graph_dict = {}
        for i in range(7):
            d = (timezone.now() - datetime.timedelta(days=6-i)).date()
            graph_dict[d.isoformat()] = {
                "name": d.strftime('%d/%m'), 
                "conversations": 0, 
                "responses": 0
            }
            
        for entry in daily_stats:
            d_str = entry['day'].date().isoformat()
            if d_str in graph_dict:
                if entry['sender'] == 'user':
                    graph_dict[d_str]['conversations'] = entry['count']
                else:
                    graph_dict[d_str]['responses'] = entry['count']
        
        graph_data = list(graph_dict.values())

        return Response({
            'active_agents': active_agents_count,
            'conversations': human_conversations,
            'ai_responses': ai_responses,
            'automation_rate': automation_rate,
            'time_saved': time_saved_str,
            'economy_eur': f"{economy} €",
            'csat': "94.8%",
            'recent_activity': recent_activities,
            'graph_data': graph_data
        })

    @action(detail=True, methods=['post'])
    def feedback(self, request, pk=None):
        agent = self.get_object()
        serializer = AgentFeedbackSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user, agent=agent)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        


    @action(detail=True, methods=['post'], url_path='upload_knowledge', parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def upload_knowledge(self, request, pk=None):
        agent = self.get_object()
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=400)
            
        name = request.data.get('name', getattr(file_obj, 'name', 'Document'))
        kb = KnowledgeBase(
            name=name,
            agent=agent,
            source_type=request.data.get('source_type', 'file'),
        )
        try:
            kb.file_binary = file_obj.read()
            kb.file_extension = os.path.splitext(file_obj.name)[1].lower()
            file_obj.seek(0)

            extracted_text = _extract_text(file_obj)

            if extracted_text or kb.file_binary:
                kb.save()
                if extracted_text:
                    add_texts_to_knowledge_base(agent.id, extracted_text, kb.name)
            return Response({'status': 'uploaded', 'kb_id': kb.id})
        except Exception as exc:
            return Response({'error': str(exc)}, status=400)

    @action(detail=True, methods=['post'])
    def deploy(self, request, pk=None):
        agent = self.get_object()
        if not agent.knowledge_bases.exists():
            return Response(
                {'error': "Cet agent ne peut pas être déployé sans base de connaissances. Veuillez en ajouter au moins une."},
                status=status.HTTP_400_BAD_REQUEST
            )
        time.sleep(1) 
        agent.is_deployed = True
        agent.save()
        return Response({'status': 'deployed'})

    @action(detail=True, methods=['post'])
    def toggle_pause(self, request, pk=None):
        agent = self.get_object()
        new_status = not agent.is_active
        agent.is_active = new_status
        agent.save()

        if not new_status:
            self._cascade_pause(agent)

        return Response({'is_active': agent.is_active})

    def _cascade_pause(self, agent):
        """Recursively pause all agents that are targets of links from this agent."""
        links = AgentLink.objects.filter(source_agent=agent)
        for link in links:
            target = link.target_agent
            if target.is_active:
                target.is_active = False
                target.save()
                self._cascade_pause(target)

    @action(detail=True, methods=['post'])
    def sandbox_chat(self, request, pk=None):
        agent = self.get_object()
        user_message = request.data.get('message', '')
        
        team_id = agent.team.id if agent.team else None
        rag_context = search_agent_and_team_knowledge_base(agent_id=agent.id, team_id=team_id, query=user_message, top_k=4)
        context_for_llm = f"Documents sources (Extraits pertinents par recherche sémantique RAG) :\n{rag_context if rag_context.strip() else '[Aucun document fourni]'}\n\n[MODE SANDBOX : Ce message est un test isolé]"
        
        user_plan = 'gratuit'
        if hasattr(request.user, 'subscription'):
            user_plan = request.user.subscription.plan_name

        allowed, reason = check_ai_quota(request.user)
        if not allowed:
            return Response({'error': reason}, status=403)

        response = get_llm_response(
            agent_name=agent.name,
            agent_role=agent.role,
            system_prompt=agent.system_prompt,
            knowledge_context=context_for_llm,
            user_message=user_message,
            model_name=agent.llm_model,
            user_plan=user_plan
        )

        return Response({
            'reply': response,
            'agent': agent.name,
            'timestamp': time.time()
        })

    def _get_assigned_agent(self, user, contact_info, default_agent):
        if not contact_info:
            return default_agent
        assignment = ContactAssignment.objects.filter(user=user, contact_info=contact_info).first()
        return assignment.agent if assignment else default_agent

    def _check_handoff(self, agent, user_message, contact_info, source=None):
        """
        Check if any trigger is met to hand off to another agent.
        On success: reassign contact, log + optionally send an intro from the new agent.
        Returns the target agent or None.
        """
        links = AgentLink.objects.filter(source_agent=agent)
        if not links.exists():
            return None

        from .llm_service import classify_handoff
        for link in links:
            # "manual" is reserved for human / UI escalation — skip auto LLM classification
            if link.trigger_type == 'manual':
                continue
            if classify_handoff(link.trigger_type, user_message):
                target = link.target_agent
                ContactAssignment.objects.update_or_create(
                    user=agent.user,
                    contact_info=contact_info,
                    defaults={'agent': target},
                )

                intro = build_handoff_intro(target, previous_agent=agent)
                resolved_source = source
                if not resolved_source:
                    contact = Contact.objects.filter(
                        user=agent.user, contact_info=contact_info
                    ).first()
                    resolved_source = contact.source if contact else 'chat'

                ChatMessage.objects.create(
                    user=agent.user,
                    agent=target,
                    sender='ai',
                    content=intro,
                    contact_info=contact_info,
                    source=resolved_source or 'chat',
                    status='new',
                )

                if resolved_source in ('whatsapp', 'email'):
                    try:
                        MessagingService.send_message(
                            agent.user, contact_info, intro, resolved_source
                        )
                    except Exception as exc:
                        logger.warning("Handoff intro send failed: %s", exc)

                AuditLog.objects.create(
                    user=agent.user,
                    action="Handoff d'agent",
                    details=(
                        f"{agent.name} → {target.name} "
                        f"(trigger={link.trigger_type}, contact={contact_info})"
                    ),
                )
                return target
        return None

    @action(detail=True, methods=['post'])
    def chat(self, request, pk=None):
        agent = self.get_object()
        if not agent.is_active:
            return Response({'status': 'ignored', 'reason': 'agent_paused', 'reply': "Cette unité IA est actuellement en pause et ne peut pas répondre."})
        
        user_message = request.data.get('message', '')
        contact_info = request.data.get('contact_info', 'anonymous')
        
        effective_agent = self._get_assigned_agent(request.user, contact_info, agent)
        
        handed_to = self._check_handoff(effective_agent, user_message, contact_info, source='chat')
        if handed_to:
            effective_agent = handed_to

        mark_prospect_replied(request.user, contact_info)
        
        ChatMessage.objects.create(agent=effective_agent, user=request.user, sender='user', content=user_message, contact_info=contact_info)

        history = list(ChatMessage.objects.filter(agent=effective_agent, contact_info=contact_info).order_by('-created_at')[:6])
        history.reverse()
        history_str = "\n".join([f"{m.sender}: {m.content}" for m in history])

        rag_context = search_knowledge_base(agent.id, user_message, top_k=4)
        context_for_llm = f"Documents sources (Extraits pertinents par recherche sémantique RAG) :\n{rag_context if rag_context.strip() else '[Aucun document fourni]'}\n\nHistorique récent :\n{history_str}"
        user_plan = 'gratuit'
        if hasattr(request.user, 'subscription'):
            user_plan = request.user.subscription.plan_name

        allowed, reason = check_ai_quota(request.user)
        if not allowed:
            return Response({'status': 'ignored', 'reason': 'quota_reached', 'reply': reason})

        response = get_llm_response(
            agent_name=effective_agent.name,
            agent_role=effective_agent.role,
            system_prompt=effective_agent.system_prompt,
            knowledge_context=context_for_llm,
            user_message=user_message,
            model_name=effective_agent.llm_model,
            user_plan=user_plan
        )

        ChatMessage.objects.create(agent=effective_agent, user=request.user, sender='ai', content=response, contact_info=contact_info)
        schedule_followup_after_ai(request.user, contact_info, analyze=True)
        return Response({
            'reply': response,
            'agent': effective_agent.name,
            'handoff': handed_to.name if handed_to else None,
            'timestamp': time.time()
        })

    @action(detail=True, methods=['post'])
    def email_process(self, request, pk=None):
        process_emails_for_agent(pk)
        return Response({'status': 'processed'})

    @action(detail=False, methods=['post'])
    def process_all_emails(self, request):
        import logging
        logger = logging.getLogger('agents.email_service')
        agents = Agent.objects.all()
        count = 0
        logger.info(f"Déclenchement du traitement global des emails pour {agents.count()} agents potential.")
        for agent in agents:
            has_email = False
            if agent.channels:
                has_email = any(str(c).lower() == 'email' for c in agent.channels)
            
            if agent.is_active and has_email:
                logger.info(f"Traitement des emails pour l'agent: {agent.name} (ID: {agent.id})")
                process_emails_for_agent(agent.id)
                count += 1
            else:
                if not agent.is_active:
                    logger.debug(f"Agent {agent.name} ignoré car inactif.")
                if not has_email:
                    logger.debug(f"Agent {agent.name} ignoré car canal email non activé.")
        
        return Response({'status': 'processed', 'agent_count': count})

    @action(detail=True, methods=['post'])
    def whatsapp_process(self, request, pk=None):
        agent = self.get_object()
        if not agent.is_active:
            return Response({'status': 'ignored', 'reason': 'agent_paused'})
            
        message = request.data.get('message', '').strip()
        wa_id = request.data.get('message_id', '')
        wa_sender = request.data.get('sender', '')

        effective_agent = self._get_assigned_agent(request.user, wa_sender, agent)
        
        handed_to = self._check_handoff(effective_agent, message, wa_sender, source='whatsapp')
        if handed_to:
            effective_agent = handed_to

        mark_prospect_replied(request.user, wa_sender, 'whatsapp')

        config = effective_agent.whatsapp_config
        is_connected = config is not None and config.is_connected
        if not is_connected and not request.data.get('force'):
            return Response({'status': 'ignored', 'reason': 'no_whatsapp_account_connected'})

        if not message:
            return Response({'status': 'ignored', 'reason': 'empty_message'})

        status = classify_pertinence(effective_agent.role, message)

        rag_context = search_knowledge_base(effective_agent.id, message, top_k=4)
        context_for_llm = f"Documents sources (Extraits pertinents par recherche sémantique RAG) :\n{rag_context if rag_context.strip() else '[Aucun document fourni]'}"
        
        answer = get_llm_response(
            agent_name=effective_agent.name,
            agent_role=effective_agent.role,
            system_prompt=effective_agent.system_prompt,
            knowledge_context=context_for_llm,
            user_message=message,
            model_name=effective_agent.llm_model
        )

        ChatMessage.objects.create(agent=effective_agent, user=request.user, sender='user', content=message, contact_info=wa_sender, source='whatsapp', whatsapp_message_id=wa_id, status=status)
        ChatMessage.objects.create(agent=effective_agent, user=request.user, sender='ai', content=answer, contact_info=wa_sender, source='whatsapp', status='new')
        schedule_followup_after_ai(request.user, wa_sender, 'whatsapp', analyze=True)

        return Response({
            'status': 'responded',
            'response': answer,
            'source': 'ai',
            'agent': effective_agent.name,
            'handoff': handed_to.name if handed_to else None,
        })

    @action(detail=True, methods=['get'])
    def prospections(self, request, pk=None):
        agent = self.get_object()
        messages = ChatMessage.objects.filter(agent=agent).exclude(contact_info__isnull=True).order_by('created_at')
        threads = {}
        for m in messages:
            if m.contact_info not in threads:
                threads[m.contact_info] = {
                    'contact': m.contact_info,
                    'source': m.source,
                    'messages': [],
                    'last_updated': m.created_at
                }
            threads[m.contact_info]['messages'].append({
                'id': m.id,
                'sender': m.sender,
                'content': m.content,
                'created_at': m.created_at
            })
            threads[m.contact_info]['last_updated'] = m.created_at
        
        result = list(threads.values())
        result.sort(key=lambda x: x['last_updated'], reverse=True)
        return Response(result)

    @action(detail=True, methods=['post'])
    def send_manual_reply(self, request, pk=None):
        agent = self.get_object()
        contact_info = request.data.get('contact_info')
        content = request.data.get('content')
        source = request.data.get('source')
        
        email_config_id = request.data.get('email_config_id')
        
        if not contact_info or not content or not source:
            return Response({'error': 'Missing data'}, status=400)
            
        if source == 'chat':
            ChatMessage.objects.create(agent=agent, sender='user', content=content, contact_info=contact_info, source=source, status='new')
            history = list(ChatMessage.objects.filter(agent=agent).order_by('-created_at')[:6])
            history.reverse()
            history_str = "\n".join([f"{m.sender}: {m.content}" for m in history])

            rag_context = search_knowledge_base(agent.id, content, top_k=4)
            context_for_llm = f"Documents sources (Extraits pertinents par recherche sémantique RAG) :\n{rag_context if rag_context.strip() else '[Aucun document fourni]'}\n\nHistorique récent :\n{history_str}"
            
            response_text = get_llm_response(
                agent_name=agent.name,
                agent_role=agent.role,
                system_prompt=agent.system_prompt,
                knowledge_context=context_for_llm,
                user_message=content,
                model_name=agent.llm_model
            )
            ChatMessage.objects.create(agent=agent, sender='ai', content=response_text, contact_info=contact_info, source=source, status='new')
            schedule_followup_after_ai(request.user, contact_info, source, analyze=False)
            return Response({'status': 'sent', 'reply': response_text})
            
        elif source == 'email':
            config = None
            if email_config_id:
                config = EmailConfig.objects.filter(id=email_config_id, user=request.user).first()
            
            if not config and agent and agent.email_config:
                config = agent.email_config

            if not config:
                return Response({'error': 'Reliez votre email avec MAGIA pour effectuer cette opération'}, status=400)
                
            success = send_email_reply(config, contact_info, "Re: Contact", content)
            if not success:
                return Response({'error': 'Failed to send email'}, status=500)
            ChatMessage.objects.create(agent=agent, sender='ai', content=content, contact_info=contact_info, source=source, status='new')
            schedule_followup_after_ai(request.user, contact_info, source, analyze=False)
            
        elif source == 'whatsapp':
            success = MessagingService.send_message(request.user, contact_info, content, 'whatsapp')
            if not success:
                return Response({'error': 'WhatsApp service error'}, status=500)
            ChatMessage.objects.create(agent=agent, sender='ai', content=content, contact_info=contact_info, source=source, status='new')
            schedule_followup_after_ai(request.user, contact_info, source, analyze=False)
            
        elif source in ['facebook', 'linkedin']:
            return Response({
                'error': f"Le canal {source} n'est plus disponible. Utilisez WhatsApp ou Email."
            }, status=400)
                
        return Response({'status': 'sent'})
        
    @action(detail=False, methods=['post'])
    def universal_reply(self, request):
        contact_info = request.data.get('contact_info')
        content = request.data.get('content')
        source = request.data.get('source')
        email_config_id = request.data.get('email_config_id')
        
        if not contact_info or not content or not source:
            return Response({'error': 'Missing data'}, status=400)
            
        if source == 'email':
            config = None
            if email_config_id:
                config = EmailConfig.objects.filter(id=email_config_id, user=request.user).first()
            if not config:
                config = EmailConfig.objects.filter(user=request.user).first()
                
            if not config:
                return Response({'error': 'Reliez votre email avec MAGIA pour effectuer cette opération'}, status=400)
                
            success = send_email_reply(config, contact_info, "Re: Contact", content)
            if not success:
                return Response({'error': 'Failed to send email'}, status=500)
            
            ChatMessage.objects.create(
                user=request.user,
                sender='ai',
                content=content,
                contact_info=contact_info,
                source=source,
                status='pertinent',
                email_config=config
            )
            schedule_followup_after_ai(request.user, contact_info, source, analyze=False)
            return Response({'status': 'sent'})
            
        elif source == 'whatsapp':
             success = MessagingService.send_message(request.user, contact_info, content, 'whatsapp')
             if success:
                 ChatMessage.objects.create(user=request.user, sender='ai', content=content, contact_info=contact_info, source=source, status='pertinent')
                 schedule_followup_after_ai(request.user, contact_info, source, analyze=False)
                 return Response({'status': 'sent'})
             return Response({'error': 'Failed to send WhatsApp message'}, status=500)

        elif source in ['facebook', 'linkedin']:
            return Response({
                'error': f"Le canal {source} n'est plus disponible. Utilisez WhatsApp ou Email."
            }, status=400)

        return Response({'error': 'Source not supported for direct reply'}, status=400)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        agent = self.get_object()
        msgs = ChatMessage.objects.filter(agent=agent).order_by('created_at')
        serializer = ChatMessageSerializer(msgs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def all_conversations(self, request):
        user_agents = Agent.objects.filter(user=request.user).values_list('id', flat=True)
        search = request.query_params.get('search', '')
        source_filter = request.query_params.get('source', '')

        # Build base queryset
        base_qs = ChatMessage.objects.filter(
            Q(user=request.user) | Q(agent_id__in=user_agents)
        )
        if source_filter:
            base_qs = base_qs.filter(source=source_filter)

        # Search across contacts
        if search:
            # Also search Contact table names
            matched_contacts = Contact.objects.filter(
                user=request.user,
                name__icontains=search
            ).values_list('contact_info', flat=True)
            base_qs = base_qs.filter(
                Q(contact_info__icontains=search) |
                Q(contact_name__icontains=search) |
                Q(contact_info__in=matched_contacts)
            )

        # Get latest message ID for each unique (source, contact_info)
        latest_msg_ids = base_qs.values('source', 'contact_info').annotate(
            latest_id=MaxAgg('id')
        ).values_list('latest_id', flat=True)

        messages = ChatMessage.objects.filter(
            id__in=latest_msg_ids
        ).select_related('agent').order_by('-created_at')

        # Build a lookup for Contact names
        contact_info_list = [m.contact_info for m in messages if m.contact_info]
        contacts_lookup = {
            (c.source, c.contact_info): c.name
            for c in Contact.objects.filter(
                user=request.user,
                contact_info__in=contact_info_list
            )
        }

        result = []
        for m in messages:
            agent_data = None
            if m.agent:
                agent_data = {'id': str(m.agent.id), 'name': m.agent.name}

            # Best name: Contact table > message.contact_name > raw contact_info
            display_name = (
                contacts_lookup.get((m.source, m.contact_info))
                or m.contact_name
                or m.contact_info
            )

            unread = ChatMessage.objects.filter(
                Q(user=request.user) | Q(agent_id__in=user_agents),
                source=m.source,
                contact_info=m.contact_info,
                is_read=False,
                sender='user'
            ).count()

            result.append({
                'contact': m.contact_info,
                'contact_name': display_name,
                'avatar_letter': (display_name or '?')[0].upper(),
                'source': m.source,
                'agent': agent_data,
                'email_config_id': (
                    m.email_config_id
                    if m.email_config_id
                    else (m.agent.email_config_id if m.agent and m.agent.email_config_id else None)
                ),
                'unread': unread,
                'lastMsg': {
                    'id': m.id,
                    'content': m.content[:120],
                    'sender': m.sender,
                    'created_at': m.created_at,
                    'is_me': m.sender == 'ai',
                },
                'last_updated': m.created_at
            })

        return Response(result)

    @action(detail=False, methods=['get'])
    def contact_messages(self, request):
        contact = request.query_params.get('contact')
        source = request.query_params.get('source')
        if not contact or not source:
            return Response({'error': 'Missing contact or source parameters'}, status=400)

        user_agents = list(Agent.objects.filter(user=request.user).values_list('id', flat=True))
        # Return ALL messages (no limit) so user can scroll back years
        messages = ChatMessage.objects.filter(
            Q(user=request.user) | Q(agent_id__in=user_agents),
            contact_info=contact,
            source=source
        ).order_by('created_at').select_related('agent')

        # Mark messages as read
        messages.filter(is_read=False, sender='user').update(is_read=True)

        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def contacts_list(self, request):
        """Return all known contacts sorted by latest activity, for search/autocomplete."""
        search = request.query_params.get('search', '')
        source = request.query_params.get('source', '')
        contacts = Contact.objects.filter(user=request.user)
        if source:
            contacts = contacts.filter(source=source)
        if search:
            contacts = contacts.filter(
                Q(name__icontains=search) | Q(contact_info__icontains=search)
            )
        contacts = contacts.order_by('-last_message_at')[:100]
        result = [
            {
                'id': c.id,
                'name': c.name or c.contact_info,
                'contact_info': c.contact_info,
                'source': c.source,
                'avatar_letter': (c.name or c.contact_info or '?')[0].upper(),
                'last_message_at': c.last_message_at,
            }
            for c in contacts
        ]
        return Response(result)

    @action(detail=False, methods=['get'])
    def boite_reception(self, request):
        user_agents = Agent.objects.filter(user=request.user).values_list('id', flat=True)
        messages = ChatMessage.objects.filter(
            agent_id__in=user_agents, 
            status='pertinent'
        ).order_by('-created_at')
        
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    def get_queryset(self):
        return AuditLog.objects.filter(user=self.request.user).order_by('-created_at')

