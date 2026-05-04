from rest_framework import serializers
from .models import Agent, KnowledgeBase, Template, WhatsAppConfig, ChatMessage, EmailConfig, LinkedInConfig, AgentTeam, AgentLink, ContactAssignment, AuditLog, AgentFeedback, UserSurvey

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'

class TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = '__all__'
# ... (rest of the file)

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

class LinkedInConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = LinkedInConfig
        fields = '__all__'
        read_only_fields = ['user']

class KnowledgeBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeBase
        fields = ['id', 'agent', 'name', 'source_type', 'file_extension', 'url', 'created_at']

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = '__all__'

class AgentLinkSerializer(serializers.ModelSerializer):
    source_agent_name = serializers.ReadOnlyField(source='source_agent.name')
    target_agent_name = serializers.ReadOnlyField(source='target_agent.name')
    
    class Meta:
        model = AgentLink
        fields = '__all__'
        read_only_fields = ['user']

class ContactAssignmentSerializer(serializers.ModelSerializer):
    agent_name = serializers.ReadOnlyField(source='agent.name')
    
    class Meta:
        model = ContactAssignment
        fields = '__all__'
        read_only_fields = ['user', 'last_interaction']

class AgentSerializer(serializers.ModelSerializer):
    knowledge_bases = KnowledgeBaseSerializer(many=True, read_only=True)
    messages = ChatMessageSerializer(many=True, read_only=True)
    owner_name = serializers.ReadOnlyField(source='user.full_name')
    owner_email = serializers.ReadOnlyField(source='user.email')
    team_name = serializers.ReadOnlyField(source='team.name')
    team_color = serializers.ReadOnlyField(source='team.color')
    stats = serializers.SerializerMethodField()

    def get_stats(self, obj):
        
        convs = ChatMessage.objects.filter(agent=obj).values('contact_info').distinct().count() or 0
        
        user_msgs_count = ChatMessage.objects.filter(agent=obj, sender='user').count()
        ai_msgs_count = ChatMessage.objects.filter(agent=obj, sender='ai').count()
        
        resolution = "0%"
        if user_msgs_count > 0:
            rate = min(100, int((ai_msgs_count / user_msgs_count) * 100))
            resolution = f"{rate}%"
            
        responseTime = "0s"
        
        leads = ChatMessage.objects.filter(agent=obj, status='pertinent').values('contact_info').distinct().count() or 0
        
        return {
            "conversations": str(convs),
            "resolution": resolution,
            "responseTime": responseTime,
            "leads": str(leads)
        }

    class Meta:
        model = Agent
        fields = [
            'id', 'name', 'avatar', 'description', 'role', 'system_prompt', 'llm_model',
            'temperature', 'channels', 'execution_mode', 'confidence_threshold',
            'whatsapp_config', 'email_config', 'linkedin_config', 'created_at', 'is_deployed', 'is_active',
            'user', 'owner_name', 'owner_email', 'knowledge_bases', 'messages', 'stats', 
            'team', 'team_name', 'team_color', 'is_team_agent'
        ]
        read_only_fields = ['user']

class AgentTeamSerializer(serializers.ModelSerializer):
    agents = AgentSerializer(many=True, read_only=True)
    links = AgentLinkSerializer(many=True, read_only=True)
    
    class Meta:
        model = AgentTeam
        fields = ['id', 'name', 'description', 'color', 'avatar', 'agents', 'links', 'created_at']
        read_only_fields = ['user', 'created_at']

class AgentFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = __import__('agents.models', fromlist=['AgentFeedback']).AgentFeedback
        fields = '__all__'
        read_only_fields = ['user', 'created_at']

class UserSurveySerializer(serializers.ModelSerializer):
    class Meta:
        model = __import__('agents.models', fromlist=['UserSurvey']).UserSurvey
        fields = '__all__'
        read_only_fields = ['user', 'created_at']

