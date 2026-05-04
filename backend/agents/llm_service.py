from google import genai
from openai import OpenAI
from anthropic import Anthropic
import os
import environ
from PIL import Image
import re
import uuid
import shutil
from django.conf import settings
from gradio_client import Client

env = environ.Env()
environ.Env.read_env(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

def generate_video_huggingface(prompt):
    """
    Génère une vidéo via un Space Hugging Face gratuit.
    """
    try:
        client = Client("ali-vilab/modelscope-damo-text-to-video-synthesis")
        result = client.predict(
            prompt=prompt,
            api_name="/predict"
        )
        video_path = result
        
        fname = f"video_{uuid.uuid4().hex[:8]}.mp4"
        media_dir = os.path.join(settings.MEDIA_ROOT, 'generated')
        os.makedirs(media_dir, exist_ok=True)
        dest_path = os.path.join(media_dir, fname)
        shutil.copy(video_path, dest_path)
        
        file_url = f"{settings.MEDIA_URL}generated/{fname}"
        url_path = file_url if file_url.startswith('/') else f"/{file_url}"
        
        return f"\n<video controls width='100%' class='rounded-lg shadow-md mt-2' src='{url_path}'></video>\n"
    except Exception as e:
        return f"\n*Erreur lors de la génération de la vidéo: {e}*\n"

def process_ai_response(response_text):
    image_pattern = r'\[GENERATE_IMAGE:\s*(.*?)\]'
    def replace_image(match):
        prompt = match.group(1).strip('"').strip("'")
        try:
            client = OpenAI(api_key=env('OPENAI_API_KEY'))
            res = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                n=1,
                size="1024x1024"
            )
            url = res.data[0].url
            return f"![Image générée]({url})"
        except Exception as e:
            return f"\n*Erreur lors de la génération de l'image: {e}*\n"
            
    res = re.sub(image_pattern, replace_image, response_text)
    
    video_pattern = r'\[GENERATE_VIDEO:\s*(.*?)\]'
    def replace_video(match):
        prompt = match.group(1).strip('"').strip("'")
        return generate_video_huggingface(prompt)
    
    res = re.sub(video_pattern, replace_video, res)
    
    file_pattern = r'\[GENERATE_FILE:\s*(.*?)\](.*?)\[/GENERATE_FILE\]'
    def replace_file(match):
        fname = match.group(1).strip('"').strip("'")
        content = match.group(2).strip()
        
        ext = os.path.splitext(fname)[1]
        base = os.path.splitext(fname)[0]
        unique_filename = f"{base}_{uuid.uuid4().hex[:8]}{ext}"
        
        media_dir = os.path.join(settings.MEDIA_ROOT, 'generated')
        os.makedirs(media_dir, exist_ok=True)
        filepath = os.path.join(media_dir, unique_filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
        file_url = f"{settings.MEDIA_URL}generated/{unique_filename}"
        url_path = file_url if file_url.startswith('/') else f"/{file_url}"
        
        preview_content = content if len(content) < 500 else content[:500] + "..."
        return f"\n```\n{preview_content}\n```\n[📄 Télécharger {fname}]({url_path})\n"
        
    res = re.sub(file_pattern, replace_file, res, flags=re.DOTALL)
    return res

DEFAULT_GEMINI_MODELS = [
    'gemini-2.0-flash', 
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
]

def get_llm_response(agent_name, agent_role, system_prompt, knowledge_context, user_message, model_name='gemini-2.0-flash', image_paths=None, user_plan='gratuit'):
    m_lower = model_name.lower()
    
    if user_plan == 'gratuit':
        if 'gpt' in m_lower and 'mini' not in m_lower:
            model_name = 'gpt-4o-mini'
        elif 'gemini' in m_lower and 'pro' in m_lower:
            model_name = 'gemini-1.5-flash'
        elif 'claude' in m_lower and 'sonnet' in m_lower:
            model_name = 'claude-3-haiku-20240307'
        elif 'o1' in m_lower:
            model_name = 'gpt-4o-mini'
    
    elif user_plan == 'pro':
        if 'o1' in m_lower:
            model_name = 'gpt-4o'
        elif 'ultra' in m_lower:
            model_name = 'gemini-1.5-pro'
            

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
    5. Outils (Images, Vidéos et Fichiers) :
       - Pour générer une image, inclus EXACTEMENT ce texte sur une nouvelle ligne: [GENERATE_IMAGE: "Description détaillée en anglais"]
       - Pour générer une vidéo, inclus EXACTEMENT ce texte sur une nouvelle ligne: [GENERATE_VIDEO: "Description détaillée en anglais"]
       - Pour créer un fichier (CSV, Python, txt, etc) à télécharger pour l'utilisateur, inclus EXACTEMENT ce texte:
         [GENERATE_FILE: "nom_fichier.ext"]
         contenu brut du fichier
         [/GENERATE_FILE]
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
                    return process_ai_response(response.text.strip())
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
            return process_ai_response(response.choices[0].message.content.strip())

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
            return process_ai_response(response.content[0].text.strip())

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
