from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.permissions import AllowAny
from .views import (
    AgentViewSet, KnowledgeBaseViewSet, TemplateViewSet, 
    WhatsAppConfigViewSet, ChatMessageViewSet, EmailConfigViewSet,
    AgentTeamViewSet, AgentLinkViewSet, ContactAssignmentViewSet, AuditLogViewSet,
    LinkedInConfigViewSet, FacebookConfigViewSet, ContactViewSet,
    ProspectSearchJobViewSet, ApolloPhoneWebhookView,
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
router.register(r'prospect-searches', ProspectSearchJobViewSet, basename='prospectsearch')

urlpatterns = [
    path('', include(router.urls)),
    path(
        'webhooks/facebook/',
        FacebookConfigViewSet.as_view(
            {'get': 'webhook', 'post': 'webhook'},
            permission_classes=[AllowAny],
            authentication_classes=[],
        ),
        name='facebook-webhook',
    ),
    path(
        'webhooks/apollo/phone/',
        ApolloPhoneWebhookView.as_view({'post': 'create'}),
        name='apollo-phone-webhook',
    ),
]
