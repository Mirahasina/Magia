import os
import environ
from google import genai

env = environ.Env()
environ.Env.read_env(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

gemini_key = env('GEMINI_API_KEY', default=None)
if gemini_key:
    client = genai.Client(api_key=gemini_key)
    try:
        for model in client.models.list():
            print(f"Model: {model.name}, Supported Methods: {model.supported_actions}")
    except Exception as e:
        print(f"Error listing models: {e}")
else:
    print("No GEMINI_API_KEY found")
