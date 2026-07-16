"""
CRM prospection helpers: follow-up scheduling and conversation → pipeline sync.
"""
import logging
from django.db.models import Q
from django.utils import timezone
from .models import Contact, ContactAssignment, Agent, ChatMessage

logger = logging.getLogger(__name__)

VALID_STATUSES = {'new', 'contacted', 'interested', 'ready', 'no'}
DEFAULT_FOLLOWUP_HOURS = 48


def _find_contacts(user, contact_info, source=None):
    qs = Contact.objects.filter(user=user, contact_info=contact_info)
    if source:
        qs = qs.filter(source=source)
    return list(qs)


def purge_passive_crm_contacts(user) -> int:
    from django.db.models import Exists, OuterRef

    chat_deleted, _ = Contact.objects.filter(user=user, source='chat').delete()

    has_live_outbound = ChatMessage.objects.filter(
        user=OuterRef('user'),
        contact_info=OuterRef('contact_info'),
        source=OuterRef('source'),
        sender='ai',
    ).exclude(status='archived')

    has_any_msg = ChatMessage.objects.filter(
        user=OuterRef('user'),
        contact_info=OuterRef('contact_info'),
        source=OuterRef('source'),
    )

    base = Contact.objects.filter(
        user=user,
        status='new',
        followup_count=0,
    ).filter(Q(apollo_id__isnull=True) | Q(apollo_id='')).filter(
        Q(notes__isnull=True) | Q(notes='')
    )

    history_ids = list(
        base.annotate(
            has_live=Exists(has_live_outbound),
            has_msg=Exists(has_any_msg),
        ).filter(has_msg=True, has_live=False).values_list('id', flat=True)
    )

    # Address-book sync junk (no inbox messages at all)
    addr_ids = list(
        base.annotate(has_msg=Exists(has_any_msg)).filter(
            has_msg=False
        ).values_list('id', flat=True)
    )

    ids = list({*history_ids, *addr_ids})
    deleted = 0
    if ids:
        deleted, _ = Contact.objects.filter(id__in=ids).delete()

    total = (chat_deleted or 0) + (deleted or 0)
    if total:
        logger.info("Purged %s passive CRM contacts for user %s", total, getattr(user, 'id', user))
    return total


def mark_prospect_replied(user, contact_info, source=None):
    """Prospect answered → pause auto follow-ups until the next AI message."""
    contacts = _find_contacts(user, contact_info, source)
    if not contacts:
        return 0
    updated = 0
    for contact in contacts:
        if not contact.replied_since_last_ai:
            contact.replied_since_last_ai = True
            contact.save(update_fields=['replied_since_last_ai'])
            updated += 1
    return updated


def schedule_followup_after_ai(
    user,
    contact_info,
    source=None,
    *,
    analyze=True,
    default_hours=DEFAULT_FOLLOWUP_HOURS,
):
    """
    After an AI (or manual outbound) message: arm the follow-up clock.
    Optionally analyse conversation to update CRM status + delay.

    Does NOT create CRM contacts - only updates prospects already in the pipeline
    (manual add, Apollo, CSV import, or agent outreach that created them first).
    """
    contacts = _find_contacts(user, contact_info, source)
    if not contacts:
        return

    hours = default_hours
    new_status = None

    if analyze:
        try:
            from .llm_service import analyze_prospection_context
            messages = ChatMessage.objects.filter(
                user=user,
                contact_info=contact_info,
            ).order_by('created_at')[:40]
            if not messages.exists() and contacts:
                messages = ChatMessage.objects.filter(
                    contact_info=contact_info,
                ).order_by('created_at')[:40]
            history_text = "\n".join(
                f"{msg.sender}: {msg.content}" for msg in messages
            )
            if history_text.strip():
                result = analyze_prospection_context(history_text)
                hours = int(result.get('next_followup_hours') or default_hours)
                status = result.get('status')
                if status in VALID_STATUSES:
                    new_status = status
        except Exception as exc:
            logger.warning("analyze_prospection_context failed: %s", exc)

    now = timezone.now()
    for contact in contacts:
        contact.replied_since_last_ai = False
        if new_status == 'no' or hours <= 0:
            contact.next_followup_date = None
            if new_status:
                contact.status = new_status
        else:
            contact.next_followup_date = now + timezone.timedelta(hours=hours)
            if new_status and contact.status != 'ready':
                # Don't downgrade a manually set "ready"
                if not (contact.status == 'ready' and new_status in ('new', 'contacted')):
                    contact.status = new_status
            elif contact.status == 'new':
                contact.status = 'contacted'
        contact.save()


def get_agent_for_contact(user, contact_info):
    """Prefer assigned agent, else first active agent for the user."""
    assignment = ContactAssignment.objects.filter(
        user=user, contact_info=contact_info
    ).select_related('agent').first()
    if assignment and assignment.agent and assignment.agent.is_active:
        return assignment.agent
    return Agent.objects.filter(user=user, is_active=True).first()


def infer_channels_for_team_agent(name='', role='', system_prompt=''):
    """Derive WhatsApp/Email/chat channels from agent role text."""
    text = f"{name} {role} {system_prompt}".lower()
    channels = ['chat']
    wants_wa = any(k in text for k in ('whatsapp', 'whats app', 'wa '))
    wants_email = any(k in text for k in ('email', 'e-mail', 'mail', 'smtp'))
    if wants_wa:
        channels.append('whatsapp')
    if wants_email:
        channels.append('email')
    if len(channels) == 1:
        # Generic team roles (prospecteur, closer, support…) cover both outreach channels
        channels.extend(['whatsapp', 'email'])
    return channels


def attach_user_channel_configs(agent, user):
    """Bind the user's WhatsApp/Email accounts when the agent lists those channels."""
    from .models import WhatsAppConfig, EmailConfig

    channels = [str(c).lower() for c in (agent.channels or [])]
    updated = False

    if 'whatsapp' in channels and not agent.whatsapp_config_id:
        wa = (
            WhatsAppConfig.objects.filter(user=user, is_connected=True).first()
            or WhatsAppConfig.objects.filter(user=user).first()
        )
        if wa:
            agent.whatsapp_config = wa
            updated = True

    if 'email' in channels and not agent.email_config_id:
        email = (
            EmailConfig.objects.filter(user=user, is_active=True).first()
            or EmailConfig.objects.filter(user=user).first()
        )
        if email:
            agent.email_config = email
            updated = True

    if updated:
        agent.save()
    return agent


def build_handoff_intro(target_agent, previous_agent=None):
    prev = f" suite au passage de relais avec {previous_agent.name}" if previous_agent else ""
    return (
        f"Bonjour, je suis {target_agent.name}"
        f"{f', {target_agent.role}' if target_agent.role else ''}{prev}. "
        f"Je prends le relais pour mieux vous accompagner."
    )
