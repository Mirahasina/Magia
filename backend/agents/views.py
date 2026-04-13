import time
from google import genai
import environ, os
import datetime
import json
import subprocess
import signal
import requests
import requests as req
import urllib.parse
import pandas as pd
import PyPDF2
import docx
from accounts.models import User, PLAN_LIMITS, WorkspaceMember
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import viewsets, status, parsers, permissions
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from odf.opendocument import load as odf_load
from odf.text import P
from odf import teletype
from pptx import Presentation
from google_auth_oauthlib.flow import Flow
from .models import (
    Agent, KnowledgeBase, Template, WhatsAppConfig, ChatMessage, EmailConfig, AgentFeedback,
    AgentTeam, AgentLink, ContactAssignment, AuditLog
)
from .serializers import (
    AgentSerializer, KnowledgeBaseSerializer, TemplateSerializer, 
    WhatsAppConfigSerializer, ChatMessageSerializer, EmailConfigSerializer,
    AgentFeedbackSerializer, AgentTeamSerializer, AgentLinkSerializer,
    ContactAssignmentSerializer, AuditLogSerializer
)
from .llm_service import get_llm_response, classify_pertinence, DEFAULT_GEMINI_MODELS
from .email_service import (
    process_emails_for_agent, test_email_connection, send_email_via_config,
    sync_email_history, send_email_reply
)
from django.db.models import Q, Count
from django.db.models.functions import TruncDay
from rest_framework.exceptions import PermissionDenied
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .rag_service import add_texts_to_knowledge_base, search_knowledge_base

env = environ.Env()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))



def get_whatsapp_port(user_id):
    if user_id == 'global': return 3001
    uid_str = str(user_id)
    return 3001 + (sum(ord(c) for c in uid_str) % 100)

class WhatsAppConfigViewSet(viewsets.ModelViewSet):
    serializer_class = WhatsAppConfigSerializer

    def get_queryset(self):
        return WhatsAppConfig.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def update_qr(self, request):
        user_id = request.data.get('user_id')
        qr_code = request.data.get('qr_code')
        
        if user_id and user_id != 'global':
            config = WhatsAppConfig.objects.filter(user_id=user_id).first()
        else:
            config = WhatsAppConfig.objects.first()

        if not config:
            return Response({'error': 'Config not found'}, status=404)
            
        if qr_code is not None:
            config.qr_code = qr_code
            config.is_connected = False
            config.save()
        return Response({'status': 'updated'})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def set_connected(self, request):
        user_id = request.data.get('user_id')
        phone = request.data.get('phone_number')
        
        if user_id and user_id != 'global':
            config = WhatsAppConfig.objects.filter(user_id=user_id).first()
        else:
            config = WhatsAppConfig.objects.first()

        if not config:
            return Response({'error': 'Config not found'}, status=404)
            
        config.is_connected = True
        config.qr_code = None
        if phone:
            config.phone_number = phone
        config.save()
        return Response({'status': 'connected'})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def set_disconnected(self, request):
        user_id = request.data.get('user_id')
        if user_id and user_id != 'global':
            config = WhatsAppConfig.objects.filter(user_id=user_id).first()
        else:
            config = WhatsAppConfig.objects.first()

        if not config:
            return Response({'error': 'Config not found'}, status=404)
            
        config.is_connected = False
        config.qr_code = None
        config.save()
        return Response({'status': 'disconnected'})

    @action(detail=True, methods=['post'])
    def connect(self, request, pk=None):
        config = self.get_object()
        config.qr_code = None
        config.is_connected = False
        config.save()
        
        try:
            user_id = str(request.user.id)
            proc_check = subprocess.run(['pgrep', '-f', f'node.*whatsapp_service/index.js.*--user {user_id}'], capture_output=True, text=True)
            
            if not proc_check.stdout.strip():
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                service_path = os.path.join(base_dir, 'whatsapp_service', 'index.js')
                
                user = request.user
                if not user.master_api_key:
                    user.generate_master_api_key()
                token = user.master_api_key
                
                log_file = os.path.join(base_dir, 'logs', f'whatsapp_{user_id}.log')
                os.makedirs(os.path.dirname(log_file), exist_ok=True)
                
                with open(log_file, 'a') as f:
                    subprocess.Popen(
                        ['node', service_path, '--user', user_id, '--token', token],
                        stdout=f,
                        stderr=f,
                        preexec_fn=os.setpgrp
                    )
        except Exception:
            pass
            
        return Response({'status': 'waiting_for_qr'})

    @action(detail=True, methods=['post'])
    def toggle_connection(self, request, pk=None):
        config = self.get_object()
        old_connected = config.is_connected
        config.is_connected = not config.is_connected
        
        if not config.is_connected:
            config.qr_code = None
            user_id = str(request.user.id)
            try:
                subprocess.run(['pkill', '-f', f'node .*index.js --user {user_id}'], check=False)
                
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                auth_dir = os.path.join(base_dir, f'auth_info_{user_id}')
                if os.path.exists(auth_dir):
                    import shutil
                    shutil.rmtree(auth_dir)
                    
                config.is_connected = False
                config.qr_code = None
            except Exception as e:
                print(f"Error during disconnect: {e}")
                
        config.save()
        return Response({'is_connected': config.is_connected})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def whatsapp_gateway(self, request):
        user_id = request.data.get('user_id')
        message = request.data.get('message', '').strip()
        wa_id = request.data.get('message_id', '')
        wa_sender = request.data.get('sender', '')
        is_historical = request.data.get('is_historical', False)
        
        if not user_id or user_id == 'global':
            return Response({'error': 'User ID required'}, status=400)
            
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        if wa_id and ChatMessage.objects.filter(user=user, whatsapp_message_id=wa_id).exists():
            return Response({'status': 'ignored', 'reason': 'duplicate'})

        msg = ChatMessage.objects.create(
            user=user,
            sender='user',
            content=message,
            contact_info=wa_sender,
            source='whatsapp',
            whatsapp_message_id=wa_id,
            status='archived' if is_historical else 'new'
        )

        agents = Agent.objects.filter(user=user, is_active=True)
        responded = False
        reply_text = ""
        
        for agent in agents:
            if agent.channels and any(c.lower() == 'whatsapp' for c in agent.channels):
                if not msg.agent:
                    msg.agent = agent
                    msg.save()
                pass

        return Response({'status': 'received', 'message_id': msg.id})

class EmailConfigViewSet(viewsets.ModelViewSet):
    serializer_class = EmailConfigSerializer

    def get_queryset(self):
        return EmailConfig.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def sync_history(self, request, pk=None):
        config = self.get_object()
        sync_email_history(config)
        return Response({'status': 'sync_started'})

    @action(detail=False, methods=['post'])
    def sync_all_history(self, request):
        configs = EmailConfig.objects.filter(user=request.user, is_active=True)
        for config in configs:
            sync_email_history(config)
        return Response({'status': 'global_sync_started'})

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
        
        client_id = env('GOOGLE_CLIENT_ID', default=None)
        client_secret = env('GOOGLE_CLIENT_SECRET', default=None)
        redirect_uri = env('GOOGLE_REDIRECT_URI', default=None)
        
        if not client_id or not client_secret:
            return Response({'error': 'Google OAuth2 credentials not configured in .env'}, status=status.HTTP_400_BAD_REQUEST)

        auth_params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': 'https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email openid',
            'access_type': 'offline',
            'prompt': 'consent',
            'include_granted_scopes': 'true',
            'state': json.dumps({'config_id': config.id})
        }
        
        query_string = urllib.parse.urlencode(auth_params)
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query_string}"
        
        return Response({'url': auth_url})

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def oauth2_callback(self, request):
        os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'
        state_data = json.loads(request.query_params.get('state'))
        config_id = state_data.get('config_id')
        code = request.query_params.get('code')
        
        config = EmailConfig.objects.get(id=config_id)
        client_id = env('GOOGLE_CLIENT_ID', default=None)
        client_secret = env('GOOGLE_CLIENT_SECRET', default=None)
        redirect_uri = env('GOOGLE_REDIRECT_URI', default=None)
        
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
        
        try:
            sync_email_history(config)
        except Exception:
            pass

        return redirect(f"http://localhost:5173/dashboard?view=settings&email_config_id={config.id}&tab=email&status=success")

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
            agent = Agent.objects.create(
                user=request.user,
                team=team,
                name=agent_def['name'],
                role=agent_def['role'],
                system_prompt=agent_def['system_prompt'],
                is_team_agent=True,
                is_deployed=True,
                llm_model='gemini-2.0-flash',
                execution_mode='auto'
            )
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
        import json

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
      {"name": "Nom Agent", "role": "Expertise", "system_prompt": "Instructions pro sans gras"}
    ],
    "links": [
      {"from": 0, "to": 1, "trigger": "interest", "description": "Trigger"}
    ]
  }
}

Triggers : interest, email_requested, whatsapp_requested, manual."""

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

            # Robust JSON extraction
            try:
                import re
                json_match = re.search(r'(\{.*\})', reply_text, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group(1))
                    return Response({
                        "reply": data.get("reply", "Plan conçu."),
                        "options": data.get("options", []),
                        "ready": data.get("ready", False),
                        "plan": data.get("plan")
                    })
            except Exception:
                pass

            # Fallback if AI returned raw text
            return Response({
                "reply": reply_text,
                "options": [],
                "ready": False,
                "plan": None
            })

        except Exception as e:
            import traceback
            print(f"ERROR in design_team: {str(e)}")
            traceback.print_exc()
            return Response({'error': f"Erreur AI : {str(e)}"}, status=500)

class AgentLinkViewSet(viewsets.ModelViewSet):
    serializer_class = AgentLinkSerializer
    def get_queryset(self):
        return AgentLink.objects.filter(user=self.request.user)
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ContactAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = ContactAssignmentSerializer
    def get_queryset(self):
        return ContactAssignment.objects.filter(user=self.request.user)

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
                extracted_text = ""
                if filename.endswith('.txt'):
                    extracted_text = file_obj.read().decode('utf-8')
                elif filename.endswith('.pdf'):
                    reader = PyPDF2.PdfReader(file_obj)
                    text = ""
                    for page in reader.pages:
                        extracted = page.extract_text()
                        if extracted:
                            text += extracted + "\n"
                    extracted_text = text
                elif filename.endswith('.docx'):
                    doc = docx.Document(file_obj)
                    extracted_text = "\n".join([para.text for para in doc.paragraphs])
                elif filename.endswith('.xlsx') or filename.endswith('.xls'):
                    df = pd.read_excel(file_obj)
                    extracted_text = df.to_string()
                elif filename.endswith('.pptx'):
                    prs = Presentation(file_obj)
                    text = []
                    for slide in prs.slides:
                        for shape in slide.shapes:
                            if hasattr(shape, "text"):
                                text.append(shape.text)
                    extracted_text = "\n".join(text)
                elif filename.endswith('.odt') or filename.endswith('.ods') or filename.endswith('.odp'):
                    doc = odf_load(file_obj)
                    paragraphs = doc.text.getElementsByType(P)
                    extracted_text = "\n".join([teletype.extractText(p) for p in paragraphs])
                
                if extracted_text or instance.file_binary:
                    instance.save()
                    if extracted_text and instance.agent:
                        add_texts_to_knowledge_base(instance.agent.id, extracted_text, instance.name)
            except Exception:
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
            
            filename = file_obj.name.lower()
            extracted_text = ""
            if filename.endswith('.txt'):
                extracted_text = file_obj.read().decode('utf-8')
            elif filename.endswith('.pdf'):
                reader = PyPDF2.PdfReader(file_obj)
                text = ""
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
                extracted_text = text
            elif filename.endswith('.docx'):
                import docx
                doc = docx.Document(file_obj)
                extracted_text = "\n".join([para.text for para in doc.paragraphs])
            elif filename.endswith('.xlsx') or filename.endswith('.xls'):
                df = pd.read_excel(file_obj)
                extracted_text = df.to_string()
            elif filename.endswith('.pptx'):
                prs = Presentation(file_obj)
                text = []
                for slide in prs.slides:
                    for shape in slide.shapes:
                        if hasattr(shape, "text"):
                            text.append(shape.text)
                extracted_text = "\n".join(text)
            elif filename.endswith('.odt') or filename.endswith('.ods') or filename.endswith('.odp'):
                doc = odf_load(file_obj)
                paragraphs = doc.text.getElementsByType(P)
                extracted_text = "\n".join([teletype.extractText(p) for p in paragraphs])
            
            if extracted_text or kb.file_binary:
                kb.save()
                if extracted_text:
                    add_texts_to_knowledge_base(agent.id, extracted_text, kb.name)
            return Response({'status': 'uploaded', 'kb_id': kb.id})
        except Exception as e:
            return Response({'error': str(e)}, status=400)

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

        # Cascading pause: if agent is paused, pause all agents linked downstream
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
        
        rag_context = search_knowledge_base(agent.id, user_message, top_k=4)
        context_for_llm = f"Documents sources (Extraits pertinents par recherche sémantique RAG) :\n{rag_context if rag_context.strip() else '[Aucun document fourni]'}\n\n[MODE SANDBOX : Ce message est un test isolé]"
        
        response = get_llm_response(
            agent_name=agent.name,
            agent_role=agent.role,
            system_prompt=agent.system_prompt,
            knowledge_context=context_for_llm,
            user_message=user_message,
            model_name=agent.llm_model
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

    def _check_handoff(self, agent, user_message, contact_info):
        """
        Check if any trigger is met to hand off to another agent.
        """
        links = AgentLink.objects.filter(source_agent=agent)
        if not links.exists():
            return None
        
        # Simple LLM check for trigger
        from .llm_service import classify_handoff
        for link in links:
            if classify_handoff(link.trigger_type, user_message):
                # Perform handoff
                ContactAssignment.objects.update_or_create(
                    user=agent.user,
                    contact_info=contact_info,
                    defaults={'agent': link.target_agent}
                )
                return link.target_agent
        return None

    @action(detail=True, methods=['post'])
    def chat(self, request, pk=None):
        agent = self.get_object()
        if not agent.is_active:
            return Response({'status': 'ignored', 'reason': 'agent_paused', 'reply': "Cette unité IA est actuellement en pause et ne peut pas répondre."})
        
        user_message = request.data.get('message', '')
        contact_info = request.data.get('contact_info', 'anonymous')
        
        # Check if another agent is assigned
        effective_agent = self._get_assigned_agent(request.user, contact_info, agent)
        
        # Check for handoff for future messages
        self._check_handoff(effective_agent, user_message, contact_info)
        
        ChatMessage.objects.create(agent=effective_agent, sender='user', content=user_message, contact_info=contact_info)

        history = list(ChatMessage.objects.filter(agent=effective_agent, contact_info=contact_info).order_by('-created_at')[:6])
        history.reverse()
        history_str = "\n".join([f"{m.sender}: {m.content}" for m in history])

        rag_context = search_knowledge_base(agent.id, user_message, top_k=4)
        context_for_llm = f"Documents sources (Extraits pertinents par recherche sémantique RAG) :\n{rag_context if rag_context.strip() else '[Aucun document fourni]'}\n\nHistorique récent :\n{history_str}"
        response = get_llm_response(
            agent_name=effective_agent.name,
            agent_role=effective_agent.role,
            system_prompt=effective_agent.system_prompt,
            knowledge_context=context_for_llm,
            user_message=user_message
        )

        ChatMessage.objects.create(agent=effective_agent, sender='ai', content=response, contact_info=contact_info)
        return Response({
            'reply': response,
            'agent': effective_agent.name,
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

        # Check if another agent is assigned
        effective_agent = self._get_assigned_agent(request.user, wa_sender, agent)
        
        # Check for handoff for future messages
        self._check_handoff(effective_agent, message, wa_sender)

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

        ChatMessage.objects.create(agent=effective_agent, sender='user', content=message, contact_info=wa_sender, source='whatsapp', whatsapp_message_id=wa_id, status=status)
        ChatMessage.objects.create(agent=effective_agent, sender='ai', content=answer, contact_info=wa_sender, source='whatsapp', status='new')

        return Response({
            'status': 'responded',
            'response': answer,
            'source': 'ai',
            'agent': effective_agent.name
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
            return Response({'status': 'sent', 'reply': response_text})
            
        elif source == 'email':
            if not agent.email_config:
                return Response({'error': 'No email config'}, status=400)
            success = send_email_reply(agent.email_config, contact_info, "Re: Contact", content)
            if not success:
                return Response({'error': 'Failed to send email'}, status=500)
            ChatMessage.objects.create(agent=agent, sender='ai', content=content, contact_info=contact_info, source=source, status='new')
        elif source == 'whatsapp':
            try:
                port = get_whatsapp_port(request.user.id)
                resp = req.post(f"http://localhost:{port}/send_message", json={"to": contact_info, "text": content})
                if not resp.json().get("success"):
                    return Response({'error': 'WhatsApp service error'}, status=500)
                ChatMessage.objects.create(agent=agent, sender='ai', content=content, contact_info=contact_info, source=source, status='new')
            except Exception as e:
                return Response({'error': str(e)}, status=500)
                
        return Response({'status': 'sent'})

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        agent = self.get_object()
        msgs = ChatMessage.objects.filter(agent=agent).order_by('created_at')
        serializer = ChatMessageSerializer(msgs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def all_conversations(self, request):
        user_agents = list(Agent.objects.filter(user=request.user).values_list('id', flat=True))
        messages = ChatMessage.objects.filter(
            Q(user=request.user) | Q(agent_id__in=user_agents)
        ).exclude(contact_info='').order_by('created_at')

        threads = {}
        for m in messages:
            key = f"{m.source}_{m.contact_info}"
            if key not in threads:
                agent_data = None
                if m.agent:
                    agent_data = {'id': str(m.agent.id), 'name': m.agent.name}
                    
                threads[key] = {
                    'contact': m.contact_info,
                    'source': m.source,
                    'agent': agent_data,
                    'unread': 0,
                    'lastMsg': None,
                    'last_updated': m.created_at
                }
            
            if m.sender != 'ai' and m.sender != getattr(m.agent, 'name', '') and not getattr(m, 'is_read', True):
                threads[key]['unread'] += 1
                
            threads[key]['lastMsg'] = {
                'id': m.id,
                'content': m.content,
                'sender': m.sender,
                'created_at': m.created_at,
                'status': m.status
            }
            threads[key]['last_updated'] = m.created_at
            if m.agent and not threads[key]['agent']:
                threads[key]['agent'] = {'id': str(m.agent.id), 'name': m.agent.name}

        result = list(threads.values())
        result.sort(key=lambda x: x['last_updated'], reverse=True)
        return Response(result)

    @action(detail=False, methods=['get'])
    def contact_messages(self, request):
        contact = request.query_params.get('contact')
        source = request.query_params.get('source')
        if not contact or not source:
            return Response({'error': 'Missing contact or source parameters'}, status=400)
            
        user_agents = list(Agent.objects.filter(user=request.user).values_list('id', flat=True))
        messages = ChatMessage.objects.filter(
            Q(user=request.user) | Q(agent_id__in=user_agents),
            contact_info=contact,
            source=source
        ).order_by('created_at')
        
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

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

