from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from accounts.models import Subscription, Notification, PLAN_LIMITS
from django.core.management import call_command
from django.core import mail

User = get_user_model()

class SubscriptionCheckTestCase(TestCase):
    def setUp(self):
        # Create users
        self.user_expired = User.objects.create_user(
            email='expired@example.com',
            password='testpassword123',
            first_name='Expired',
            last_name='User'
        )
        self.user_7days = User.objects.create_user(
            email='warn7@example.com',
            password='testpassword123',
            first_name='Warn7',
            last_name='User'
        )
        self.user_3days = User.objects.create_user(
            email='warn3@example.com',
            password='testpassword123',
            first_name='Warn3',
            last_name='User'
        )
        self.user_0days = User.objects.create_user(
            email='warn0@example.com',
            password='testpassword123',
            first_name='Warn0',
            last_name='User'
        )
        self.user_active = User.objects.create_user(
            email='active@example.com',
            password='testpassword123',
            first_name='Active',
            last_name='User'
        )

        now = timezone.now()

        # Expired: active_until was 1 hour ago
        self.sub_expired = Subscription.objects.create(
            user=self.user_expired,
            plan_name='pro',
            num_agents=5,
            status='active',
            active_until=now - timedelta(hours=1)
        )

        # Expiring in 7 days
        self.sub_7days = Subscription.objects.create(
            user=self.user_7days,
            plan_name='pro',
            num_agents=3,
            status='active',
            active_until=now + timedelta(days=7, minutes=5) # use timezone math that matches .days == 7
        )

        # Expiring in 3 days
        self.sub_3days = Subscription.objects.create(
            user=self.user_3days,
            plan_name='pro',
            num_agents=3,
            status='active',
            active_until=now + timedelta(days=3, minutes=5)
        )

        # Expiring in 0 days (e.g. 5 hours from now)
        self.sub_0days = Subscription.objects.create(
            user=self.user_0days,
            plan_name='entreprise',
            num_agents=10,
            status='active',
            active_until=now + timedelta(hours=5)
        )

        # Active long term
        self.sub_active = Subscription.objects.create(
            user=self.user_active,
            plan_name='pro',
            num_agents=3,
            status='active',
            active_until=now + timedelta(days=30)
        )

    def test_check_subscriptions_command(self):
        # Run command
        call_command('check_subscriptions')

        # 1. Expired subscription checks
        self.sub_expired.refresh_from_db()
        self.assertEqual(self.sub_expired.plan_name, 'gratuit')
        self.assertEqual(self.sub_expired.status, 'expired')
        self.assertEqual(self.sub_expired.num_agents, 2)

        # Verify expired user notification
        notif_expired = Notification.objects.filter(user=self.user_expired, type='alert').first()
        self.assertIsNotNone(notif_expired)
        self.assertIn("a expiré", notif_expired.title)

        # 2. Alerts checks (7 days)
        notif_7d = Notification.objects.filter(user=self.user_7days, type='alert').first()
        self.assertIsNotNone(notif_7d)
        self.assertIn("dans 7 jours", notif_7d.title)

        # 3. Alerts checks (3 days)
        notif_3d = Notification.objects.filter(user=self.user_3days, type='alert').first()
        self.assertIsNotNone(notif_3d)
        self.assertIn("dans 3 jours", notif_3d.title)

        # 4. Alerts checks (0 days)
        notif_0d = Notification.objects.filter(user=self.user_0days, type='alert').first()
        self.assertIsNotNone(notif_0d)
        self.assertIn("aujourd'hui", notif_0d.title)

        # 5. Active sub checks (no warnings, no downgrade)
        self.sub_active.refresh_from_db()
        self.assertEqual(self.sub_active.plan_name, 'pro')
        self.assertEqual(self.sub_active.status, 'active')
        notif_active = Notification.objects.filter(user=self.user_active, type='alert').first()
        self.assertIsNone(notif_active)

        # Verify emails were sent (1 for expired + 3 warnings = 4 emails)
        self.assertEqual(len(mail.outbox), 4)
