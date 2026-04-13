from rest_framework import viewsets, permissions, response
from rest_framework.decorators import action
from django.db.models import Count, Sum
from accounts.models import User, PaymentTransaction, Subscription, ContactRequest
from agents.models import Agent, AuditLog
from django.utils import timezone
from datetime import timedelta

class AdminStatsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        # Global KPIs
        total_users = User.objects.count()
        total_agents = Agent.objects.count()
        total_revenue = PaymentTransaction.objects.filter(status='completed').aggregate(total=Sum('amount'))['total'] or 0
        active_subscriptions = Subscription.objects.filter(status='active').count()

        # Growth (last 30 days)
        last_30_days = timezone.now() - timedelta(days=30)
        recent_users = User.objects.filter(created_at__gte=last_30_days).count()
        recent_revenue = PaymentTransaction.objects.filter(
            status='completed', 
            created_at__gte=last_30_days
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Recent activities
        recent_logs = AuditLog.objects.all().order_by('-created_at')[:10]
        logs_data = [{
            'id': log.id,
            'user': log.user.email,
            'action': log.action,
            'details': log.details,
            'created_at': log.created_at
        } for log in recent_logs]

        # Contact requests
        pending_contacts = ContactRequest.objects.count()

        return response.Response({
            'kpis': {
                'total_users': total_users,
                'total_agents': total_agents,
                'total_revenue': float(total_revenue),
                'active_subscriptions': active_subscriptions,
                'recent_users_30d': recent_users,
                'recent_revenue_30d': float(recent_revenue)
            },
            'recent_logs': logs_data,
            'pending_contacts': pending_contacts
        })

    @action(detail=False, methods=['get'])
    def users(self, request):
        users = User.objects.all().order_by('-created_at')
        data = [{
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
            'created_at': user.created_at,
            'plan': user.subscription.plan_name if hasattr(user, 'subscription') else 'gratuit'
        } for user in users]
        return response.Response(data)

    @action(detail=False, methods=['get'])
    def agents(self, request):
        agents = Agent.objects.all().order_by('-created_at')
        data = [{
            'id': str(agent.id),
            'name': agent.name,
            'owner': agent.user.email if agent.user else 'System',
            'is_deployed': agent.is_deployed,
            'created_at': agent.created_at,
            'llm_model': agent.llm_model
        } for agent in agents]
        return response.Response(data)

    @action(detail=False, methods=['get'])
    def transactions(self, request):
        ts = PaymentTransaction.objects.all().order_by('-created_at')[:50]
        data = [{
            'id': str(t.id),
            'user': t.user.email,
            'amount': float(t.amount),
            'currency': t.currency,
            'gateway': t.gateway,
            'status': t.status,
            'created_at': t.created_at
        } for t in ts]
        return response.Response(data)
