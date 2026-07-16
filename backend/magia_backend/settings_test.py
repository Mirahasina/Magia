"""Settings used when running the automated test suite.

Inherits everything from the main settings module but forces an in-memory
SQLite database so tests do not require a running PostgreSQL server, and uses a
fast password hasher plus a local-memory email backend for speed/isolation.
"""

import os

# Must be set before importing the main settings (AppConfig.ready reads this).
os.environ['FOLLOWUP_SCHEDULER_ENABLED'] = 'false'

from .settings import *  # noqa: F401,F403

# Run tests against an isolated in-memory SQLite database.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Speed up tests: cheap password hashing.
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Capture emails in memory instead of sending them.
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Keep test runs deterministic and offline.
DEBUG = False
