from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .models import User, ContactRequest, Subscription
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ContactRequestSerializer,
    SubscriptionSerializer,
)
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings


def get_tokens_for_user(user):
    """Génère la paire access/refresh JWT pour un utilisateur."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Corps : { email, password, password_confirm, first_name?, last_name?, company? }
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_register'

    def post(self, request):
        captcha_key = request.data.get('recaptcha_key')
        if not captcha_key:
            return Response({'error': 'reCAPTCHA verification failed.'}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        
        # Email Verification Flow
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_link = f"http://localhost:5173/verify-email?uid={uid}&token={token}"
        
        subject = "Vérifiez votre compte MAGIA"
        html_content = render_to_string('emails/verification_email.html', {
            'first_name': user.first_name,
            'verify_link': verify_link
        })
        text_content = f"Bonjour {user.first_name},\n\nVeuillez vérifier votre compte : {verify_link}"
        
        try:
            msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [user.email])
            msg.attach_alternative(html_content, "text/html")
            msg.send()
        except Exception as e:
            print(f"Error sending verification email: {e}")

        return Response({
            'message': 'Compte créé. Veuillez vérifier votre email pour l\'activer.',
            'user': UserProfileSerializer(user, context={'request': request}).data,
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    POST /api/auth/login/
    Corps : { email, password }
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        
        if not user.is_email_verified:
            return Response({'error': 'Veuillez vérifier votre email avant de vous connecter.'}, status=status.HTTP_403_FORBIDDEN)

        tokens = get_tokens_for_user(user)

        return Response({
            'message': 'Connexion réussie.',
            'user': UserProfileSerializer(user, context={'request': request}).data,
            'tokens': tokens,
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Corps : { refresh }   — blackliste le refresh token
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Le token refresh est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': 'Déconnexion réussie.'}, status=status.HTTP_200_OK)


class MeView(APIView):
    """
    GET  /api/auth/me/  — profil de l'utilisateur connecté
    PUT  /api/auth/me/  — mise à jour du profil
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        serializer = UserProfileSerializer(
            request.user, data=request.data, partial=True, context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request):
        """Suppression du compte utilisateur"""
        user = request.user
        user.delete()
        return Response({'message': 'Compte supprimé avec succès.'}, status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Corps : { old_password, new_password, new_password_confirm }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': 'Mot de passe actuel incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Mot de passe modifié avec succès.'})

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'message': 'Si cet email existe, un lien de réinitialisation a été envoyé.'}, status=status.HTTP_200_OK)
        
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        
        reset_link = f"http://localhost:5173/reset-password?uid={uid}&token={token}"
        
        subject = "Réinitialisation de votre mot de passe MAGIA"
        text_content = f"""Bonjour,

Nous avons reçu une demande de réinitialisation de votre mot de passe pour votre compte MAGIA.

Veuillez cliquer sur le lien ci-dessous pour créer un nouveau mot de passe :
{reset_link}

Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe restera inchangé.

Cordialement,
L'équipe MAGIA
"""
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #312e81;">Réinitialisation de mot de passe</h2>
            <p>Bonjour,</p>
            <p>Nous avons reçu une demande de réinitialisation de votre mot de passe pour votre espace <strong>MAGIA</strong>.</p>
            <p>Pour définir un nouveau mot de passe, veuillez cliquer sur le bouton ci-dessous :</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #312e81; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Réinitialiser mon mot de passe</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Ou copiez et collez ce lien dans votre navigateur :<br>
            <a href="{reset_link}" style="color: #4f46e5; word-break: break-all;">{reset_link}</a></p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #9ca3af;">Si vous n'avez pas demandé à réinitialiser votre mot de passe, vous pouvez ignorer cet email en toute sécurité. Votre compte reste protégé.</p>
            <p style="font-size: 12px; color: #9ca3af;">Cordialement,<br>L'équipe MAGIA</p>
        </div>
        """
        
        try:
            from django.core.mail import EmailMultiAlternatives
            msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [email])
            msg.attach_alternative(html_content, "text/html")
            msg.send()
        except Exception as e:
            print(f"Erreur lors de l'envoi de l'email: {e}")

        return Response({'message': 'Si cet email existe, un lien de réinitialisation a été envoyé.'}, status=status.HTTP_200_OK)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        uidb64 = serializer.validated_data['uidb64']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Votre mot de passe a été réinitialisé avec succès.'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Le lien de réinitialisation est invalide ou a expiré.'}, status=status.HTTP_400_BAD_REQUEST)


class ContactRequestCreateView(generics.CreateAPIView):
    queryset = ContactRequest.objects.all()
    serializer_class = ContactRequestSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        contact = serializer.save()
        
        # Envoyer un email à l'équipe MAGIA
        subject = f"Nouvelle demande de contact: {contact.name}"
        message = f"""
        Vous avez reçu une nouvelle demande de contact via le formulaire MAGIA.
        
        Nom: {contact.name}
        Email: {contact.email}
        Entreprise: {contact.company or 'Non renseignée'}
        
        Message:
        {contact.message}
        
        ---
        Date: {contact.created_at}
        """
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [settings.DEFAULT_FROM_EMAIL],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Erreur d'envoi d'email contact: {e}")


class SubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        subscription, created = Subscription.objects.get_or_create(user=request.user, defaults={'plan_name': 'gratuit'})
        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data)

    def post(self, request):
        password = request.data.get('password')
        
        if request.user.is_authenticated and password:
            if not request.user.check_password(password):
                return Response({'password': 'Mot de passe incorrect.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        subscription, created = Subscription.objects.get_or_create(user=request.user)
        serializer = SubscriptionSerializer(subscription, data=request.data, partial=True)
        if serializer.is_valid():
            # Envoi d'email professionnel pour demande entreprise
            subject = "Nouvelle demande MAGIA Enterprise"
            html_content = render_to_string('emails/enterprise_email.html', {
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'email': request.user.email,
                'company': request.user.company,
                'current_plan': request.user.subscription_type
            })
            text_content = f"Demande entreprise de {request.user.email}"
            
            try:
                msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [settings.ADMIN_EMAIL])
                msg.attach_alternative(html_content, "text/html")
                msg.send()
            except Exception as e:
                print(f"Error sending enterprise email: {e}")

            return Response(serializer.data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
            if default_token_generator.check_token(user, token):
                user.is_email_verified = True
                user.save()
                tokens = get_tokens_for_user(user)
                return Response({
                    'message': 'Email vérifié avec succès.',
                    'tokens': tokens,
                    'user': UserProfileSerializer(user, context={'request': request}).data
                })
            return Response({'error': 'Lien invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'Erreur lors de la vérification.'}, status=status.HTTP_400_BAD_REQUEST)
class SecurityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserProfileSerializer(user, context={'request': request})
        return Response({
            'master_api_key': serializer.data.get('master_api_key'),
            'is_2fa_enabled': user.is_2fa_enabled
        })

    def post(self, request, action=None):
        user = request.user
        if action == 'regenerate':
            new_key = user.generate_master_api_key()
            return Response({
                'message': 'Clé API régénérée avec succès.',
                'master_api_key': UserProfileSerializer(user).to_representation(user).get('master_api_key')
            })
        elif action == 'toggle-2fa':
            user.is_2fa_enabled = not user.is_2fa_enabled
            user.save()
            return Response({
                'message': f"2FA {'activé' if user.is_2fa_enabled else 'désactivé'} avec succès.",
                'is_2fa_enabled': user.is_2fa_enabled
            })
        return Response({'error': 'Action invalide.'}, status=status.HTTP_400_BAD_REQUEST)
