from google import genai
from openai import OpenAI
from anthropic import Anthropic
import os
import environ
from PIL import Image

env = environ.Env()
environ.Env.read_env(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

DEFAULT_GEMINI_MODELS = [
    'gemini-2.0-flash', 
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
]

def get_llm_response(agent_name, agent_role, system_prompt, knowledge_context, user_message, model_name='gemini-2.0-flash', image_paths=None):
    provider = 'google'
    if 'gpt' in model_name.lower():
        provider = 'openai'
    elif 'claude' in model_name.lower():
        provider = 'anthropic'

    instructions = f"""
    Tu es {agent_name}, {agent_role}.
    {system_prompt}

    CONTEXTE ET CONNAISSANCES (RAG) :
    {knowledge_context if knowledge_context else "NOTE: Aucun document spécifique fourni. Réponds selon ton rôle."}

    CONSIGNES :
    1. Expertise : Identité {agent_role}. Ton Corporate et Expert.
    2. Style : Minimaliste, précis, sans fioritures.
    3. Formatage : INTERDICTION FORMELLE d'utiliser du gras (**). Pas d'emojis superflus.
    4. RAG : Utilise le contexte comme source unique de vérité.
    """

    try:
        if provider == 'google':
            api_key = env('GEMINI_API_KEY', default=None)
            if not api_key: return "Erreur: Clé Gemini manquante."
            client = genai.Client(api_key=api_key)
            content_parts = [instructions, f"Utilisateur : {user_message}"]

            models_to_try = DEFAULT_GEMINI_MODELS
            last_error = None
            for m in models_to_try:
                try:
                    response = client.models.generate_content(model=m, contents=content_parts)
                    return response.text.strip()
                except Exception as e:
                    last_error = e
                    err = str(e)
                    if "429" in err or "404" in err or "503" in err or "500" in err or "quota" in err.lower() or "UNAVAILABLE" in err:
                        continue
                    break

            if last_error and ("429" in str(last_error) or "quota" in str(last_error).lower()):
                return "Désolé, j'ai atteint ma limite de requêtes pour l'instant. Veuillez réessayer dans quelques secondes."
            return f"Désolé, j'ai rencontré une erreur technique. Veuillez réessayer."

        elif provider == 'openai':
            api_key = env('OPENAI_API_KEY', default=None)
            if not api_key: 
                print("WARNING: OpenAI API Key missing. Falling back to Gemini if possible.")
                return "Erreur: Clé OpenAI manquante dans le fichier .env. Veuillez configurer OPENAI_API_KEY ou utiliser un modèle Gemini."
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": instructions},
                    {"role": "user", "content": user_message}
                ]
            )
            return response.choices[0].message.content.strip()

        elif provider == 'anthropic':
            api_key = env('ANTHROPIC_API_KEY', default=None)
            if not api_key: return "Erreur: Clé Anthropic manquante."
            client = Anthropic(api_key=api_key)
            response = client.messages.create(
                model=model_name,
                max_tokens=1024,
                system=instructions,
                messages=[{"role": "user", "content": user_message}]
            )
            return response.content[0].text.strip()

    except Exception as e:
        print(f"LLM Error: {e}")
        return f"Désolé, j'ai rencontré une erreur technique avec {model_name}."

def classify_pertinence(agent_role, message):
    """
    Classify if a message is pertinent (requires attention) or just noise/greeting.
    """
    env_local = environ.Env()
    environ.Env.read_env(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))
    api_key = env_local('GEMINI_API_KEY', default=None)
    if not api_key: return "pertinent" 
    
    try:
        client = genai.Client(api_key=api_key)
        prompt = f"En tant qu'expert pour un agent {agent_role}, réponds 'pertinent' si ce message demande une action/info, ou 'non_pertinent' si c'est juste un bonjour ou du bruit. Message: {message}. Réponds par UN SEUL MOT."
        
        for m in DEFAULT_GEMINI_MODELS:
            try:
                response = client.models.generate_content(model=m, contents=[prompt])
                res = response.text.strip().lower()
                return "pertinent" if "pertinent" in res and "non" not in res else "non_pertinent"
            except Exception as e:
                err = str(e)
                if "429" in err or "404" in err or "quota" in err.lower():
                    continue
                break
        return "pertinent"
    except Exception:
        return "pertinent"

def classify_handoff(trigger_type, message):
    """
    Check if a specific trigger is met in the user message.
    """
    env_local = environ.Env()
    environ.Env.read_env(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))
    api_key = env_local('GEMINI_API_KEY', default=None)
    if not api_key: return False
    
    client = genai.Client(api_key=api_key)
    triggers = {
        'interest': "l'utilisateur manifeste un intérêt, une curiosité, une intention d'achat ou pose une question concrète sur le produit/service",
        'email_requested': "l'utilisateur demande un email, un devis par écrit ou donne son adresse email",
        'whatsapp_requested': "l'utilisateur veut passer sur WhatsApp ou donne son 06/07",
        'manual': "l'utilisateur veut parler à un humain"
    }
    condition = triggers.get(trigger_type, trigger_type)
    
    prompt = f"Message: '{message}'.\nEst-ce que {condition} ? Réponds par 'OUI' ou 'NON' uniquement."
    
    for m in DEFAULT_GEMINI_MODELS:
        try:
            response = client.models.generate_content(model=m, contents=[prompt])
            res = response.text.strip().upper()
            if "OUI" in res: return True
            if "NON" in res: return False
        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower() or "404" in str(e) or "503" in str(e):
                continue
            break
    return False
