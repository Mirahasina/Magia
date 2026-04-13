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

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python manage_admins.py promote <email>")
        print("  python manage_admins.py create <email> <password>")
        sys.exit(1)
    
    command = sys.argv[1]
    if command == "promote" and len(sys.argv) == 3:
        promote_to_staff(sys.argv[2])
    elif command == "create" and len(sys.argv) == 4:
        create_admin(sys.argv[2], sys.argv[3])
    else:
        print("Invalid arguments.")
