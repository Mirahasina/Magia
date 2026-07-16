import os
import requests
import time
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

class DailyCallViewSet(viewsets.ViewSet):
    """
    Handle Daily.co WebRTC Video Rooms capabilities.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def create_room(self, request):
        """
        Create a new Daily.co video room that expires in 2 hours.
        """
        api_key = os.environ.get('DAILY_API_KEY')
        
        if not api_key:
            return Response(
                {"error": "La configuration Daily.co est incomplète. Veuillez définir DAILY_API_KEY dans le fichier .env"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        url = "https://api.daily.co/v1/rooms"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        # Room properties: expires in 2 hours (7200 seconds), random name
        payload = {
            "properties": {
                "exp": int(time.time()) + 7200,
                "enable_chat": True,
                "enable_screenshare": True,
                "start_audio_off": False,
                "start_video_off": False,
            }
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                return Response({
                    'room_url': data.get('url'),
                    'room_name': data.get('name')
                })
            else:
                return Response(
                    {"error": f"Erreur de l'API Daily.co: {response.text}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
