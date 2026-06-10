from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from accounts.utils import send_verification_email
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class Command(BaseCommand):
    help = 'Resend the verification email to all unverified active users.'

    def handle(self, *args, **options):
        users = User.objects.filter(is_email_verified=False, is_active=True, is_staff=False)
        total = users.count()
        sent = 0
        errors = 0

        for user in users:
            try:
                send_verification_email(user)
                sent += 1
                self.stdout.write(self.style.SUCCESS(f'Email envoyé à {user.email}'))
            except Exception as exc:
                errors += 1
                self.stderr.write(self.style.ERROR(f'Erreur pour {user.email} : {exc}'))
                logger.exception('Failed to resend verification email for %s', user.email)

        self.stdout.write(self.style.SUCCESS(f'Verification emails resent: {sent}/{total} sent, {errors} errors.'))
