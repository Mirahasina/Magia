"""
Apollo.io API client for people search + enrichment.
"""
from __future__ import annotations

import logging
import re
from typing import Any
from urllib.parse import quote

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

APOLLO_BASE = "https://api.apollo.io/api/v1"


class ApolloError(Exception):
    def __init__(self, message: str, status_code: int | None = None, payload: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


def _api_key() -> str:
    key = (getattr(settings, "APOLLO_API_KEY", None) or "").strip()
    if not key:
        raise ApolloError(
            "APOLLO_API_KEY manquante. Ajoutez-la dans backend/.env puis redémarrez Django."
        )
    return key


def _headers() -> dict:
    return {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": _api_key(),
    }


def search_people(filters: dict, *, page: int = 1, per_page: int = 25) -> dict:
    """
    People Search - does not return emails/phones.
    POST /mixed_people/api_search
    """
    body: dict[str, Any] = {
        "page": page,
        "per_page": min(max(per_page, 1), 100),
    }
    # Map Magia UI filters → Apollo params
    if filters.get("person_titles"):
        titles = filters["person_titles"]
        body["person_titles"] = titles if isinstance(titles, list) else [t.strip() for t in str(titles).split(",") if t.strip()]
    if filters.get("person_locations"):
        locs = filters["person_locations"]
        body["person_locations"] = locs if isinstance(locs, list) else [t.strip() for t in str(locs).split(",") if t.strip()]
    if filters.get("organization_locations"):
        locs = filters["organization_locations"]
        body["organization_locations"] = locs if isinstance(locs, list) else [t.strip() for t in str(locs).split(",") if t.strip()]
    if filters.get("q_organization_keyword_tags"):
        tags = filters["q_organization_keyword_tags"]
        body["q_organization_keyword_tags"] = tags if isinstance(tags, list) else [t.strip() for t in str(tags).split(",") if t.strip()]
    if filters.get("organization_industry_tag_ids"):
        body["organization_industry_tag_ids"] = filters["organization_industry_tag_ids"]
    if filters.get("q_keywords"):
        body["q_keywords"] = filters["q_keywords"]
    if filters.get("person_seniorities"):
        sens = filters["person_seniorities"]
        body["person_seniorities"] = sens if isinstance(sens, list) else [t.strip() for t in str(sens).split(",") if t.strip()]
    # Employee ranges e.g. ["1,10", "11,50"]
    if filters.get("organization_num_employees_ranges"):
        ranges = filters["organization_num_employees_ranges"]
        body["organization_num_employees_ranges"] = ranges if isinstance(ranges, list) else [ranges]

    url = f"{APOLLO_BASE}/mixed_people/api_search"
    try:
        resp = requests.post(url, headers=_headers(), json=body, timeout=60)
    except requests.RequestException as exc:
        raise ApolloError(f"Erreur réseau Apollo search: {exc}") from exc

    if resp.status_code >= 400:
        raise ApolloError(
            f"Apollo search HTTP {resp.status_code}: {resp.text[:500]}",
            status_code=resp.status_code,
            payload=_safe_json(resp),
        )
    return resp.json()


def enrich_people(
    people: list[dict],
    *,
    reveal_personal_emails: bool = True,
    reveal_phone_number: bool = False,
    webhook_url: str | None = None,
) -> dict:
    """
    Bulk People Enrichment (max 10 per call).
    POST /people/bulk_match
    """
    if not people:
        return {"matches": []}

    details = []
    for p in people[:10]:
        detail: dict[str, Any] = {}
        if p.get("id"):
            detail["id"] = p["id"]
        if p.get("first_name"):
            detail["first_name"] = p["first_name"]
        if p.get("last_name"):
            detail["last_name"] = p["last_name"]
        if p.get("name"):
            detail["name"] = p["name"]
        if p.get("organization_name"):
            detail["organization_name"] = p["organization_name"]
        if p.get("domain"):
            detail["domain"] = p["domain"]
        if detail:
            details.append(detail)

    params: dict[str, Any] = {
        "reveal_personal_emails": str(reveal_personal_emails).lower(),
        "reveal_phone_number": str(reveal_phone_number).lower(),
    }
    if reveal_phone_number:
        if not webhook_url:
            raise ApolloError("webhook_url requis lorsque reveal_phone_number=true")
        params["webhook_url"] = webhook_url

    url = f"{APOLLO_BASE}/people/bulk_match"
    try:
        resp = requests.post(
            url,
            headers=_headers(),
            params=params,
            json={"details": details},
            timeout=90,
        )
    except requests.RequestException as exc:
        raise ApolloError(f"Erreur réseau Apollo enrich: {exc}") from exc

    if resp.status_code >= 400:
        raise ApolloError(
            f"Apollo enrich HTTP {resp.status_code}: {resp.text[:500]}",
            status_code=resp.status_code,
            payload=_safe_json(resp),
        )
    return resp.json()


def build_phone_webhook_url(job_id: int, lead_id: int | None = None) -> str:
    """
    Public URL Apollo will POST phone results to.
    Requires APOLLO_WEBHOOK_BASE_URL (e.g. https://xxx.ngrok-free.dev).
    """
    base = (getattr(settings, "APOLLO_WEBHOOK_BASE_URL", None) or "").rstrip("/")
    secret = (getattr(settings, "APOLLO_WEBHOOK_SECRET", None) or "").strip()
    if not base:
        raise ApolloError(
            "APOLLO_WEBHOOK_BASE_URL manquante (ex. URL ngrok publique) pour révéler les téléphones."
        )
    path = f"/api/webhooks/apollo/phone/?token={quote(secret)}&job_id={job_id}"
    if lead_id:
        path += f"&lead_id={lead_id}"
    return f"{base}{path}"


def normalize_phone(raw: str | None) -> str | None:
    """Strip to digits; keep leading + if present. Returns None if too short."""
    if not raw:
        return None
    text = str(raw).strip()
    if not text:
        return None
    has_plus = text.startswith("+")
    digits = re.sub(r"\D", "", text)
    if len(digits) < 8:
        return None
    return f"+{digits}" if has_plus else digits


def person_display_name(person: dict) -> str | None:
    name = person.get("name")
    if name:
        return name
    first = person.get("first_name") or ""
    last = person.get("last_name") or person.get("last_name_obfuscated") or ""
    full = f"{first} {last}".strip()
    return full or None


def extract_email(person: dict) -> str | None:
    email = person.get("email")
    if email and isinstance(email, str) and "@" in email and "email_not_unlocked" not in email.lower():
        return email.strip().lower()
    for key in ("personal_emails", "emails"):
        vals = person.get(key) or []
        if isinstance(vals, list):
            for v in vals:
                if isinstance(v, str) and "@" in v:
                    return v.strip().lower()
                if isinstance(v, dict) and v.get("email"):
                    return str(v["email"]).strip().lower()
    return None


def extract_facebook_url(person: dict) -> str | None:
    """Facebook profile URL when Apollo exposes it (search or enrichment payload)."""
    for key in ("facebook_url", "facebook"):
        val = person.get(key)
        if isinstance(val, str) and "facebook.com" in val.lower():
            return val.strip()
    org = person.get("organization") or {}
    if isinstance(org, dict):
        val = org.get("facebook_url")
        if isinstance(val, str) and "facebook.com" in val.lower():
            return val.strip()
    return None


def extract_phone_sync(person: dict) -> str | None:
    """Best-effort phone from sync enrich response (org phone or already-revealed)."""
    for key in ("phone_numbers", "sanitized_phone", "mobile_phone"):
        val = person.get(key)
        if isinstance(val, str):
            n = normalize_phone(val)
            if n:
                return n
        if isinstance(val, list):
            for item in val:
                if isinstance(item, str):
                    n = normalize_phone(item)
                    if n:
                        return n
                if isinstance(item, dict):
                    n = normalize_phone(item.get("sanitized_number") or item.get("raw_number") or item.get("number"))
                    if n:
                        return n
    org = person.get("organization") or {}
    if isinstance(org, dict):
        return normalize_phone(org.get("phone") or org.get("primary_phone"))
    return None


def parse_phone_webhook_payload(payload: dict) -> list[dict]:
    """
    Normalize Apollo phone webhook payloads into
    [{person_id, phone, phones: [...]}].
    """
    results = []
    if not isinstance(payload, dict):
        return results

    # Common shapes
    people = payload.get("people") or payload.get("matches") or []
    if isinstance(people, list) and people:
        for p in people:
            if not isinstance(p, dict):
                continue
            pid = str(p.get("id") or p.get("person_id") or "")
            phones = []
            for item in p.get("phone_numbers") or []:
                if isinstance(item, dict):
                    n = normalize_phone(item.get("sanitized_number") or item.get("raw_number") or item.get("number"))
                else:
                    n = normalize_phone(str(item))
                if n:
                    phones.append(n)
            single = normalize_phone(p.get("sanitized_phone") or p.get("phone"))
            if single and single not in phones:
                phones.insert(0, single)
            if pid and phones:
                results.append({"person_id": pid, "phone": phones[0], "phones": phones})
        return results

    # Single person
    pid = str(payload.get("id") or payload.get("person_id") or "")
    phones = []
    for item in payload.get("phone_numbers") or []:
        if isinstance(item, dict):
            n = normalize_phone(item.get("sanitized_number") or item.get("raw_number") or item.get("number"))
        else:
            n = normalize_phone(str(item))
        if n:
            phones.append(n)
    if pid and phones:
        results.append({"person_id": pid, "phone": phones[0], "phones": phones})
    return results


def _safe_json(resp: requests.Response) -> Any:
    try:
        return resp.json()
    except Exception:
        return resp.text[:500]
