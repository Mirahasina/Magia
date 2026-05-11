import requests
import os
import environ
from datetime import datetime, timedelta

# Load .env
env = environ.Env()
environ.Env.read_env('/home/mirahasina/MAGIA/Magia/backend/.env')

api_key = env('UNIPILE_API_KEY')
dsn = env('UNIPILE_DSN')

headers = {
    'X-API-KEY': api_key,
    'accept': 'application/json'
}

def final_verify():
    url = f"{dsn}/api/v1/hosted/accounts/link"
    expires_on = (datetime.utcnow() + timedelta(days=1)).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    
    payload = {
        "type": "create",
        "providers": ["LINKEDIN"],
        "api_url": dsn,
        "expiresOn": expires_on,
        "name": "Final_Verify",
        "success_redirect_url": "http://localhost:5173/success",
        "failure_redirect_url": "http://localhost:5173/failure"
    }
    
    print(f"Key: {api_key[:10]}...")
    res = requests.post(url, headers=headers, json=payload)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text[:100]}...")

if __name__ == "__main__":
    final_verify()
