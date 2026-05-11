from rest_framework import viewsets, permissions, response
from rest_framework.decorators import action
from django.db.models import Count, Sum
from accounts.models import User, PaymentTransaction, Subscription, ContactRequest, Notification, EnterpriseRequest
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from agents.models import Agent, AuditLog
from django.utils import timezone
from datetime import timedelta

class AdminStatsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        from django.db.models.functions import TruncMonth
        
        total_users = User.objects.count()
        total_agents = Agent.objects.count()
        total_revenue = PaymentTransaction.objects.filter(status='completed').aggregate(total=Sum('amount'))['total'] or 0
        active_subscriptions = Subscription.objects.filter(status='active').count()

        last_30_days = timezone.now() - timedelta(days=30)
        recent_users = User.objects.filter(created_at__gte=last_30_days).count()
        recent_revenue = PaymentTransaction.objects.filter(
            status='completed', 
            created_at__gte=last_30_days
        ).aggregate(total=Sum('amount'))['total'] or 0

        revenue_data = PaymentTransaction.objects.filter(status='completed')\
            .annotate(month=TruncMonth('created_at'))\
            .values('month')\
            .annotate(total=Sum('amount'))\
            .order_by('month')
        
        user_data = User.objects.all()\
            .annotate(month=TruncMonth('created_at'))\
            .values('month')\
            .annotate(total=Count('id'))\
            .order_by('month')

        recent_logs = AuditLog.objects.all().order_by('-created_at')[:10]
        logs_data = [{
            'id': log.id,
            'user': log.user.email,
            'action': log.action,
            'details': log.details,
            'created_at': log.created_at
        } for log in recent_logs]

        pending_contacts = ContactRequest.objects.count()
        pending_enterprise = EnterpriseRequest.objects.filter(status='pending').count()

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
            'pending_contacts': pending_contacts,
            'pending_enterprise': pending_enterprise,
            'charts': {
                'revenue': [{'name': d['month'].strftime('%b'), 'value': float(d['total'])} for d in revenue_data],
                'users': [{'name': d['month'].strftime('%b'), 'value': d['total']} for d in user_data]
            }
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

    @action(detail=False, methods=['get'])
    def pending_requests(self, request):
        reqs = EnterpriseRequest.objects.filter(status='pending').order_by('-requested_at')
        data = [{
            'id': str(req.id),
            'subscription_id': req.user.subscription.id,
            'request_id': req.id,
            'user_email': req.user.email,
            'company': req.user.company,
            'requested_at': req.requested_at,
            'current_plan': req.user.subscription.plan_name,
            'status': 'En attente'
        } for req in reqs]
        return response.Response(data)

    @action(detail=False, methods=['get'])
    def enterprise_history(self, request):
        reqs = EnterpriseRequest.objects.exclude(status='pending').order_by('-processed_at')
        data = [{
            'id': str(req.id),
            'user_email': req.user.email,
            'status': req.status,
            'requested_at': req.requested_at,
            'processed_at': req.processed_at,
            'admin_notes': req.admin_notes
        } for req in reqs]
        return response.Response(data)

    @action(detail=False, methods=['get'])
    def contacts(self, request):
        contacts = ContactRequest.objects.all().order_by('-created_at')
        data = [{
            'id': contact.id,
            'name': contact.name,
            'email': contact.email,
            'company': contact.company,
            'message': contact.message,
            'created_at': contact.created_at,
            'status': 'Nouveau'
        } for contact in contacts]
        return response.Response(data)

    @action(detail=False, methods=['post'])
    def approve_enterprise(self, request):
        req_id = request.data.get('request_id')
        try:
            ent_req = EnterpriseRequest.objects.get(id=req_id)
            sub = ent_req.user.subscription
            sub.plan_name = 'entreprise'
            sub.enterprise_requested = False
            sub.status = 'active'
            sub.save()

            ent_req.status = 'approved'
            ent_req.processed_at = timezone.now()
            ent_req.save()

            # Notification in-app
            Notification.objects.create(
                user=sub.user,
                title="Mode Entreprise Activé",
                message="Votre demande pour le mode Entreprise a été approuvée. Bienvenue !",
                type="success"
            )

            # Audit Log
            AuditLog.objects.create(
                user=request.user,
                action="APPROVE_ENTERPRISE",
                details=f"Plan entreprise approuvé pour {sub.user.email}"
            )

            # Email notification
            subject = "Votre compte MAGIA est désormais en mode Entreprise !"
            html_content = render_to_string('emails/enterprise_approved.html', {
                'first_name': sub.user.first_name,
            })
            text_content = f"Félicitations {sub.user.first_name}, votre compte MAGIA est passé en mode Entreprise."
            
            try:
                msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [sub.user.email])
                msg.attach_alternative(html_content, "text/html")
                msg.send()
            except Exception:
                pass

            return response.Response({'message': 'Demande approuvée avec succès.'})
        except Subscription.DoesNotExist:
            return response.Response({'error': 'Abonnement introuvable.'}, status=404)

    @action(detail=False, methods=['post'])
    def reject_enterprise(self, request):
        req_id = request.data.get('request_id')
        try:
            ent_req = EnterpriseRequest.objects.get(id=req_id)
            sub = ent_req.user.subscription
            sub.enterprise_requested = False
            sub.save()
            
            ent_req.status = 'rejected'
            ent_req.processed_at = timezone.now()
            ent_req.save()

            AuditLog.objects.create(
                user=request.user,
                action="REJECT_ENTERPRISE",
                details=f"Plan entreprise rejeté pour {sub.user.email}"
            )
            
            return response.Response({'message': 'Demande rejetée.'})
        except EnterpriseRequest.DoesNotExist:
            return response.Response({'error': 'Demande introuvable.'}, status=404)

    @action(detail=False, methods=['post'])
    def refund_transaction(self, request):
        tx_id = request.data.get('transaction_id')
        try:
            tx = PaymentTransaction.objects.get(id=tx_id)
            tx.status = 'refunded'
            tx.save()
            
            AuditLog.objects.create(
                user=request.user,
                action="REFUND_TRANSACTION",
                details=f"Remboursement effectué pour la transaction {tx_id} ({tx.amount} {tx.currency})"
            )
            
            return response.Response({'message': 'Transaction remboursée.'})
        except PaymentTransaction.DoesNotExist:
            return response.Response({'error': 'Transaction introuvable.'}, status=404)

    @action(detail=False, methods=['post'])
    def send_global_notification(self, request):
        title = request.data.get('title')
        message = request.data.get('message')
        notif_type = request.data.get('type', 'system')
        
        if not title or not message:
            return response.Response({'error': 'Le titre et le message sont obligatoires.'}, status=400)
            
        users = User.objects.all()
        notifications = [
            Notification(
                user=user,
                title=title,
                message=message,
                type=notif_type
            ) for user in users
        ]
        Notification.objects.bulk_create(notifications)
        
        AuditLog.objects.create(
            user=request.user,
            action="SEND_GLOBAL_NOTIFICATION",
            details=f"  envoyée : {title}"
        )
        
        return response.Response({'message': f'Notification envoyée à {users.count()} utilisateurs.'})
