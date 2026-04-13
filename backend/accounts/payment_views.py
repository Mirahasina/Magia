import uuid
import json
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import PaymentTransaction, Subscription
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import random
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings

class CreateCheckoutIntentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_name = request.data.get('plan_name', 'pro')
        num_agents = int(request.data.get('num_agents', 2))
        gateway = request.data.get('gateway', 'stripe')
        
        amount = num_agents * 15 if plan_name != 'entreprise' else 99
        
        transaction = PaymentTransaction.objects.create(
            user=request.user,
            subscription=getattr(request.user, 'subscription', None),
            amount=amount,
            gateway=gateway,
            status='pending'
        )

        if gateway == 'card' or gateway == 'stripe':
            import stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
            
            try:
                checkout_session = stripe.checkout.Session.create(
                    payment_method_types=['card'],
                    line_items=[
                        {
                            'price_data': {
                                'currency': 'eur',
                                'unit_amount': amount * 100,
                                'product_data': {
                                    'name': f'Licence MAGIA {plan_name.capitalize()}',
                                    'description': f'Pour {num_agents} agents',
                                },
                            },
                            'quantity': 1,
                        },
                    ],
                    mode='payment',
                    success_url=f"http://localhost:5173/dashboard?payment_success=true&transaction_id={transaction.id}",
                    cancel_url=f"http://localhost:5173/dashboard?payment_cancelled=true",
                    client_reference_id=str(transaction.id),
                )
                
                return Response({
                    'checkout_url': checkout_session.url, 
                    'transaction_id': transaction.id,
                })
            except Exception as e:
                return Response({'error': str(e)}, status=400)
        return Response({'error': 'Interface de paiement non supportée.'}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            payload = request.data
            event_type = payload.get('type')
            
            if event_type == 'checkout.session.completed':
                session = payload.get('data', {}).get('object', {})
                client_reference_id = session.get('client_reference_id')
                
                if client_reference_id:
                    transaction = PaymentTransaction.objects.filter(id=client_reference_id).first()
                    if transaction:
                        transaction.status = 'completed'
                        transaction.gateway_transaction_id = session.get('payment_intent')
                        transaction.save()

                        sub = transaction.subscription
                        if sub:
                            if transaction.amount == 99:
                                sub.plan_name = 'entreprise'
                            else:
                                purchased_agents = int(transaction.amount / 15) if transaction.amount else 2
                                if sub.plan_name == 'pro':
                                    sub.num_agents += purchased_agents
                                else:
                                    sub.plan_name = 'pro'
                                    sub.num_agents = purchased_agents
                            sub.status = 'active'
                            sub.gateway_customer_id = session.get('customer')
                            sub.save()
            return Response({'status': 'success'}, status=200)
        except Exception as e:
            return Response({'error': str(e)}, status=400)





class SendPaymentOTPView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        user = request.user
        
        code = str(random.randint(100000, 999999))
        cache_key = f"payment_otp_{user.id}"
        
        cache.set(cache_key, code, timeout=600)
        print(f"\n========== CODE OTP MAGIA : {code} ==========\n")
        
        try:
            send_mail(
                "Code de validation de paiement MAGIA",
                f"Votre code temporaire pour valider votre mise à niveau / paiement est : {code}\nCe code est valable 10 minutes.",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            return Response({'message': 'Code envoyé avec succès'})
        except Exception as e:
            return Response({'error': "Impossible d'envoyer l'email."}, status=400)


class ConfirmSavedCardPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.core.cache import cache
        user = request.user
        
        password = request.data.get('password')
        otp = request.data.get('otp')
        plan_name = request.data.get('plan_name', 'pro')
        num_agents = int(request.data.get('num_agents', 2))
        
        if otp:
            cache_key = f"payment_otp_{user.id}"
            stored_otp = cache.get(cache_key)
            if not stored_otp or stored_otp != str(otp):
                return Response({'error': 'Code OTP invalide ou expiré.'}, status=400)
            cache.delete(cache_key)
        elif password:
            if not user.has_usable_password():
                return Response({'error': "Vous n'avez pas de mot de passe défini. Utilisez l'OTP."}, status=400)
            if not user.check_password(password):
                return Response({'error': 'Mot de passe incorrect.'}, status=400)
        else:
            return Response({'error': 'Mot de passe ou Code OTP requis.'}, status=400)

        amount = num_agents * 15 if plan_name != 'entreprise' else 99
        
        transaction = PaymentTransaction.objects.create(
            user=user,
            subscription=getattr(user, 'subscription', None),
            amount=amount,
            gateway='stripe_saved_card',
            status='completed'
        )
        
        sub = user.subscription
        if sub:
            if plan_name == 'entreprise':
                sub.plan_name = 'entreprise'
            else:
                if sub.plan_name == 'pro':
                    sub.num_agents += num_agents
                else:
                    sub.plan_name = 'pro'
                    sub.num_agents = num_agents
            sub.status = 'active'
            sub.save()
            
        return Response({'message': 'Paiement effectué avec la carte enregistrée.', 'transaction_id': transaction.id})

from rest_framework import generics
from .serializers import PaymentTransactionSerializer

class TransactionListView(generics.ListAPIView):
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentTransaction.objects.filter(user=self.request.user).order_by('-created_at')
