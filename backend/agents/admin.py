from django.contrib import admin
from .models import Template, Agent, KnowledgeBase, WhatsAppConfig, EmailConfig, ChatMessage, AgentFeedback, UserSurvey, AgentTeam, AgentLink, ContactAssignment, AuditLog

@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'vertical', 'default_autonomy']

@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ['name', 'role', 'llm_model', 'is_deployed', 'is_team_agent', 'user']
    list_filter = ['is_deployed', 'is_team_agent', 'llm_model']
    search_fields = ['name', 'role', 'user__email']

@admin.register(KnowledgeBase)
class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display = ['name', 'agent', 'source_type', 'created_at']

@admin.register(AgentTeam)
class AgentTeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'created_at']
    search_fields = ['name', 'user__email']

@admin.register(AgentLink)
class AgentLinkAdmin(admin.ModelAdmin):
    list_display = ['source_agent', 'target_agent', 'trigger_type']

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'action']

admin.site.register(WhatsAppConfig)
admin.site.register(EmailConfig)
admin.site.register(ChatMessage)
admin.site.register(AgentFeedback)
admin.site.register(UserSurvey)
admin.site.register(ContactAssignment)
