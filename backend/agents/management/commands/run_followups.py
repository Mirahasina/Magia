import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from agents.models import Contact, Agent, ChatMessage
from agents.llm_service import get_llm_response
from agents.messaging_service import MessagingService

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Exécute les relances automatiques pour les prospects dans le CRM Kanban'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        
        contacts_to_followup = Contact.objects.filter(
            next_followup_date__lte=now,
            replied_since_last_ai=False,
            followup_count__lt=5
        ).exclude(status__in=['ready', 'no'])

        if not contacts_to_followup.exists():
            self.stdout.write("Aucune relance à effectuer pour le moment.")
            return

        for contact in contacts_to_followup:
            agent = Agent.objects.filter(user=contact.user, is_active=True).first()
            if not agent:
                logger.warning(f"Aucun agent actif trouvé pour l'utilisateur {contact.user.email}")
                continue
                
            messages = ChatMessage.objects.filter(
                user=contact.user,
                contact_info=contact.contact_info
            ).order_by('created_at')
            
            history_text = "\n".join([f"{msg.sender}: {msg.content}" for msg in messages])
            
            contact.followup_count += 1
            
            prompt = f"Historique:\n{history_text}\n\nC'est ta {contact.followup_count}ème relance. Le prospect n'a pas répondu. Génère un message de relance court, naturel et adapté au contexte de la discussion. Ne mets pas d'objet ni de formalités excessives, va droit au but."
            
            response_text = get_llm_response(
                agent_name=agent.name,
                agent_role=agent.role,
                system_prompt=agent.system_prompt,
                knowledge_context="",
                user_message=prompt,
                model_name=agent.llm_model,
                user_plan='gratuit' # Par défaut
            )
            
            success = MessagingService.send_message(contact.user, contact.contact_info, response_text, contact.source)
            
            if success:
                self.stdout.write(f"Relance {contact.followup_count} envoyée à {contact.contact_info}")
                
                ChatMessage.objects.create(
                    user=contact.user,
                    agent=agent,
                    sender=agent.name,
                    contact_info=contact.contact_info,
                    source=contact.source,
                    content=response_text
                )
                
                contact.next_followup_date = now + timezone.timedelta(hours=48)
                contact.save()
            else:
                self.stdout.write(f"Échec de l'envoi de la relance à {contact.contact_info}")
                contact.followup_count -= 1
