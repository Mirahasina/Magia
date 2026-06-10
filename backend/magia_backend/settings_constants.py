import os

# Frontend origin for email links and OAuth redirects
DJANGO_ENV = os.environ.get('DJANGO_ENV', 'development')
FRONTEND_URL = os.environ.get('FRONTEND_URL')
if DJANGO_ENV == 'production' and not FRONTEND_URL:
    raise RuntimeError('FRONTEND_URL must be defined in production for verification email links.')
FRONTEND_URL = FRONTEND_URL or 'http://localhost:5173'
