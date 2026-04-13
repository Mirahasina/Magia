from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .models import User, ContactRequest, Subscription, WorkspaceMember, WorkspaceInvitation, Notification, PLAN_LIMITS
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
from django.utils import timezone
import requests
import uuid
from .serializers import NotificationSerializer
# Combine with line 8 imports
from agents.models import Agent
from agents.serializers import UserSurveySerializer
from agents.models import ChatMessage



def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(APIView):
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
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            email = request.data.get('email')
            if email:
                try:
                    user_obj = User.objects.get(email=email)
                    Notification.objects.create(
                        user=user_obj,
                        title="Alerte Sécurité",
                        message="Tentative de connexion échouée (mot de passe invalide).",
                        type="alert"
                    )
                except User.DoesNotExist:
                    pass
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        
        if not user.is_email_verified and not user.is_staff:
            return Response({'error': 'Veuillez vérifier votre email avant de vous connecter.'}, status=status.HTTP_403_FORBIDDEN)

        tokens = get_tokens_for_user(user)

        return Response({
            'message': 'Connexion réussie.',
            'user': UserProfileSerializer(user, context={'request': request}).data,
            'tokens': tokens,
        }, status=status.HTTP_200_OK)


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_login'

    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            return Response({'error': 'Le token Google est requis.'}, status=status.HTTP_400_BAD_REQUEST)

        response = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )

        if response.status_code != 200:
            return Response({'error': 'Token Google invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        user_info = response.json()
        email = user_info.get('email')
        
        if not email:
            return Response({'error': 'Email introuvable via Google.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            if not user.is_email_verified:
                user.is_email_verified = True
                user.save()
        except User.DoesNotExist:
            user = User.objects.create_user(
                email=email,
                first_name=user_info.get('given_name', ''),
                last_name=user_info.get('family_name', '')
            )
            user.is_email_verified = True
            user.save()
            Subscription.objects.get_or_create(user=user, defaults={'plan_name': 'gratuit'})

        tokens = get_tokens_for_user(user)

        return Response({
            'message': 'Connexion Google réussie.',
            'user': UserProfileSerializer(user, context={'request': request}).data,
            'tokens': tokens,
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
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
        user = request.user
        user.delete()
        return Response({'message': 'Compte supprimé avec succès.'}, status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
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
            serializer.save()
            
            if request.data.get('plan_name') == 'entreprise':
                subject = "Nouvelle demande MAGIA Enterprise"
                html_content = render_to_string('emails/enterprise_email.html', {
                    'first_name': request.user.first_name,
                    'last_name': request.user.last_name,
                    'email': request.user.email,
                    'company': request.user.company,
                    'current_plan': subscription.plan_name
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

class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')[:20]
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)

    def post(self, request):
        notif_id = request.data.get('id')
        if notif_id:
            Notification.objects.filter(user=request.user, id=notif_id).update(is_read=True)
        else:
            Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'Notifications marquées comme lues.'})


class PlanLimitsView(APIView):
    """GET /api/auth/plan-limits/ — retourne les limites du plan actuel et l'usage."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            subscription = user.subscription
            plan = subscription.plan_name
            num_agents_choice = subscription.num_agents
        except Exception:
            plan = 'gratuit'
            num_agents_choice = 2

        limits = PLAN_LIMITS.get(plan, PLAN_LIMITS['gratuit']).copy()
        
        if plan == 'pro':
            limits['max_agents'] = num_agents_choice
            limits['max_members'] = num_agents_choice * 2
            limits['max_credits'] = num_agents_choice * 1000
        elif plan == 'gratuit':
            limits['max_credits'] = 500
        else:
            limits['max_credits'] = None

        agent_count = Agent.objects.filter(user=user).count()
        member_count = WorkspaceMember.objects.filter(workspace_owner=user).count()

        credit_usage = ChatMessage.objects.filter(user=user, sender='ai').count()

        return Response({
            'plan': plan,
            'limits': limits,
            'usage': {
                'agents': agent_count,
                'members': member_count,
                'credits': credit_usage,
            }
        })



class InviteMemberView(APIView):
    """POST /api/auth/invite/ — envoyer une invitation."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import PLAN_LIMITS, WorkspaceInvitation
        from django.utils import timezone
        import datetime

        user = request.user
        try:
            plan = user.subscription.plan_name
        except Exception:
            plan = 'gratuit'

        limits = PLAN_LIMITS.get(plan, PLAN_LIMITS['gratuit'])
        max_members = limits['max_members']

        if max_members == 0:
            return Response({'error': "Votre plan Gratuit ne permet pas d'inviter des membres."}, status=status.HTTP_403_FORBIDDEN)

        current_members = WorkspaceMember.objects.filter(workspace_owner=user).count()
        if max_members is not None and current_members >= max_members:
            return Response({'error': f"Limite atteinte : votre plan {plan} permet {max_members} membre(s) maximum."}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email', '').strip().lower()
        role = request.data.get('role', 'viewer')

        if not email:
            return Response({'error': "L'email est requis."}, status=status.HTTP_400_BAD_REQUEST)
        if role not in ('viewer', 'editor'):
            return Response({'error': "Rôle invalide."}, status=status.HTTP_400_BAD_REQUEST)
        if email == user.email:
            return Response({'error': "Vous ne pouvez pas vous inviter vous-même."}, status=status.HTTP_400_BAD_REQUEST)

        # Cancel previous pending invitations for this email
        WorkspaceInvitation.objects.filter(workspace_owner=user, invited_email=email, is_used=False).delete()

        expiry = timezone.now() + datetime.timedelta(days=7)
        invitation = WorkspaceInvitation.objects.create(
            workspace_owner=user,
            invited_email=email,
            role=role,
            expires_at=expiry
        )

        accept_url = f"http://localhost:5173/accept-invitation?token={invitation.token}"

        # Send email
        try:
            from django.core.mail import EmailMultiAlternatives
            subject = f"{user.full_name} vous invite à rejoindre son workspace MAGIA"
            text_content = f"Bonjour,\n\nVous avez été invité(e) par {user.full_name} à rejoindre son espace MAGIA en tant que {role}.\n\nCliquez ici pour accepter : {accept_url}\n\nCe lien expire dans 7 jours."
            html_content = f"""<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                <h2 style="color:#1e1b4b">Invitation MAGIA</h2>
                <p><strong>{user.full_name}</strong> vous invite à rejoindre son espace de travail en tant que <strong>{"Lecteur" if role == "viewer" else "Éditeur"}</strong>.</p>
                <div style="text-align:center;margin:30px 0">
                    <a href="{accept_url}" style="background:#1e1b4b;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold">Accepter l'invitation</a>
                </div>
                <p style="font-size:12px;color:#9ca3af">Ce lien expire dans 7 jours.</p>
            </div>"""
            msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [email])
            msg.attach_alternative(html_content, "text/html")
            msg.send()
        except Exception as e:
            print(f"Error sending invitation email: {e}")

        return Response({
            'message': f"Invitation envoyée à {email}.",
            'invitation_url': accept_url,  # for debug
            'token': str(invitation.token)
        }, status=status.HTTP_201_CREATED)


class CheckInvitationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        token = request.query_params.get('token')
        if not token:
            return Response({'error': "Token requis."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            invitation = WorkspaceInvitation.objects.get(token=token, is_used=False)
        except (WorkspaceInvitation.DoesNotExist, ValueError):
            return Response({'error': "Invitation invalide ou déjà utilisée."}, status=status.HTTP_404_NOT_FOUND)
        
        if invitation.is_expired():
            return Response({'error': "L'invitation a expiré."}, status=status.HTTP_400_BAD_REQUEST)
            
        user_exists = User.objects.filter(email=invitation.invited_email).exists()
        
        return Response({
            'email': invitation.invited_email,
            'exists': user_exists,
            'workspace_owner': invitation.workspace_owner.full_name,
            'role': invitation.role
        })

class AcceptInvitationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': "Token requis."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            invitation = WorkspaceInvitation.objects.get(token=token, is_used=False)
        except (WorkspaceInvitation.DoesNotExist, ValueError):
            return Response({'error': "Invitation invalide ou déjà utilisée."}, status=status.HTTP_404_NOT_FOUND)
            
        if invitation.is_expired():
            return Response({'error': "L'invitation a expiré."}, status=status.HTTP_400_BAD_REQUEST)
            
        if invitation.invited_email != request.user.email:
            return Response({'error': f"Cette invitation est destinée à {invitation.invited_email}, mais vous êtes connecté en tant que {request.user.email}."}, status=status.HTTP_403_FORBIDDEN)
            
        # Create membership
        membership, created = WorkspaceMember.objects.get_or_create(
            workspace_owner=invitation.workspace_owner,
            member_email=invitation.invited_email,
            defaults={'role': invitation.role, 'member_user': request.user}
        )
        
        if not created:
            membership.member_user = request.user
            membership.role = invitation.role
            membership.save()
            
        invitation.is_used = True
        invitation.save()
        
        return Response({
            'message': f"Bienvenue dans le workspace de {invitation.workspace_owner.full_name} !",
            'role': invitation.role,
            'workspace_owner': invitation.workspace_owner.email
        })


class WorkspaceMembersView(APIView):
    """GET/DELETE /api/auth/members/ — gérer les membres du workspace."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        staff = WorkspaceMember.objects.filter(workspace_owner=request.user).order_by('joined_at')
        staff_data = [{
            'id': str(m.id),
            'email': m.member_email,
            'role': m.role,
            'joined_at': m.joined_at,
            'has_account': m.member_user is not None,
            'name': m.member_user.full_name if m.member_user else m.member_email,
        } for m in staff]
        
        memberships = WorkspaceMember.objects.filter(member_user=request.user).order_by('joined_at')
        membership_data = [{
            'id': str(m.id),
            'owner_email': m.workspace_owner.email,
            'owner_name': m.workspace_owner.full_name,
            'role': m.role,
            'joined_at': m.joined_at,
        } for m in memberships]

        # Teammates: all members of workspaces I have joined
        teams_data = []
        for membership in memberships:
            teammates = WorkspaceMember.objects.filter(workspace_owner=membership.workspace_owner).exclude(member_user=request.user)
            teammates_list = [{
                'email': t.member_email,
                'name': t.member_user.full_name if t.member_user else t.member_email,
                'role': t.role,
                'joined_at': t.joined_at,
            } for t in teammates]
            
            teams_data.append({
                'workspace_owner_name': membership.workspace_owner.full_name,
                'workspace_owner_email': membership.workspace_owner.email,
                'teammates': teammates_list
            })

        return Response({
            'my_members': staff_data,
            'my_memberships': membership_data,
            'my_teams': teams_data
        })

class UserSurveyView(APIView):
    """POST /api/auth/survey/ — soumettre un score NPS."""
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = UserSurveySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    def delete(self, request):
        member_id = request.data.get('id')
        if not member_id:
            return Response({'error': 'ID requis.'}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = WorkspaceMember.objects.filter(id=member_id, workspace_owner=request.user).delete()
        if deleted:
            return Response({'message': 'Membre retiré avec succès.'})
        return Response({'error': 'Membre non trouvé.'}, status=status.HTTP_404_NOT_FOUND)

