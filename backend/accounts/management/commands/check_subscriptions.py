from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from accounts.models import Subscription, Notification
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Check expiring subscriptions, send alerts, and downgrade expired ones.'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        subscriptions = Subscription.objects.exclude(plan_name='gratuit').filter(active_until__isnull=False)

        for sub in subscriptions:
            user = sub.user
            days_remaining = (sub.active_until - now).days

            # Downgrade if expired (days_remaining < 0 means it passed active_until)
            if sub.active_until <= now:
                self.downgrade_subscription(sub, user)
                continue

            # Check for exact 7 days, 3 days, and 0 days (meaning < 24h)
            if days_remaining == 7:
                self.send_expiration_alert(user, sub, 7)
            elif days_remaining == 3:
                self.send_expiration_alert(user, sub, 3)
            elif days_remaining == 0:
                self.send_expiration_alert(user, sub, 0)

        self.stdout.write(self.style.SUCCESS('Successfully checked subscriptions.'))

    def send_expiration_alert(self, user, sub, days):
        plan_display = sub.plan_name.upper()
        
        if days == 0:
            title = f"Votre abonnement {plan_display} expire aujourd'hui"
            message_text = f"Bonjour {user.first_name},\n\nVotre abonnement MAGIA {plan_display} expire aujourd'hui. Veuillez renouveler votre abonnement pour continuer à profiter de toutes vos fonctionnalités.\n\nCordialement,\nL'équipe MAGIA"
        else:
            title = f"Votre abonnement {plan_display} expire dans {days} jours"
            message_text = f"Bonjour {user.first_name},\n\nVotre abonnement MAGIA {plan_display} expire dans {days} jours. N'oubliez pas de le renouveler depuis l'interface de facturation pour éviter toute interruption.\n\nCordialement,\nL'équipe MAGIA"

        # Create internal notification
        Notification.objects.create(
            user=user,
            title=title,
            message=message_text,
            type='alert'
        )

        # Send email
        formatted_message = message_text.replace('\n', '<br>')
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #312e81;">{title}</h2>
            <p>Bonjour {user.first_name},</p>
            <p>{formatted_message}</p>
        </div>
        """
        
        try:
            msg = EmailMultiAlternatives(title, message_text, settings.DEFAULT_FROM_EMAIL, [user.email])
            msg.attach_alternative(html_content, "text/html")
            msg.send()
        except Exception as exc:
            logger.error('Erreur lors de l\'envoi de l\'email d\'alerte: %s', exc)


    def downgrade_subscription(self, sub, user):
        old_plan = sub.plan_name.upper()
        
        # Downgrade logic: Keep the user's data, just change the plan and limits
        sub.plan_name = 'gratuit'
        sub.status = 'expired'
        # Keep num_agents to 2 (gratuit limit) or we can leave it as is, but Gratuit limits apply. 
        # Actually it's safer to just set num_agents to 2 to reflect the new state.
        sub.num_agents = 2
        sub.save()

        title = f"Votre abonnement {old_plan} a expiré"
        message_text = f"Bonjour {user.first_name},\n\nVotre abonnement MAGIA {old_plan} est arrivé à expiration. Votre compte a été automatiquement basculé vers le plan GRATUIT.\n\nRassurez-vous, vous ne perdez pas votre historique ni vos agents existants, mais vous ne pourrez plus utiliser certaines fonctionnalités avancées ni créer de nouveaux agents au-delà de la limite gratuite.\n\nVous pouvez réactiver votre abonnement à tout moment depuis la rubrique Facturation.\n\nCordialement,\nL'équipe MAGIA"

        Notification.objects.create(
            user=user,
            title=title,
            message=message_text,
            type='alert'
        )

        formatted_message = message_text.replace('\n', '<br>')
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #312e81;">{title}</h2>
            <p>Bonjour {user.first_name},</p>
            <p>{formatted_message}</p>
        </div>
        """
        
        try:
            msg = EmailMultiAlternatives(title, message_text, settings.DEFAULT_FROM_EMAIL, [user.email])
            msg.attach_alternative(html_content, "text/html")
            msg.send()
        except Exception as exc:
            logger.error('Erreur lors de l\'envoi de l\'email de downgrade: %s', exc)

