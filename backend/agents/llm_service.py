from google import genai
from openai import OpenAI
from anthropic import Anthropic
import os
import environ
from PIL import Image

env = environ.Env()
environ.Env.read_env(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

def get_llm_response(agent_name, agent_role, system_prompt, knowledge_context, user_message, model_name='gemini-1.5-flash', image_paths=None):
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
    1. **Analyse & Expertise** : Agis en tant que {agent_role}.
    2. **Style** : Professionnel, épuré. PAS de gras (pas de **).
    3. **RAG** : Utilise prioritairement le contexte fourni.
    """

    try:
        if provider == 'google':
            api_key = env('GEMINI_API_KEY', default=None)
            if not api_key: return "Erreur: Clé Gemini manquante."
            client = genai.Client(api_key=api_key)
            content_parts = [instructions, f"Utilisateur : {user_message}"]
            response = client.models.generate_content(model=model_name, contents=content_parts)
            return response.text.strip()

        elif provider == 'openai':
            api_key = env('OPENAI_API_KEY', default=None)
            if not api_key: return "Erreur: Clé OpenAI manquante."
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
        response = client.models.generate_content(model='gemini-1.5-flash', contents=[prompt])
        res = response.text.strip().lower()
        return "pertinent" if "pertinent" in res and "non" not in res else "non_pertinent"
    except Exception:
        return "pertinent"
