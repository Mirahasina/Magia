from rest_framework import serializers
from .models import Agent, KnowledgeBase, Template, WhatsAppConfig, ChatMessage, EmailConfig

class TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = '__all__'

class WhatsAppConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppConfig
        fields = '__all__'
        read_only_fields = ['user']

class EmailConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailConfig
        fields = '__all__'
        read_only_fields = ['user']

class KnowledgeBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeBase
        fields = ['id', 'agent', 'name', 'source_type', 'file_extension', 'url', 'raw_content', 'created_at']

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = '__all__'

class AgentSerializer(serializers.ModelSerializer):
    knowledge_bases = KnowledgeBaseSerializer(many=True, read_only=True)
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = Agent
        fields = '__all__'
        read_only_fields = ['user']
