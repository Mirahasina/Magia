import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework.test import APIClient
from accounts.models import User
from agents.models import WhatsAppConfig, Agent, EmailConfig, ChatMessage

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_user():
    user = User.objects.create(email="test@example.com")
    user.set_password("password123")
    user.save()
    return user

@pytest.fixture
def test_agent(test_user):
    return Agent.objects.create(
        user=test_user,
        name="Test Agent",
        role="Support",
        system_prompt="Test prompt",
        channels=['whatsapp', 'email'],
        is_active=True
    )

@pytest.mark.django_db
class TestWhatsAppGateway:
    def test_whatsapp_gateway_creates_message_and_assigns_agent(self, api_client, test_user, test_agent):
        payload = {
            "user_id": str(test_user.id),
            "message": "Bonjour, je voudrais tester.",
            "message_id": "wa_msg_123",
            "sender": "261340000000"
        }
        
        response = api_client.post('/api/whatsapp-config/whatsapp_gateway/', data=payload, format='json')
        
        assert response.status_code == 200
        assert response.data['status'] == 'received'
        
        msg = ChatMessage.objects.filter(whatsapp_message_id="wa_msg_123").first()
        assert msg is not None
        assert msg.content == "Bonjour, je voudrais tester."
        assert msg.contact_info == "261340000000"
        
        assert msg.agent is not None
        assert msg.agent.id == test_agent.id

    def test_whatsapp_gateway_duplicate_message_ignored(self, api_client, test_user, test_agent):
        ChatMessage.objects.create(
            user=test_user, 
            sender="user", 
            content="old", 
            whatsapp_message_id="wa_msg_duplicate"
        )
        
        payload = {
            "user_id": str(test_user.id),
            "message": "This is a duplicate",
            "message_id": "wa_msg_duplicate",
            "sender": "261340000000"
        }
        
        response = api_client.post('/api/whatsapp-config/whatsapp_gateway/', data=payload, format='json')
        assert response.status_code == 200
        assert response.data['status'] == 'ignored'
        assert response.data['reason'] == 'duplicate'


@pytest.mark.django_db
class TestEmailService:

    @patch('agents.email_service.imaplib.IMAP4_SSL')
    @patch('agents.email_service.get_llm_response')
    def test_process_emails_for_agent(self, mock_llm, mock_imap, test_user, test_agent):
        # Configuration
        config = EmailConfig.objects.create(
            user=test_user,
            email="agent@test.com",
            password="testpassword",
            imap_server="imap.test.com",
            is_active=True
        )
        test_agent.email_config = config
        test_agent.save()

        mock_mail_instance = MagicMock()
        mock_imap.return_value = mock_mail_instance
        
        mock_mail_instance.search.return_value = ('OK', [b'1'])
        
        from django.utils import timezone
        now_str = timezone.now().strftime("%a, %d %b %Y %H:%M:%S +0000")
        
        mock_mail_instance.fetch.side_effect = [
            ('OK', [(b'1 (BODY[HEADER])', f'Date: {now_str}\r\n\r\n'.encode())]),
            ('OK', [(b'\\Seen', b'Subject: Test Subject\r\nFrom: sender@test.com\r\n\r\nTest Body content')])
        ]

        mock_llm.side_effect = ["OUI", "Bonjour, merci pour votre email test."]
        
        with patch('agents.email_service.send_email_reply') as mock_send_email:
            mock_send_email.return_value = True
            
            from agents.email_service import process_emails_for_agent
            process_emails_for_agent(test_agent.id)
            
            assert mock_imap.called
            assert mock_llm.called
            assert mock_send_email.called
            
            user_msg = ChatMessage.objects.filter(agent=test_agent, sender='user', source='email').first()
            ai_msg = ChatMessage.objects.filter(agent=test_agent, sender=test_agent.name, source='email').first()
            
            assert user_msg is not None
            assert user_msg.contact_info == "sender@test.com"
            assert "Test Body content" in user_msg.content
            
            assert ai_msg is not None
            assert ai_msg.content == "Bonjour, merci pour votre email test."

    @patch('agents.email_service.smtplib.SMTP_SSL')
    def test_send_email_reply(self, mock_smtp, test_user):
        config = EmailConfig.objects.create(
            user=test_user,
            email="agent@test.com",
            password="testpassword",
            smtp_server="smtp.test.com",
            is_active=True
        )
        
        mock_server_instance = MagicMock()
        mock_smtp.return_value = mock_server_instance
        
        from agents.email_service import send_email_reply
        result = send_email_reply(config, "recipient@test.com", "Sujet", "Corps")
        
        assert result is True
        mock_server_instance.login.assert_called_with("agent@test.com", "testpassword")
        mock_server_instance.send_message.assert_called()

    @patch('agents.email_service.imaplib.IMAP4_SSL')
    def test_sync_email_history(self, mock_imap, test_user, test_agent):
        config = EmailConfig.objects.create(
            user=test_user,
            email="agent@test.com",
            password="testpassword",
            imap_server="imap.test.com",
            is_active=True
        )
        test_agent.email_config = config
        test_agent.save()

        mock_mail_instance = MagicMock()
        mock_imap.return_value = mock_mail_instance
        
        # Test folder listing
        mock_mail_instance.list.return_value = ('OK', [b'(\HasNoChildren) "/" "INBOX"', b'(\HasNoChildren) "/" "Sent"'])
        
        # Mock INBOX and Sent folder selects
        mock_mail_instance.select.return_value = ('OK', [b'1'])
        mock_mail_instance.search.return_value = ('OK', [b'1'])
        
        # Mock fetch results: first INBOX (incoming), then Sent (outgoing)
        mock_mail_instance.fetch.side_effect = [
            ('OK', [(b'FLAGS (\\Seen) BODY[]', b'From: external@test.com\r\nTo: agent@test.com\r\nSubject: Hello\r\n\r\nIncoming message')]),
            ('OK', [(b'FLAGS (\\Seen) BODY[]', b'From: agent@test.com\r\nTo: external@test.com\r\nSubject: Reply\r\n\r\nOutgoing message')])
        ]
        
        from agents.email_service import sync_email_history
        sync_email_history(config)
        
        # Verify messages created
        user_msg = ChatMessage.objects.filter(agent=test_agent, sender='user').first()
        ai_msg = ChatMessage.objects.filter(agent=test_agent, sender='ai').first()
        
        assert user_msg is not None
        assert "Incoming message" in user_msg.content
        assert user_msg.contact_info == "external@test.com"
        
        assert ai_msg is not None
        assert "Outgoing message" in ai_msg.content
        assert ai_msg.contact_info == "external@test.com"
