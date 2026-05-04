import requests
import logging

logger = logging.getLogger(__name__)

def search_linkedin_profiles(api_key, query):
    if not api_key:
        return {"error": "Clé API Proxycurl manquante."}
    
    url = "https://nubela.co/proxycurl/api/search/person/"
    headers = {'Authorization': f'Bearer {api_key}'}
    params = {
        'q': query,
    }
    try:
        response = requests.get(url, params=params, headers=headers)
        if response.status_code == 200:
            return response.json()
        return {"error": f"Erreur Proxycurl ({response.status_code}): {response.text}"}
    except Exception as e:
        logger.error(f"LinkedIn Search Error: {e}")
        return {"error": str(e)}

def get_linkedin_profile_details(api_key, linkedin_url):
    if not api_key:
        return {"error": "Clé API Proxycurl manquante."}

    url = "https://nubela.co/proxycurl/api/v2/linkedin"
    headers = {'Authorization': f'Bearer {api_key}'}
    params = {
        'url': linkedin_url,
    }
    try:
        response = requests.get(url, params=params, headers=headers)
        if response.status_code == 200:
            return response.json()
        return {"error": f"Erreur Proxycurl ({response.status_code}): {response.text}"}
    except Exception as e:
        logger.error(f"LinkedIn Profile Detail Error: {e}")
        return {"error": str(e)}
