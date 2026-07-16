import logging

from rest_framework import authentication
from .models import User

logger = logging.getLogger(__name__)


class MasterAPIKeyAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None

        token = parts[1]
        if not token or not token.startswith('wk_live_'):
            return None

        try:
            user = User.objects.get(master_api_key=token)
            logger.debug("Master API key authenticated user: %s", user.email)
            return (user, None)
        except User.DoesNotExist:
            logger.debug("No user found for provided master API key")
            # Important: return None instead of raising, to allow AllowAny to work
            # and to let other authenticators (like JWT) try if they haven't yet.
            return None
