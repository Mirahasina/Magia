import os
import sys

# Add the project root to sys.path
sys.path.append('/home/mirahasina/MAGIA/Magia/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'magia_backend.settings')
import django
django.setup()

from agents.llm_service import process_ai_response

def test_image_generation():
    print("Testing image generation...")
    prompt = '[GENERATE_IMAGE: "a beautiful sunset over the mountains, digital art style"]'
    result = process_ai_response(prompt)
    print(f"Result: {result}")
    if "![" in result:
        print("Image generation SUCCESSFUL")
    else:
        print("Image generation FAILED")

def test_video_generation():
    print("\nTesting video generation...")
    prompt = '[GENERATE_VIDEO: "a beautiful sunset over the mountains, digital art style"]'
    result = process_ai_response(prompt)
    print(f"Result: {result}")
    if "<video" in result:
        print("Video generation SUCCESSFUL")
    else:
        print("Video generation FAILED")

def test_pdf_generation():
    print("\nTesting PDF generation...")
    content = """
    Résumé de la Discussion
    Contexte: Projet Magia
    État: Correction des assets effectuée.
    - Image: Fallback Pollinations ajouté.
    - Vidéo: Message d'erreur amélioré.
    - PDF: Vérification en cours.
    """
    prompt = f'[GENERATE_FILE: "resume.pdf"]{content}[/GENERATE_FILE]'
    result = process_ai_response(prompt)
    print(f"Result: {result}")
    if "[📄 Télécharger" in result:
        print("PDF generation SUCCESSFUL")
    else:
        print("PDF generation FAILED")

if __name__ == "__main__":
    test_image_generation()
    test_pdf_generation()
    # test_video_generation()
