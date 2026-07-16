"""
Orchestrate Apollo prospect search → CRM → auto outreach (email / WhatsApp / Facebook).

Note Facebook : Meta n'autorise l'envoi Messenger que vers des PSID (personnes ayant
déjà écrit à la Page). Les prospects Apollo sont donc ajoutés au CRM avec leur profil
Facebook pour une prise de contact manuelle.
"""
from __future__ import annotations

import logging
import threading
import time
from typing import Optional

from django.utils import timezone

from . import apollo_service
from .llm_service import get_llm_response
from .messaging_service import MessagingService
from .models import (
    Agent,
    ChatMessage,
    Contact,
    ContactAssignment,
    EmailConfig,
    FacebookConfig,
    ProspectLead,
    ProspectSearchJob,
    WhatsAppConfig,
)


logger = logging.getLogger(__name__)

MAX_RESULTS_CAP = 25
SEND_DELAY_SECONDS = 3
CONSECUTIVE_SEND_FAILURES_ABORT = 5

FB_MANUAL_REASON = (
    "Facebook : profil ajouté au CRM - envoi Messenger manuel requis "
    "(Meta n'autorise pas les messages à froid)."
)


def channels_wanted(channels: str) -> tuple[bool, bool, bool]:
    """Returns (want_email, want_whatsapp, want_facebook) for a job channels value."""
    return (
        channels in ("email", "both", "all"),
        channels in ("whatsapp", "both", "all"),
        channels in ("facebook", "all"),
    )


def channel_connected(user, source: str) -> bool:
    if source == "whatsapp":
        return WhatsAppConfig.objects.filter(user=user, is_connected=True).exists()
    if source == "email":
        return EmailConfig.objects.filter(user=user, is_active=True).exists()
    if source == "facebook":
        return FacebookConfig.objects.filter(user=user, is_connected=True).exists()
    return False


def agent_supports_channel(agent: Agent, source: str) -> bool:
    channels = [str(c).lower() for c in (agent.channels or [])]
    return source.lower() in channels


def send_agent_intro(user, contact: Contact, agent: Agent) -> tuple[bool, str]:
    """
    Generate + send a first outreach message. Returns (sent, message_or_error).
    """
    source = contact.source
    contact_info = contact.contact_info
    contact_name = contact.name or contact_info
    notes_parts = []
    if contact.notes:
        notes_parts.append(contact.notes)
    if contact.title:
        notes_parts.append(f"Poste: {contact.title}")
    if contact.company:
        notes_parts.append(f"Entreprise: {contact.company}")
    notes = " · ".join(notes_parts) if notes_parts else ""

    if source == "linkedin":
        return False, "Canal LinkedIn indisponible."

    if not channel_connected(user, source):
        label = {"whatsapp": "WhatsApp", "email": "Email", "facebook": "Facebook"}.get(source, source)
        return False, f"{label} n'est pas connecté."

    if source == "facebook" and "facebook.com" in str(contact_info).lower():
        return False, (
            "Ce contact Facebook est une URL de profil. Messenger n'autorise l'envoi "
            "que vers les personnes ayant déjà écrit à votre Page - contactez-le "
            "manuellement depuis son profil."
        )

    intro_prompt = (
        f"Tu dois écrire un premier message de prise de contact à destination de {contact_name}. "
        f"Tes notes sur ce prospect : {notes if notes else 'Aucune note spécifique.'}. "
        f"Ce message doit être court, chaleureux, professionnel et adapté à ton rôle. "
        f"N'utilise pas de gras ni de formatage spécial. Écris uniquement le message."
    )

    try:
        response_text = get_llm_response(
            agent_name=agent.name,
            agent_role=agent.role,
            system_prompt=agent.system_prompt,
            knowledge_context="",
            user_message=intro_prompt,
            model_name=agent.llm_model,
        )
    except Exception as exc:
        logger.error("send_agent_intro LLM error: %s", exc)
        response_text = (
            f"Bonjour {contact_name}, je suis {agent.name}. "
            "Je serais ravi d'échanger avec vous."
        )

    sent = MessagingService.send_message(user, contact_info, response_text, source)
    if not sent:
        return False, f"Échec de l'envoi via {source}"

    ChatMessage.objects.create(
        user=user,
        agent=agent,
        sender="ai",
        content=response_text,
        contact_info=contact_info,
        contact_name=contact_name,
        source=source,
        status="new",
    )
    ContactAssignment.objects.update_or_create(
        user=user,
        contact_info=contact_info,
        defaults={"agent": agent},
    )
    if contact.status == "new":
        contact.status = "contacted"
    contact.replied_since_last_ai = False
    contact.next_followup_date = timezone.now() + timezone.timedelta(hours=48)
    contact.save()
    return True, response_text


def start_job_async(job_id: int) -> None:
    thread = threading.Thread(target=run_prospect_search_job, args=(job_id,), daemon=True)
    thread.start()


def run_prospect_search_job(job_id: int) -> None:
    try:
        job = ProspectSearchJob.objects.select_related("user", "agent").get(id=job_id)
    except ProspectSearchJob.DoesNotExist:
        logger.error("ProspectSearchJob %s introuvable", job_id)
        return

    job.status = "running"
    job.started_at = timezone.now()
    job.error = None
    job.save(update_fields=["status", "started_at", "error", "updated_at"])

    try:
        _execute_job(job)
        job.refresh_from_db()
        if job.status == "running":
            job.status = "done"
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "finished_at", "updated_at"])
    except Exception as exc:
        logger.exception("ProspectSearchJob %s failed: %s", job_id, exc)
        job.status = "failed"
        job.error = str(exc)[:2000]
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "error", "finished_at", "updated_at"])


def _execute_job(job: ProspectSearchJob) -> None:
    user = job.user
    agent = job.agent
    if not agent:
        raise RuntimeError("Aucun agent assigné au job.")
    if not agent.is_deployed:
        raise RuntimeError("L'agent doit être déployé.")

    want_email, want_wa, want_fb = channels_wanted(job.channels)

    if want_email and not channel_connected(user, "email"):
        if job.channels == "email":
            raise RuntimeError("Email non connecté. Activez-le dans Paramètres.")
        want_email = False
    if want_wa and not channel_connected(user, "whatsapp"):
        if job.channels == "whatsapp":
            raise RuntimeError("WhatsApp non connecté. Activez-le dans Paramètres.")
        want_wa = False
    if want_fb and not channel_connected(user, "facebook"):
        if job.channels == "facebook":
            raise RuntimeError("Facebook non connecté. Activez-le dans Paramètres.")
        want_fb = False
    if not want_email and not want_wa and not want_fb:
        raise RuntimeError("Aucun canal disponible (Email / WhatsApp / Facebook).")

    if want_email and not agent_supports_channel(agent, "email"):
        if job.channels == "email":
            raise RuntimeError("L'agent n'a pas le canal Email.")
        want_email = False
    if want_wa and not agent_supports_channel(agent, "whatsapp"):
        if job.channels == "whatsapp":
            raise RuntimeError("L'agent n'a pas le canal WhatsApp.")
        want_wa = False
    if want_fb and not agent_supports_channel(agent, "facebook"):
        if job.channels == "facebook":
            raise RuntimeError("L'agent n'a pas le canal Facebook.")
        want_fb = False
    if not want_email and not want_wa and not want_fb:
        raise RuntimeError("L'agent ne couvre aucun canal demandé.")

    max_results = min(max(int(job.max_results or 10), 1), MAX_RESULTS_CAP)
    search = apollo_service.search_people(job.filters or {}, page=1, per_page=max_results)
    people = search.get("people") or search.get("contacts") or []
    if not isinstance(people, list):
        people = []
    people = people[:max_results]

    leads: list[ProspectLead] = []
    for person in people:
        pid = str(person.get("id") or "")
        if not pid:
            continue
        org = person.get("organization") or {}
        company = None
        if isinstance(org, dict):
            company = org.get("name")
        lead, _ = ProspectLead.objects.update_or_create(
            job=job,
            apollo_person_id=pid,
            defaults={
                "name": apollo_service.person_display_name(person),
                "title": person.get("title"),
                "company": company,
                "raw": person,
                "status": "found",
            },
        )
        leads.append(lead)

    job.found_count = len(leads)
    job.save(update_fields=["found_count", "updated_at"])

    if not leads:
        job.status = "done"
        job.finished_at = timezone.now()
        job.error = "Aucun prospect trouvé avec ces filtres."
        job.save(update_fields=["status", "finished_at", "error", "updated_at"])
        return

    # Enrich in batches of 10
    webhook_url = None
    if want_wa:
        try:
            webhook_url = apollo_service.build_phone_webhook_url(job.id)
        except apollo_service.ApolloError as exc:
            if job.channels == "whatsapp":
                raise
            logger.warning("Phone webhook unavailable, WhatsApp skip: %s", exc)
            want_wa = False

    consecutive_failures = 0
    for i in range(0, len(leads), 10):
        batch = leads[i : i + 10]
        details = []
        for lead in batch:
            raw = lead.raw or {}
            org = raw.get("organization") or {}
            domain = None
            if isinstance(org, dict):
                domain = org.get("primary_domain") or org.get("website_url")
                if domain and "://" in str(domain):
                    domain = str(domain).split("://", 1)[-1].split("/")[0]
            details.append(
                {
                    "id": lead.apollo_person_id,
                    "name": lead.name,
                    "organization_name": lead.company,
                    "domain": domain,
                    "first_name": raw.get("first_name"),
                    "last_name": raw.get("last_name"),
                }
            )

        enrich_resp = apollo_service.enrich_people(
            details,
            reveal_personal_emails=want_email,
            reveal_phone_number=bool(want_wa and webhook_url),
            webhook_url=webhook_url if want_wa else None,
        )
        request_id = enrich_resp.get("request_id") or (enrich_resp.get("waterfall") or {}).get("request_id")
        matches = enrich_resp.get("matches") or enrich_resp.get("people") or []
        match_by_id = {}
        for m in matches:
            if isinstance(m, dict) and m.get("id"):
                match_by_id[str(m["id"])] = m

        for lead in batch:
            if request_id:
                lead.enrich_request_id = str(request_id)
            person = match_by_id.get(lead.apollo_person_id) or {}
            if person:
                lead.raw = {**(lead.raw or {}), "enrichment": person}
                if not lead.name:
                    lead.name = apollo_service.person_display_name(person)
                if person.get("title"):
                    lead.title = person.get("title")
                org = person.get("organization") or {}
                if isinstance(org, dict) and org.get("name"):
                    lead.company = org.get("name")

            email = apollo_service.extract_email(person) if want_email else None
            phone_sync = apollo_service.extract_phone_sync(person) if want_wa else None
            fb_url = None
            if want_fb:
                fb_url = (
                    apollo_service.extract_facebook_url(person)
                    or apollo_service.extract_facebook_url(lead.raw or {})
                )
            if email:
                lead.email = email
            if phone_sync:
                lead.phone = phone_sync
            if fb_url:
                lead.facebook_url = fb_url

            lead.status = "enriched"
            lead.save()
            job.enriched_count = ProspectLead.objects.filter(
                job=job, status__in=["enriched", "awaiting_phone", "contacted"]
            ).count()
            job.save(update_fields=["enriched_count", "updated_at"])

            sent_any = False

            if want_email and lead.email:
                ok, err = _contact_and_send(
                    job=job,
                    lead=lead,
                    agent=agent,
                    source="email",
                    contact_info=lead.email,
                )
                if ok:
                    sent_any = True
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
                    lead.skip_reason = err
                    lead.save(update_fields=["skip_reason", "updated_at"])
                    job.failed_count += 1
                    job.save(update_fields=["failed_count", "updated_at"])
                time.sleep(SEND_DELAY_SECONDS)

            if want_wa and lead.phone:
                ok, err = _contact_and_send(
                    job=job,
                    lead=lead,
                    agent=agent,
                    source="whatsapp",
                    contact_info=lead.phone,
                )
                if ok:
                    sent_any = True
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
                    lead.skip_reason = err
                    lead.save(update_fields=["skip_reason", "updated_at"])
                    job.failed_count += 1
                    job.save(update_fields=["failed_count", "updated_at"])
                time.sleep(SEND_DELAY_SECONDS)
            elif want_wa and not lead.phone:
                lead.status = "awaiting_phone"
                lead.save(update_fields=["status", "updated_at"])

            if want_fb:
                if lead.facebook_url:
                    added = _add_facebook_contact(job=job, lead=lead)
                    if added and not sent_any and not lead.skip_reason:
                        lead.skip_reason = FB_MANUAL_REASON
                        lead.save(update_fields=["skip_reason", "updated_at"])
                elif not sent_any and not lead.skip_reason:
                    lead.skip_reason = "Aucun profil Facebook trouvé par Apollo."
                    lead.save(update_fields=["skip_reason", "updated_at"])

            if sent_any and lead.status != "awaiting_phone":
                lead.status = "contacted"
                lead.save(update_fields=["status", "updated_at"])

            if consecutive_failures >= CONSECUTIVE_SEND_FAILURES_ABORT:
                raise RuntimeError(
                    f"Arrêt après {CONSECUTIVE_SEND_FAILURES_ABORT} échecs d'envoi consécutifs."
                )


def _contact_and_send(
    *,
    job: ProspectSearchJob,
    lead: ProspectLead,
    agent: Agent,
    source: str,
    contact_info: str,
) -> tuple[bool, str]:
    user = job.user
    notes = "Prospect trouvé via Apollo"
    if lead.title:
        notes += f" · {lead.title}"
    if lead.company:
        notes += f" @ {lead.company}"

    contact, created = Contact.objects.get_or_create(
        user=user,
        source=source,
        contact_info=contact_info,
        defaults={
            "name": lead.name,
            "notes": notes,
            "company": lead.company,
            "title": lead.title,
            "apollo_id": lead.apollo_person_id,
            "status": "new",
        },
    )
    if not created:
        # Already in CRM - still try outreach if never contacted, else skip send duplicate spam
        updated = False
        if not contact.apollo_id:
            contact.apollo_id = lead.apollo_person_id
            updated = True
        if lead.company and not contact.company:
            contact.company = lead.company
            updated = True
        if lead.title and not contact.title:
            contact.title = lead.title
            updated = True
        if updated:
            contact.save()

        if contact.status != "new" and ChatMessage.objects.filter(
            user=user, contact_info=contact_info, source=source, sender="ai"
        ).exists():
            if source == "email":
                lead.contact_email = contact
            else:
                lead.contact_wa = contact
            lead.save()
            return False, "Déjà contacté (doublon CRM)"

    if source == "email":
        lead.contact_email = contact
    else:
        lead.contact_wa = contact
    lead.save()

    ok, msg = send_agent_intro(user, contact, agent)
    if ok:
        job.sent_count += 1
        job.save(update_fields=["sent_count", "updated_at"])
        return True, msg
    return False, msg


def _add_facebook_contact(*, job: ProspectSearchJob, lead: ProspectLead) -> bool:
    """
    Add the prospect to the CRM with its Facebook profile URL.
    No auto-send: Messenger only allows messaging PSIDs (people who already
    wrote to the Page), so the outreach must be done manually from the profile.
    """
    user = job.user
    notes = "Prospect trouvé via Apollo (profil Facebook)"
    if lead.title:
        notes += f" · {lead.title}"
    if lead.company:
        notes += f" @ {lead.company}"

    try:
        contact, created = Contact.objects.get_or_create(
            user=user,
            source="facebook",
            contact_info=lead.facebook_url,
            defaults={
                "name": lead.name,
                "notes": notes,
                "company": lead.company,
                "title": lead.title,
                "apollo_id": lead.apollo_person_id,
                "status": "new",
            },
        )
    except Exception as exc:
        logger.error("Ajout contact Facebook impossible (lead %s): %s", lead.id, exc)
        return False

    if not created:
        updated = False
        if not contact.apollo_id:
            contact.apollo_id = lead.apollo_person_id
            updated = True
        if lead.company and not contact.company:
            contact.company = lead.company
            updated = True
        if lead.title and not contact.title:
            contact.title = lead.title
            updated = True
        if updated:
            contact.save()

    lead.contact_fb = contact
    lead.save(update_fields=["contact_fb", "updated_at"])
    return True


def handle_apollo_phone_webhook(payload: dict, job_id: Optional[int] = None, lead_id: Optional[int] = None) -> dict:
    """Process async phone reveal from Apollo; create WA contacts + auto-send."""
    parsed = apollo_service.parse_phone_webhook_payload(payload)
    processed = 0
    sent = 0
    errors = []

    for item in parsed:
        person_id = item["person_id"]
        phone = item["phone"]
        qs = ProspectLead.objects.filter(apollo_person_id=person_id).select_related(
            "job", "job__agent", "job__user"
        )
        if lead_id:
            qs = qs.filter(id=lead_id)
        if job_id:
            qs = qs.filter(job_id=job_id)
        # Prefer awaiting leads
        lead = qs.filter(status="awaiting_phone").order_by("-id").first() or qs.order_by("-id").first()
        if not lead:
            errors.append(f"Lead introuvable pour person_id={person_id}")
            continue

        job = lead.job
        agent = job.agent
        if not agent:
            errors.append(f"Pas d'agent pour job {job.id}")
            continue

        _, want_wa, _ = channels_wanted(job.channels)
        if not want_wa:
            continue
        if not channel_connected(job.user, "whatsapp"):
            lead.skip_reason = "WhatsApp non connecté"
            lead.status = "skipped"
            lead.save(update_fields=["skip_reason", "status", "updated_at"])
            continue

        lead.phone = phone
        lead.save(update_fields=["phone", "updated_at"])
        processed += 1

        ok, err = _contact_and_send(
            job=job,
            lead=lead,
            agent=agent,
            source="whatsapp",
            contact_info=phone,
        )
        if ok:
            sent += 1
            lead.status = "contacted"
            lead.save(update_fields=["status", "updated_at"])
            time.sleep(SEND_DELAY_SECONDS)
        else:
            lead.skip_reason = err
            if lead.status == "awaiting_phone":
                lead.status = "failed"
            lead.save(update_fields=["skip_reason", "status", "updated_at"])
            job.failed_count += 1
            job.save(update_fields=["failed_count", "updated_at"])
            errors.append(err)

    return {"processed": processed, "sent": sent, "errors": errors}
