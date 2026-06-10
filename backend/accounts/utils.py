import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator

from magia_backend.settings_constants import FRONTEND_URL

logger = logging.getLogger(__name__)


def get_verification_link(user):
    if not FRONTEND_URL:
        raise RuntimeError("FRONTEND_URL must be set in the environment for verification emails.")

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{FRONTEND_URL}/verify-email?uid={uid}&token={token}"


def send_verification_email(user):
    verify_link = get_verification_link(user)
    subject = "Vérifiez votre compte MAGIA"
    html_content = render_to_string('emails/verification_email.html', {
        'first_name': user.first_name,
        'verify_link': verify_link,
    })
    text_content = f"Bonjour {user.first_name},\n\nVeuillez vérifier votre compte : {verify_link}"

    msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [user.email])
    msg.attach_alternative(html_content, "text/html")
    msg.send()
    logger.info('Verification email sent to %s', user.email)
    return verify_link
