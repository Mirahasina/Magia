from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AgentViewSet, KnowledgeBaseViewSet, TemplateViewSet, 
    WhatsAppConfigViewSet, ChatMessageViewSet, EmailConfigViewSet,
    AgentTeamViewSet, AgentLinkViewSet, ContactAssignmentViewSet, AuditLogViewSet,
    LinkedInConfigViewSet, FacebookConfigViewSet, ContactViewSet
)

from .daily_views import DailyCallViewSet

router = DefaultRouter()
router.register(r'agents', AgentViewSet, basename='agent')
router.register(r'knowledge-base', KnowledgeBaseViewSet, basename='knowledgebase')
router.register(r'templates', TemplateViewSet, basename='template')
router.register(r'whatsapp-config', WhatsAppConfigViewSet, basename='whatsappconfig')
router.register(r'email-config', EmailConfigViewSet, basename='emailconfig')
router.register(r'chat-messages', ChatMessageViewSet, basename='chatmessage')
router.register(r'agent-teams', AgentTeamViewSet, basename='agentteam')
router.register(r'agent-links', AgentLinkViewSet, basename='agentlink')
router.register(r'contact-assignments', ContactAssignmentViewSet, basename='contactassignment')
router.register(r'contacts', ContactViewSet, basename='contact')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'linkedin-config', LinkedInConfigViewSet, basename='linkedinconfig')
router.register(r'facebook-config', FacebookConfigViewSet, basename='facebookconfig')
router.register(r'video-rooms', DailyCallViewSet, basename='video-rooms')

urlpatterns = [
    path('', include(router.urls)),
]
