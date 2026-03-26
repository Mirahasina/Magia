import time
import os
import datetime
import json
import subprocess
import signal
import requests
import urllib.parse
import pandas as pd
import PyPDF2
import docx
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import viewsets, status, parsers
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from odf.opendocument import load as odf_load
from odf.text import P
from odf import teletype
from pptx import Presentation
from google_auth_oauthlib.flow import Flow
from .models import Agent, KnowledgeBase, Template, WhatsAppConfig, ChatMessage, EmailConfig
from .serializers import AgentSerializer, KnowledgeBaseSerializer, TemplateSerializer, WhatsAppConfigSerializer, ChatMessageSerializer, EmailConfigSerializer
from .llm_service import get_llm_response, classify_pertinence
from .email_service import process_emails_for_agent, test_email_connection, send_email_via_config


class WhatsAppConfigViewSet(viewsets.ModelViewSet):
    serializer_class = WhatsAppConfigSerializer

    def get_queryset(self):
        return WhatsAppConfig.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], permission_classes=[])
    def update_status(self, request):
        phone_number = request.data.get('phone_number')
        qr_code = request.data.get('qr_code')
        is_connected = request.data.get('is_connected', False)
        user_id = request.data.get('user_id')
        
        if user_id and user_id != 'global':
            config = WhatsAppConfig.objects.filter(user_id=user_id).first()
        else:
            config = WhatsAppConfig.objects.first()

        if not config:
            return Response({'error': 'Config not found'}, status=404)
            
        config.is_connected = is_connected
        if qr_code is not None:
            config.qr_code = qr_code
        if phone_number:
            config.phone_number = phone_number
        config.save()
        return Response({'status': 'updated'})

    @action(detail=True, methods=['post'])
    def connect(self, request, pk=None):
        config = self.get_object()
        config.qr_code = None
        config.is_connected = False
        config.save()
        
        try:
            # Check if a process for this specific user is already running
            user_id = str(request.user.id)
            proc_check = subprocess.run(['pgrep', '-f', f'node.*whatsapp_service/index.js.*--user {user_id}'], capture_output=True, text=True)
            
            if not proc_check.stdout.strip():
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                service_path = os.path.join(base_dir, 'whatsapp_service', 'index.js')
                
                subprocess.Popen(
                    ['node', service_path, '--user', user_id],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    preexec_fn=os.setpgrp
                )
        except Exception:
            pass
            
        return Response({'status': 'waiting_for_qr'})

    @action(detail=True, methods=['post'])
    def toggle_connection(self, request, pk=None):
        config = self.get_object()
        config.is_connected = not config.is_connected
        if not config.is_connected:
            config.qr_code = None
        config.save()
        return Response({'is_connected': config.is_connected})

class EmailConfigViewSet(viewsets.ModelViewSet):
    serializer_class = EmailConfigSerializer

    def get_queryset(self):
        return EmailConfig.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        config = self.get_object()
        results = test_email_connection(config)
        return Response(results)

    @action(detail=True, methods=['get'])
    def get_auth_url(self, request, pk=None):
        config = self.get_object()
        
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        redirect_uri = os.getenv('GOOGLE_REDIRECT_URI')
        
        if not client_id or not client_secret:
            return Response({'error': 'Google OAuth2 credentials not configured in .env'}, status=status.HTTP_400_BAD_REQUEST)

        params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': 'https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email openid',
            'access_type': 'offline',
            'prompt': 'consent',
            'include_granted_scopes': 'true',
            'state': json.dumps({'config_id': config.id})
        }
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
        
        return Response({'auth_url': auth_url})

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def oauth2_callback(self, request):
        os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'
        state_data = json.loads(request.query_params.get('state'))
        config_id = state_data.get('config_id')
        code = request.query_params.get('code')
        
        config = EmailConfig.objects.get(id=config_id)
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        redirect_uri = os.getenv('GOOGLE_REDIRECT_URI')
        
        client_config = {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        }
        
        flow = Flow.from_client_config(
            client_config, 
            scopes=['https://mail.google.com/', 'https://www.googleapis.com/auth/userinfo.email', 'openid'], 
            redirect_uri=redirect_uri
        )
        flow.code_verifier = None
        
        try:
            flow.fetch_token(code=code)
        except Exception:
            return redirect(f"http://localhost:5173/dashboard?view=settings&email_config_id={config.id}&tab=email&status=error&message=Code_expire_ou_invalide_Veuillez_reessayer")
        
        credentials = flow.credentials
        config.oauth_token = credentials.token
        config.refresh_token = credentials.refresh_token
        
        try:
            userinfo_response = requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {credentials.token}'}
            )
            if userinfo_response.status_code == 200:
                user_data = userinfo_response.json()
                config.email = user_data.get('email', config.email)
        except Exception:
            pass
            
        config.is_active = True
        config.save()
        return redirect(f"http://localhost:5173/dashboard?view=settings&email_config_id={config.id}&tab=email&status=success")

class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        user_agents = Agent.objects.filter(user=self.request.user).values_list('id', flat=True)
        queryset = ChatMessage.objects.filter(agent_id__in=user_agents)
        agent_id = self.request.query_params.get('agent_id')
        if agent_id:
            return queryset.filter(agent_id=agent_id).order_by('created_at')
        return queryset

class TemplateViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TemplateSerializer

    def get_queryset(self):
        return Template.objects.all()

class KnowledgeBaseViewSet(viewsets.ModelViewSet):
    serializer_class = KnowledgeBaseSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        user_agents = Agent.objects.filter(user=self.request.user).values_list('id', flat=True)
        return KnowledgeBase.objects.filter(agent_id__in=user_agents)

    def perform_create(self, serializer):
        file_obj = self.request.FILES.get('file')
        instance = serializer.save()
        
        if file_obj:
            try:
                instance.file_binary = file_obj.read()
                instance.file_extension = os.path.splitext(file_obj.name)[1].lower()
                file_obj.seek(0)
                
                filename = file_obj.name.lower()
                if filename.endswith('.txt'):
                    instance.raw_content = file_obj.read().decode('utf-8')
                elif filename.endswith('.pdf'):
                    reader = PyPDF2.PdfReader(file_obj)
                    text = ""
                    for page in reader.pages:
                        extracted = page.extract_text()
                        if extracted:
                            text += extracted + "\n"
                    instance.raw_content = text
                elif filename.endswith('.docx'):
                    doc = docx.Document(file_obj)
                    instance.raw_content = "\n".join([para.text for para in doc.paragraphs])
                elif filename.endswith('.xlsx') or filename.endswith('.xls'):
                    df = pd.read_excel(file_obj)
                    instance.raw_content = df.to_string()
                elif filename.endswith('.pptx'):
                    prs = Presentation(file_obj)
                    text = []
                    for slide in prs.slides:
                        for shape in slide.shapes:
                            if hasattr(shape, "text"):
                                text.append(shape.text)
                    instance.raw_content = "\n".join(text)
                elif filename.endswith('.odt') or filename.endswith('.ods') or filename.endswith('.odp'):
                    doc = odf_load(file_obj)
                    paragraphs = doc.text.getElementsByType(P)
                    instance.raw_content = "\n".join([teletype.extractText(p) for p in paragraphs])
                
                if instance.raw_content or instance.file_binary:
                    instance.save()
            except Exception:
                pass

class AgentViewSet(viewsets.ModelViewSet):
    serializer_class = AgentSerializer

    def get_queryset(self):
        return Agent.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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

        return Response({
            'active_agents': active_agents_count,
            'conversations': human_conversations,
            'ai_responses': ai_responses,
            'automation_rate': automation_rate,
            'time_saved': time_saved_str,
            'economy_eur': f"{economy} €",
            'csat': "94.8%",
            'recent_activity': recent_activities
        })

    @action(detail=True, methods=['post'])
    def deploy(self, request, pk=None):
        agent = self.get_object()
        time.sleep(1) 
        agent.is_deployed = True
        agent.save()
        return Response({'status': 'deployed'})

    @action(detail=True, methods=['post'])
    def chat(self, request, pk=None):
        agent = self.get_object()
        user_message = request.data.get('message', '')
        ChatMessage.objects.create(agent=agent, sender='user', content=user_message)

        kbs = agent.knowledge_bases.all()
        doc_texts = []
        for kb in kbs:
            if kb.raw_content and "[IMAGE_DATA]" not in kb.raw_content:
                doc_texts.append(f"--- DÉBUT DU DOCUMENT : {kb.name} ---\n{kb.raw_content}\n--- FIN DU DOCUMENT : {kb.name} ---")
        
        full_text = "\n\n".join(doc_texts)
        history = list(ChatMessage.objects.filter(agent=agent).order_by('-created_at')[:6])
        history.reverse()
        history_str = "\n".join([f"{m.sender}: {m.content}" for m in history])

        context_for_llm = f"Documents sources fournis dans ta base de connaissances (quantité de fichiers: {len(doc_texts)}) :\n{full_text if full_text.strip() else '[Aucun document fourni]'}\n\nHistorique récent :\n{history_str}"
        response = get_llm_response(
            agent_name=agent.name,
            agent_role=agent.role,
            system_prompt=agent.system_prompt,
            knowledge_context=context_for_llm,
            user_message=user_message
        )

        ChatMessage.objects.create(agent=agent, sender='ai', content=response)
        return Response({
            'reply': response,
            'agent': agent.name,
            'timestamp': time.time()
        })

    @action(detail=True, methods=['post'])
    def email_process(self, request, pk=None):
        process_emails_for_agent(pk)
        return Response({'status': 'processed'})

    @action(detail=False, methods=['post'])
    def process_all_emails(self, request):
        agents = Agent.objects.all()
        count = 0
        for agent in agents:
            if agent.channels and any(str(c).lower() == 'email' for c in agent.channels):
                process_emails_for_agent(agent.id)
                count += 1
        return Response({'status': 'processed', 'agent_count': count})

    @action(detail=True, methods=['post'])
    def whatsapp_process(self, request, pk=None):
        agent = self.get_object()
        message = request.data.get('message', '').strip()
        wa_id = request.data.get('message_id', '')
        wa_sender = request.data.get('sender', '')
        
        config = agent.whatsapp_config
        is_connected = config is not None and config.is_connected
        if not is_connected and not request.data.get('force'):
            return Response({'status': 'ignored', 'reason': 'no_whatsapp_account_connected'})

        if not message:
            return Response({'status': 'ignored', 'reason': 'empty_message'})

        # Classify status (pertinence)
        status = classify_pertinence(agent.role, message)

        kbs = agent.knowledge_bases.all()
        doc_texts = []
        for kb in kbs:
            if kb.raw_content and "[IMAGE_DATA]" not in kb.raw_content:
                doc_texts.append(f"--- DÉBUT DU DOCUMENT : {kb.name} ---\n{kb.raw_content}\n--- FIN DU DOCUMENT : {kb.name} ---")
        
        full_text = "\n\n".join(doc_texts)
        context_for_llm = f"Documents sources fournis dans ta base de connaissances (quantité de fichiers: {len(doc_texts)}) :\n{full_text if full_text.strip() else '[Aucun document fourni]'}"
        
        answer = get_llm_response(
            agent_name=agent.name,
            agent_role=agent.role,
            system_prompt=agent.system_prompt,
            knowledge_context=context_for_llm,
            user_message=message,
            model_name=agent.llm_model
        )

        ChatMessage.objects.create(agent=agent, sender='user', content=message, contact_info=wa_sender, source='whatsapp', whatsapp_message_id=wa_id, status=status)
        ChatMessage.objects.create(agent=agent, sender='ai', content=answer, contact_info=wa_sender, source='whatsapp', status='new')

        return Response({
            'status': 'responded',
            'response': answer,
            'source': 'ai'
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
        
        if not contact_info or not content or not source:
            return Response({'error': 'Missing data'}, status=400)
            
        if source == 'chat':
            ChatMessage.objects.create(agent=agent, sender='user', content=content, contact_info=contact_info, source=source, status='new')
            kbs = agent.knowledge_bases.all()
            doc_texts = []
            for kb in kbs:
                if kb.raw_content and "[IMAGE_DATA]" not in kb.raw_content:
                    doc_texts.append(f"--- DÉBUT DU DOCUMENT : {kb.name} ---\n{kb.raw_content}\n--- FIN DU DOCUMENT : {kb.name} ---")
            
            full_text = "\n\n".join(doc_texts)
            history = list(ChatMessage.objects.filter(agent=agent).order_by('-created_at')[:6])
            history.reverse()
            history_str = "\n".join([f"{m.sender}: {m.content}" for m in history])

            context_for_llm = f"Documents sources fournis dans ta base de connaissances (quantité de fichiers: {len(doc_texts)}) :\n{full_text if full_text.strip() else '[Aucun document fourni]'}\n\nHistorique récent :\n{history_str}"
            
            from .llm_service import get_llm_response
            response_text = get_llm_response(
                agent_name=agent.name,
                agent_role=agent.role,
                system_prompt=agent.system_prompt,
                knowledge_context=context_for_llm,
                user_message=content,
                model_name=agent.llm_model
            )
            ChatMessage.objects.create(agent=agent, sender='ai', content=response_text, contact_info=contact_info, source=source, status='new')
            return Response({'status': 'sent', 'reply': response_text})
            
        elif source == 'email':
            if not agent.email_config:
                return Response({'error': 'No email config'}, status=400)
            from .email_service import send_email_reply
            success = send_email_reply(agent.email_config, contact_info, "Re: Contact", content)
            if not success:
                return Response({'error': 'Failed to send email'}, status=500)
            ChatMessage.objects.create(agent=agent, sender='ai', content=content, contact_info=contact_info, source=source, status='new')
        elif source == 'whatsapp':
            try:
                import requests as req
                resp = req.post("http://localhost:3001/send_message", json={"to": contact_info, "text": content})
                if not resp.json().get("success"):
                    return Response({'error': 'WhatsApp service error'}, status=500)
                ChatMessage.objects.create(agent=agent, sender='ai', content=content, contact_info=contact_info, source=source, status='new')
            except Exception as e:
                return Response({'error': str(e)}, status=500)
                
        return Response({'status': 'sent'})

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        agent = self.get_object()
        from .serializers import ChatMessageSerializer
        msgs = ChatMessage.objects.filter(agent=agent).order_by('created_at')
        serializer = ChatMessageSerializer(msgs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def boite_reception(self, request):
        user_agents = Agent.objects.filter(user=request.user).values_list('id', flat=True)
        messages = ChatMessage.objects.filter(
            agent_id__in=user_agents, 
            status='pertinent'
        ).order_by('-created_at')
        
        from .serializers import ChatMessageSerializer
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)
