from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
import uuid
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email est obligatoire")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    company = models.CharField(max_length=255, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    recovery_email = models.EmailField(blank=True, null=True)
    workspace_label = models.CharField(max_length=255, blank=True, default='Mon espace de travail')
    timezone = models.CharField(max_length=100, default='Indian/Antananarivo')

    master_api_key = models.CharField(max_length=100, blank=True, null=True, unique=True)
    is_2fa_enabled = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['-created_at']

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

    def generate_master_api_key(self):
        import secrets
        prefix = "wk_live_"
        random_part = secrets.token_urlsafe(24)
        self.master_api_key = f"{prefix}{random_part}"
        self.save()
        return self.master_api_key


class ContactRequest(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    company = models.CharField(max_length=255, blank=True)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Demande de contact'
        verbose_name_plural = 'Demandes de contact'
        ordering = ['-created_at']

    def __str__(self):
        return f"Contact from {self.email}"


class Subscription(models.Model):
    PLAN_CHOICES = [
        ('gratuit', 'Gratuit'),
        ('pro', 'Pro'),
        ('entreprise', 'Entreprise'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan_name = models.CharField(max_length=50, choices=PLAN_CHOICES, default='gratuit')
    num_agents = models.PositiveIntegerField(default=2)
    is_annual = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default='active')
    active_until = models.DateTimeField(blank=True, null=True)

    gateway_customer_id = models.CharField(max_length=255, blank=True, null=True, help_text="ID client Stripe")
    gateway_subscription_id = models.CharField(max_length=255, blank=True, null=True, help_text="ID abonnement Stripe")

    card_last4 = models.CharField(max_length=4, blank=True, null=True)
    card_brand = models.CharField(max_length=20, blank=True, null=True)
    card_exp_month = models.CharField(max_length=2, blank=True, null=True)
    card_exp_year = models.CharField(max_length=2, blank=True, null=True)

    enterprise_requested = models.BooleanField(default=False)
    requested_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Abonnement'
        verbose_name_plural = 'Abonnements'

    def __str__(self):
        return f"{self.user.email} - {self.plan_name}"


class PaymentTransaction(models.Model):
    GATEWAY_CHOICES = [
        ('stripe', 'Stripe'),
    ]
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('completed', 'Complété'),
        ('failed', 'Échoué'),
        ('refunded', 'Remboursé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='EUR')
    gateway = models.CharField(max_length=20, choices=GATEWAY_CHOICES)
    gateway_transaction_id = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        old_status = None
        if not is_new:
            old_status = PaymentTransaction.objects.filter(pk=self.pk).values_list('status', flat=True).first()

        super().save(*args, **kwargs)

        if self.status == 'completed' and old_status != 'completed':
            self.apply_to_subscription()

    def apply_to_subscription(self):
        sub = self.subscription
        if not sub:
            return

        enterprise_threshold = 495000  
        agent_price = 75000          

        amount_val = float(self.amount)
        
        is_ariary = amount_val >= 1000
        
        if is_ariary:
            if amount_val >= enterprise_threshold:
                sub.plan_name = 'entreprise'
            else:
                purchased_agents = int(amount_val / agent_price)
                if sub.plan_name == 'pro':
                    sub.num_agents += max(purchased_agents, 1)
                else:
                    sub.plan_name = 'pro'
                    sub.num_agents = max(purchased_agents, 2)
        else:
            if amount_val >= 99:
                sub.plan_name = 'entreprise'
            else:
                purchased_agents = int(amount_val / 15)
                if sub.plan_name == 'pro':
                    sub.num_agents += max(purchased_agents, 1)
                else:
                    sub.plan_name = 'pro'
                    sub.num_agents = max(purchased_agents, 2)

        sub.status = 'active'
        
        from datetime import timedelta
        days_to_add = 365 if sub.is_annual else 30
        if sub.active_until and sub.active_until > timezone.now():
            sub.active_until = sub.active_until + timedelta(days=days_to_add)
        else:
            sub.active_until = timezone.now() + timedelta(days=days_to_add)
            
        sub.save()

        Notification.objects.create(
            user=self.user,
            title="Abonnement mis à jour",
            message=f"Votre paiement de {self.amount} {self.currency} a été validé. Votre plan est désormais : {sub.plan_name.upper()} ({sub.num_agents} agents).",
            type="payment"
        )

class EnterpriseRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enterprise_requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Demande Entreprise'
        verbose_name_plural = 'Demandes Entreprise'
        ordering = ['-requested_at']

    def __str__(self):
        return f"{self.user.email} - {self.status}"

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=50, default='system')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.type}] {self.title} - {self.user.email}"


PLAN_LIMITS = {
    'gratuit': {
        'max_agents': 2,
        'max_members': 0,
        'max_kb_per_agent': 2,
        'channels': ['email'],
        'boite_reception': False,
    },
    'pro': {
        'max_agents': 2,
        'max_members': 0,
        'max_kb_per_agent': 10,
        'channels': ['email', 'whatsapp'],
        'boite_reception': True,
    },

    'entreprise': {
        'max_agents': None,
        'max_members': None,
        'max_kb_per_agent': None,
        'channels': ['email', 'whatsapp', 'linkedin', 'facebook'],
        'boite_reception': True,
    },
}


class WorkspaceInvitation(models.Model):
    ROLE_CHOICES = [
        ('viewer', 'Lecteur'),
        ('editor', 'Éditeur'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace_owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    invited_email = models.EmailField()
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Invitation'
        verbose_name_plural = 'Invitations'
        ordering = ['-created_at']

    def __str__(self):
        return f"Invitation {self.invited_email} → {self.workspace_owner.email} ({self.role})"

    def is_expired(self):
        return timezone.now() > self.expires_at


class WorkspaceMember(models.Model):
    ROLE_CHOICES = [
        ('viewer', 'Lecteur'),
        ('editor', 'Éditeur'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace_owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='workspace_members')
    member_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='member_of', null=True, blank=True)
    member_email = models.EmailField()
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Membre du workspace'
        verbose_name_plural = 'Membres du workspace'
        unique_together = [('workspace_owner', 'member_email')]

    def __str__(self):
        return f"{self.member_email} dans workspace de {self.workspace_owner.email} ({self.role})"

