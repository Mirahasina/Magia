from google import genai
from openai import OpenAI
from anthropic import Anthropic
import os
import environ
from PIL import Image
import re
import uuid
import shutil
import requests
import urllib.parse
from django.conf import settings
from gradio_client import Client
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import io

env = environ.Env()
environ.Env.read_env(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

def create_pdf_from_text(text, filepath):
    """
    Crée un fichier PDF simple à partir d'un texte.
    """
    try:
        c = canvas.Canvas(filepath, pagesize=letter)
        width, height = letter
        c.setFont("Helvetica", 12)
        
        x_margin = 50
        y_position = height - 50
        line_height = 14
        
        for line in text.split('\n'):
            if y_position < 50:
                c.showPage()
                c.setFont("Helvetica", 12)
                y_position = height - 50
            
            c.drawString(x_margin, y_position, line)
            y_position -= line_height
            
        c.save()
        return True
    except Exception as e:
        print(f"PDF Error: {e}")
        return False

def generate_video_huggingface(prompt):
    
    try:
        client = Client("damo-vilab/text-to-video-ms-1.7b")
        result = client.predict(
            prompt,	# prompt (str)
            16,	# n_frames (int)
            api_name="/predict"
        )
        video_path = result
        
        if not video_path:
            return "\n*Note: La génération vidéo gratuite est actuellement saturée. Veuillez réessayer dans quelques minutes ou configurer un service Pro.*\n"
            
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
    import html
    image_pattern = r'\[GENERATE_IMAGE:\s*(.*?)\]'
    def replace_image(match):
        prompt = match.group(1).strip('"').strip("'")
        
        openai_key = env('OPENAI_API_KEY', default=None)
        if openai_key and openai_key.startswith('sk-'):
            try:
                client = OpenAI(api_key=openai_key)
                res = client.images.generate(
                    model="dall-e-3",
                    prompt=prompt,
                    n=1,
                    size="1024x1024"
                )
                url = res.data[0].url
                return f"\n<img class='rounded-lg max-w-full shadow-md mt-2' src='{url}' alt='Image générée' />\n"
            except Exception as oe:
                print(f"OpenAI Image Error: {oe}")
                pass

        gemini_key = env('GEMINI_API_KEY', default=None)
        if gemini_key:
            try:
                client = genai.Client(api_key=gemini_key)
                response = client.models.generate_images(
                    model='imagen-4.0-fast-generate-001',
                    prompt=prompt,
                )
                
                if response.generated_images:
                    image_obj = response.generated_images[0]
                    fname = f"img_{uuid.uuid4().hex[:8]}.png"
                    media_dir = os.path.join(settings.MEDIA_ROOT, 'generated')
                    os.makedirs(media_dir, exist_ok=True)
                    dest_path = os.path.join(media_dir, fname)
                    
                    img_bytes = None
                    if hasattr(image_obj, 'image') and hasattr(image_obj.image, 'image_bytes'):
                        img_bytes = image_obj.image.image_bytes
                    elif hasattr(image_obj, 'image_bytes'):
                        img_bytes = image_obj.image_bytes
                    
                    if img_bytes:
                        with open(dest_path, 'wb') as f:
                            f.write(img_bytes)
                    elif hasattr(image_obj, 'save'):
                        image_obj.save(dest_path)
                    else:
                        return f"\n*Image générée mais format de données inconnu.*\n"
                    
                    file_url = f"{settings.MEDIA_URL}generated/{fname}"
                    url_path = file_url if file_url.startswith('/') else f"/{file_url}"
                    return f"\n<img class='rounded-lg max-w-full shadow-md mt-2' src='{url_path}' alt='Image générée' />\n"
            except Exception as e:
                try:
                    encoded_prompt = urllib.parse.quote(prompt)
                    pollinations_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true"
                    
                    return f"\n<img class='rounded-lg max-w-full shadow-md mt-2' src='{pollinations_url}' alt='Image générée' />\n"
                except Exception as pe:
                    if not openai_key:
                        return f"\n*Erreur: Clé OpenAI manquante et échec du fallback Gemini ({e}). Fallback Pollinations échoué ({pe}).*\n"
                    return f"\n*Erreur lors de la génération de l'image: {e}*\n"

        return "\n*Erreur: Aucune clé API configurée pour la génération d'images (OpenAI ou Gemini requises).*\n"
            
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
        
        ext = os.path.splitext(fname)[1].lower()
        base = os.path.splitext(fname)[0]
        unique_filename = f"{base}_{uuid.uuid4().hex[:8]}{ext}"
        
        media_dir = os.path.join(settings.MEDIA_ROOT, 'generated')
        os.makedirs(media_dir, exist_ok=True)
        filepath = os.path.join(media_dir, unique_filename)
        
        success = False
        if ext == '.pdf':
            success = create_pdf_from_text(content, filepath)
        else:
            try:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                success = True
            except Exception:
                success = False
            
        if not success:
            return f"\n*Erreur lors de la création du fichier {fname}*\n"
            
        file_url = f"{settings.MEDIA_URL}generated/{unique_filename}"
        url_path = file_url if file_url.startswith('/') else f"/{file_url}"
        
        preview_content = content if len(content) < 500 else content[:500] + "..."
        escaped_preview = html.escape(preview_content)
        
        return (
            f"\n<pre class='bg-slate-100 p-2.5 rounded border border-slate-200 font-mono text-xs overflow-x-auto mt-2'>{escaped_preview}</pre>\n"
            f"<div class='mt-2'><a class='inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#218158] text-white font-medium py-1.5 px-3 rounded-lg transition-colors shadow-sm' href='{url_path}' download='{fname}' target='_blank'>📄 Télécharger {fname}</a></div>\n"
        )
        
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
       IMPORTANT: Tu as la capacité de générer des assets. Si l'utilisateur demande une image, une vidéo ou un fichier, tu DOIS utiliser ces tags EXACTEMENT :
       - Pour une IMAGE : [GENERATE_IMAGE: "Description détaillée en anglais"]
       - Pour une VIDÉO : [GENERATE_VIDEO: "Description détaillée en anglais"]
       - Pour un FICHIER (PDF, CSV, Python, txt, etc) :
         [GENERATE_FILE: "nom_fichier.ext"]
         Contenu du fichier ici
         [/GENERATE_FILE]
       Note: Pour les PDF, écris simplement le texte que tu veux voir dans le document.
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

def analyze_prospection_context(history_text):
    """
    Analyse la conversation pour définir le statut CRM et le délai de relance en heures.
    """
    import json
    env_local = environ.Env()
    environ.Env.read_env(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))
    api_key = env_local('GEMINI_API_KEY', default=None)
    if not api_key: return {'status': 'contacted', 'next_followup_hours': 24}
    
    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""
Analyse cet historique de conversation de prospection :
{history_text}

Tu dois déterminer :
1. Le statut actuel du prospect parmi cette liste : 'new', 'contacted', 'interested', 'ready', 'no'.
2. Le nombre d'heures à attendre avant de relancer automatiquement si le prospect ne répond pas (ex: 24, 48, 72). S'il n'est pas intéressé ('no'), met 0.

Réponds UNIQUEMENT au format JSON strict :
{{"status": "...", "next_followup_hours": ...}}
"""
        for m in DEFAULT_GEMINI_MODELS:
            try:
                response = client.models.generate_content(model=m, contents=[prompt])
                res = response.text.strip()
                if res.startswith("```json"): res = res[7:-3]
                elif res.startswith("```"): res = res[3:-3]
                
                data = json.loads(res.strip())
                return {
                    'status': data.get('status', 'contacted'),
                    'next_followup_hours': int(data.get('next_followup_hours', 24))
                }
            except Exception as e:
                err = str(e)
                if "429" in err or "404" in err or "quota" in err.lower():
                    continue
                break
        return {'status': 'contacted', 'next_followup_hours': 24}
    except Exception:
        return {'status': 'contacted', 'next_followup_hours': 24}

