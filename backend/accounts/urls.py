from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, GoogleLoginView, LogoutView, MeView,
    ChangePasswordView, ForgotPasswordView, ResetPasswordView,
    ContactRequestCreateView, SubscriptionView, SecurityView,
    VerifyEmailView, ResendVerificationEmailView, NotificationListView, CompleteOnboardingView,
    PlanLimitsView, InviteMemberView, CheckInvitationView, AcceptInvitationView, WorkspaceMembersView,
    UserSurveyView,
)

from .payment_views import (
    CreateCheckoutIntentView, StripeWebhookView,
    SendPaymentOTPView, ConfirmSavedCardPaymentView, TransactionListView,
    DownloadInvoiceView, DownloadFullHistoryView,
    CreatePaymentIntentView, ConfirmCardPaymentView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),
    path('google/', GoogleLoginView.as_view(), name='auth_google'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('complete_onboarding/', CompleteOnboardingView.as_view(), name='auth_complete_onboarding'),
    path('change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='auth_forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='auth_reset_password'),
    path('contact/', ContactRequestCreateView.as_view(), name='contact_request'),
    path('subscription/', SubscriptionView.as_view(), name='subscription'),
    path('security/', SecurityView.as_view(), name='security_status'),
    path('security/<str:action>/', SecurityView.as_view(), name='security_action'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('resend-verification/', ResendVerificationEmailView.as_view(), name='resend_verification'),
    path('notifications/', NotificationListView.as_view(), name='notifications'),
    path('plan-limits/', PlanLimitsView.as_view(), name='plan_limits'),
    path('invite/', InviteMemberView.as_view(), name='invite_member'),
    path('invite/check/', CheckInvitationView.as_view(), name='check_invitation'),
    path('invite/accept/', AcceptInvitationView.as_view(), name='accept_invitation'),
    path('members/', WorkspaceMembersView.as_view(), name='workspace_members'),
    path('survey/', UserSurveyView.as_view(), name='user_survey'),
    path('check-invitation/', CheckInvitationView.as_view(), name='auth_check_invitation'),
    path('payments/checkout-intent/', CreateCheckoutIntentView.as_view(), name='payment_checkout_intent'),
    path('payments/send-otp/', SendPaymentOTPView.as_view(), name='payment_send_otp'),
    path('payments/confirm-saved/', ConfirmSavedCardPaymentView.as_view(), name='payment_confirm_saved'),
    path('payments/webhook/stripe/', StripeWebhookView.as_view(), name='payment_stripe_webhook'),
    path('payments/transactions/', TransactionListView.as_view(), name='payment_transactions_list'),
    path('payments/transactions/<uuid:transaction_id>/download/', DownloadInvoiceView.as_view(), name='payment_invoice_download'),
    path('payments/transactions/download-history/', DownloadFullHistoryView.as_view(), name='payment_history_download'),
    path('payments/create-payment-intent/', CreatePaymentIntentView.as_view(), name='payment_create_intent'),
    path('payments/confirm-card-payment/', ConfirmCardPaymentView.as_view(), name='payment_confirm_card'),
]
