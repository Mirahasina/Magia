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
    created_at = models.DateTimeField(auto_now_add=True)
    is_deployed = models.BooleanField(default=False)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='agents', null=True, blank=True)

    def __str__(self):
        return self.name

class KnowledgeBase(models.Model):
    agent = models.ForeignKey(Agent, related_name='knowledge_bases', on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=255)
    source_type = models.CharField(max_length=100)
    file_binary = models.BinaryField(null=True, blank=True)
    file_extension = models.CharField(max_length=20, blank=True)
    url = models.URLField(blank=True, null=True)
    raw_content = models.TextField(blank=True)
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

class ChatMessage(models.Model):
    agent = models.ForeignKey(Agent, related_name='messages', on_delete=models.CASCADE)
    sender = models.CharField(max_length=50)
    contact_info = models.CharField(max_length=255, blank=True, null=True)
    source = models.CharField(max_length=50, default='chat')
    content = models.TextField()
    is_whatsapp = models.BooleanField(default=False)
    whatsapp_message_id = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=50, default='new', choices=[('new', 'New'), ('pertinent', 'Pertinent'), ('archived', 'Archived')])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender}: {self.content[:20]}..."
