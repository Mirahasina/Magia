from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
import uuid


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
    workspace_label = models.CharField(max_length=255, blank=True, default='Mon Workspace')
    timezone = models.CharField(max_length=100, default='Indian/Antananarivo')

    # Security fields
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
    card_last4 = models.CharField(max_length=4, blank=True, null=True)
    card_brand = models.CharField(max_length=20, blank=True, null=True)
    card_exp_month = models.CharField(max_length=2, blank=True, null=True)
    card_exp_year = models.CharField(max_length=2, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Abonnement'
        verbose_name_plural = 'Abonnements'

    def __str__(self):
        return f"{self.user.email} - {self.plan_name}"
