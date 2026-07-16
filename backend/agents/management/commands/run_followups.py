import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from agents.models import ChatMessage
from agents.llm_service import get_llm_response
from agents.messaging_service import MessagingService
from agents.prospection_service import get_agent_for_contact

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Exécute les relances automatiques pour les prospects dans le CRM Kanban'

    def handle(self, *args, **kwargs):
        from agents.models import Contact

        now = timezone.now()

        contacts_to_followup = Contact.objects.filter(
            next_followup_date__lte=now,
            replied_since_last_ai=False,
            followup_count__lt=5,
        ).exclude(status__in=['ready', 'no']).select_related('user')

        if not contacts_to_followup.exists():
            self.stdout.write("Aucune relance à effectuer pour le moment.")
            return

        for contact in contacts_to_followup:
            agent = get_agent_for_contact(contact.user, contact.contact_info)
            if not agent:
                logger.warning(
                    "Aucun agent actif trouvé pour l'utilisateur %s",
                    contact.user.email,
                )
                continue

            messages = ChatMessage.objects.filter(
                user=contact.user,
                contact_info=contact.contact_info,
            ).order_by('created_at')

            history_text = "\n".join(
                f"{msg.sender}: {msg.content}" for msg in messages
            )

            contact.followup_count += 1

            prompt = (
                f"Historique:\n{history_text}\n\n"
                f"C'est ta {contact.followup_count}ème relance. "
                f"Le prospect n'a pas répondu. Génère un message de relance court, "
                f"naturel et adapté au contexte de la discussion. "
                f"Ne mets pas d'objet ni de formalités excessives, va droit au but."
            )

            user_plan = 'gratuit'
            if hasattr(contact.user, 'subscription'):
                user_plan = contact.user.subscription.plan_name

            response_text = get_llm_response(
                agent_name=agent.name,
                agent_role=agent.role,
                system_prompt=agent.system_prompt,
                knowledge_context="",
                user_message=prompt,
                model_name=agent.llm_model,
                user_plan=user_plan,
            )

            success = MessagingService.send_message(
                contact.user,
                contact.contact_info,
                response_text,
                contact.source,
            )

            if success:
                self.stdout.write(
                    f"Relance {contact.followup_count} envoyée à {contact.contact_info}"
                )

                ChatMessage.objects.create(
                    user=contact.user,
                    agent=agent,
                    sender='ai',
                    contact_info=contact.contact_info,
                    contact_name=contact.name,
                    source=contact.source,
                    content=response_text,
                    status='new',
                )

                # Arm next follow-up; prospect has not replied since this AI message
                contact.replied_since_last_ai = False
                contact.next_followup_date = now + timezone.timedelta(hours=48)
                contact.save()
            else:
                self.stdout.write(
                    f"Échec de l'envoi de la relance à {contact.contact_info}"
                )
                contact.followup_count -= 1
                contact.save(update_fields=['followup_count'])
