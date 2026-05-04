from django.db import models
import uuid

class Template(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    vertical = models.CharField(max_length=100)
    default_role = models.CharField(max_length=255)
    default_channels = models.JSONField(default=list)
    default_autonomy = models.CharField(max_length=50, default='Auto 85%')
    estimated_time = models.IntegerField()

    def __str__(self):
        return self.name

class Agent(models.Model):
    EXECUTION_MODES = [
        ('suggest', 'Suggest'),
        ('auto', 'Auto (threshold)'),
        ('full_auto', 'Full Auto'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    avatar = models.URLField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    role = models.CharField(max_length=255)
    system_prompt = models.TextField()
    llm_model = models.CharField(max_length=100, default='GPT-4o')
    temperature = models.FloatField(default=0.7)
    channels = models.JSONField(default=list)
    execution_mode = models.CharField(max_length=50, choices=EXECUTION_MODES)
    confidence_threshold = models.IntegerField(default=85)
    whatsapp_config = models.ForeignKey('WhatsAppConfig', on_delete=models.SET_NULL, null=True, blank=True)
    email_config = models.ForeignKey('EmailConfig', on_delete=models.SET_NULL, null=True, blank=True)
    linkedin_config = models.ForeignKey('LinkedInConfig', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_deployed = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='agents', null=True, blank=True)
    team = models.ForeignKey('AgentTeam', on_delete=models.SET_NULL, null=True, blank=True, related_name='members')
    is_team_agent = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class AuditLog(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=255)
    details = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Journal d\'audit'
        verbose_name_plural = 'Journaux d\'audit'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.action}"

class KnowledgeBase(models.Model):
    agent = models.ForeignKey(Agent, related_name='knowledge_bases', on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=255)
    source_type = models.CharField(max_length=100)
    file_binary = models.BinaryField(null=True, blank=True)
    file_extension = models.CharField(max_length=20, blank=True)
    url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.agent.name if self.agent else 'Unlinked'})"

class WhatsAppConfig(models.Model):
    name = models.CharField(max_length=255, default="Default WhatsApp")
    is_connected = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    qr_code = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='whatsapp_configs', null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.phone_number if self.phone_number else 'No number'})"

class EmailConfig(models.Model):
    name = models.CharField(max_length=255, default="Default Email")
    is_active = models.BooleanField(default=False)
    email = models.EmailField(max_length=255, blank=True, null=True)
    imap_server = models.CharField(max_length=255, blank=True, null=True)
    smtp_server = models.CharField(max_length=255, blank=True, null=True)
    password = models.CharField(max_length=255, blank=True, null=True)
    oauth_token = models.TextField(blank=True, null=True)
    refresh_token = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='email_configs', null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.email})"

class LinkedInConfig(models.Model):
    name = models.CharField(max_length=255, default="Default LinkedIn")
    is_connected = models.BooleanField(default=False)
    api_key = models.CharField(max_length=255, blank=True, null=True, help_text="Clé API Proxycurl")
    unipile_account_id = models.CharField(max_length=255, blank=True, null=True, help_text="ID du compte Unipile")
    li_at_cookie = models.TextField(blank=True, null=True, help_text="LinkedIn Session Cookie (fallback)")
    is_messaging_active = models.BooleanField(default=False)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='linkedin_configs', null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.user.email if self.user else 'No user'})"

class ChatMessage(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='all_messages', null=True, blank=True)
    agent = models.ForeignKey(Agent, related_name='messages', on_delete=models.CASCADE, null=True, blank=True)
    sender = models.CharField(max_length=50)
    contact_info = models.CharField(max_length=255, null=True, blank=True)
    contact_name = models.CharField(max_length=255, null=True, blank=True)
    source = models.CharField(max_length=50, default='chat')
    content = models.TextField()
    is_whatsapp = models.BooleanField(default=False)
    whatsapp_message_id = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    status = models.CharField(max_length=50, default='new', choices=[('new', 'New'), ('pertinent', 'Pertinent'), ('archived', 'Archived')])
    email_config = models.ForeignKey(EmailConfig, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender}: {self.content[:20]}..."

class AgentFeedback(models.Model):
    RATINGS = [(1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5')]
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='feedbacks')
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    rating = models.IntegerField(choices=RATINGS, null=True, blank=True)
    is_thumbs_up = models.BooleanField(null=True, blank=True)
    comment = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback for {self.agent.name} by {self.user.email}"

class UserSurvey(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='surveys')
    nps_score = models.IntegerField(help_text="0-10 score")
    feedback = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"NPS {self.nps_score} from {self.user.email}"

class AgentTeam(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='agent_teams')
    color = models.CharField(max_length=20, default="#1e3a8a")
    avatar = models.URLField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class AgentLink(models.Model):
    TRIGGER_TYPES = [
        ('interest', 'Interest Detected'),
        ('email_requested', 'Email Requested'),
        ('whatsapp_requested', 'WhatsApp Requested'),
        ('manual', 'Manual Delegation'),
    ]
    source_agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='outgoing_links')
    target_agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='incoming_links')
    trigger_type = models.CharField(max_length=50, choices=TRIGGER_TYPES)
    description = models.TextField(blank=True, null=True)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='agent_links', null=True, blank=True)

    def __str__(self):
        return f"{self.source_agent.name} -> {self.target_agent.name} ({self.trigger_type})"

class ContactAssignment(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='contact_assignments')
    contact_info = models.CharField(max_length=255)
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE)
    last_interaction = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'contact_info')

    def __str__(self):
        return f"{self.contact_info} assigned to {self.agent.name}"

class Contact(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='contacts')
    source = models.CharField(max_length=50)
    contact_info = models.CharField(max_length=255) 
    name = models.CharField(max_length=255, null=True, blank=True)
    avatar = models.URLField(null=True, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    is_blocked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'source', 'contact_info')

    def __str__(self):
        return f"{self.name or self.contact_info} ({self.source})"
