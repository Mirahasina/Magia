import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'magia_backend.settings')
django.setup()

from accounts.models import User

def promote_to_staff(email):
    try:
        user = User.objects.get(email=email)
        user.is_staff = True
        user.is_superuser = True
        user.is_email_verified = True
        user.save()
        print(f"User {email} has been promoted to Staff/Admin (and email verified).")
    except User.DoesNotExist:
        print(f"User with email {email} not found.")

def create_admin(email, password, first_name="Admin"):
    if User.objects.filter(email=email).exists():
        print(f"User {email} already exists. Use promote if needed.")
        return
    
    user = User.objects.create_superuser(
        email=email,
        password=password,
        first_name=first_name
    )
    user.is_email_verified = True
    user.save()
    print(f"Admin user {email} created successfully (and email verified).")

def auto_from_env():
    email = os.environ.get('ADMIN_INITIAL_EMAIL') or os.environ.get('ADMIN_PROMOTE_EMAIL')
    password = os.environ.get('ADMIN_INITIAL_PASSWORD', 'Admin123!')
    if email:
        if User.objects.filter(email=email).exists():
            promote_to_staff(email)
        else:
            create_admin(email, password)
    else:
        print("No ADMIN_INITIAL_EMAIL or ADMIN_PROMOTE_EMAIL env var found. Skipping auto admin creation.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        auto_from_env()
    else:
        command = sys.argv[1]
        if command == "auto":
            auto_from_env()
        elif command == "promote" and len(sys.argv) == 3:
            promote_to_staff(sys.argv[2])
        elif command == "create" and len(sys.argv) == 4:
            create_admin(sys.argv[2], sys.argv[3])
        else:
            print("Invalid arguments.")
