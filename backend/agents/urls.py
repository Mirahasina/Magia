from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AgentViewSet, KnowledgeBaseViewSet, TemplateViewSet, 
    WhatsAppConfigViewSet, ChatMessageViewSet, EmailConfigViewSet
)

router = DefaultRouter()
router.register(r'agents', AgentViewSet, basename='agent')
router.register(r'knowledge-base', KnowledgeBaseViewSet, basename='knowledgebase')
router.register(r'templates', TemplateViewSet, basename='template')
router.register(r'whatsapp-config', WhatsAppConfigViewSet, basename='whatsappconfig')
router.register(r'email-config', EmailConfigViewSet, basename='emailconfig')
router.register(r'chat-messages', ChatMessageViewSet, basename='chatmessage')

urlpatterns = [
    path('', include(router.urls)),
]
