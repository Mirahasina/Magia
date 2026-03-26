from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView, MeView, 
    ChangePasswordView, ForgotPasswordView, ResetPasswordView,
    ContactRequestCreateView, SubscriptionView, SecurityView,
    VerifyEmailView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='auth_forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='auth_reset_password'),
    path('contact/', ContactRequestCreateView.as_view(), name='contact_request'),
    path('subscription/', SubscriptionView.as_view(), name='subscription'),
    path('security/', SecurityView.as_view(), name='security_status'),
    path('security/<str:action>/', SecurityView.as_view(), name='security_action'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
]
