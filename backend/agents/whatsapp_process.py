"""
Manage per-user Baileys WhatsApp Node processes.

Started automatically from the Magia UI so users never run `node index.js` manually.
"""
from __future__ import annotations

import logging
import os
import signal
import subprocess
import threading
import time
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_processes: Dict[str, subprocess.Popen] = {}

SERVICE_DIR = Path(__file__).resolve().parent.parent / "whatsapp_service"
INDEX_JS = SERVICE_DIR / "index.js"
# Baileys sessions live next to agents/ (backend/auth_info_{user})
AUTH_ROOT = Path(__file__).resolve().parent.parent


def _user_key(user_id) -> str:
    return str(user_id)


def auth_dir_for_user(user_id) -> Path:
    return AUTH_ROOT / f"auth_info_{_user_key(user_id)}"


def clear_auth_for_user(user_id) -> bool:
    """
    Delete Baileys credentials so the next start always requires a QR scan.
    Security: no silent reconnect after disconnect.
    """
    import shutil

    auth_dir = auth_dir_for_user(user_id)
    if not auth_dir.exists():
        return False
    try:
        shutil.rmtree(auth_dir)
        logger.info("Cleared WhatsApp auth session for user %s (%s)", user_id, auth_dir)
        return True
    except Exception as exc:
        logger.exception("Failed to clear WhatsApp auth for %s: %s", user_id, exc)
        return False


def disconnect_for_user(user_id) -> bool:
    """Stop the Node process and wipe credentials (must rescan to reconnect)."""
    stopped = stop_for_user(user_id)
    clear_auth_for_user(user_id)
    return stopped


def is_running(user_id) -> bool:
    key = _user_key(user_id)
    with _lock:
        proc = _processes.get(key)
        if not proc:
            return False
        if proc.poll() is not None:
            _processes.pop(key, None)
            return False
        return True


def stop_for_user(user_id) -> bool:
    key = _user_key(user_id)
    with _lock:
        proc = _processes.pop(key, None)
    if not proc:
        return False
    try:
        if proc.poll() is None:
            proc.send_signal(signal.SIGTERM)
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=3)
        logger.info("Stopped WhatsApp process for user %s", key)
        return True
    except Exception as exc:
        logger.exception("Failed to stop WhatsApp process for %s: %s", key, exc)
        return False


def restart_for_user(user, auth_token: str = "") -> dict:
    """Stop then start so Node reloads index.js and opens a fresh socket."""
    stop_for_user(user.id)
    time.sleep(0.5)
    return start_for_user(user, auth_token=auth_token, force_restart=False)


def start_for_user(user, auth_token: str = "", force_restart: bool = False) -> dict:
    """
    Ensure a Baileys process is running for this Magia user.
    Returns {started: bool, already_running: bool, pid: int|None, error: str|None}
    """
    if not INDEX_JS.exists():
        return {
            "started": False,
            "already_running": False,
            "pid": None,
            "error": f"Service WhatsApp introuvable ({INDEX_JS}).",
        }

    key = _user_key(user.id)
    if force_restart and is_running(user.id):
        stop_for_user(user.id)
        time.sleep(0.5)

    if is_running(user.id):
        with _lock:
            pid = _processes[key].pid
        return {
            "started": False,
            "already_running": True,
            "pid": pid,
            "error": None,
        }

    node = os.environ.get("NODE_BINARY", "node")
    api_base = os.environ.get("API_BASE", "http://127.0.0.1:8000/api")
    cmd = [node, str(INDEX_JS), "--user", key]
    if auth_token:
        cmd.extend(["--token", auth_token])

    env = os.environ.copy()
    env["API_BASE"] = api_base

    try:
        # Detach from Django's stdin; keep stdout/stderr for debugging via PIPE → DEVNULL
        # to avoid filling buffers. Logs still go through Node's console to DEVNULL;
        # use a log file if needed later.
        log_path = SERVICE_DIR / f"wa_{key}.log"
        log_file = open(log_path, "a", encoding="utf-8")
        proc = subprocess.Popen(
            cmd,
            cwd=str(SERVICE_DIR),
            env=env,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
        # Give Node a moment to crash on missing deps
        time.sleep(0.4)
        if proc.poll() is not None:
            log_file.close()
            return {
                "started": False,
                "already_running": False,
                "pid": None,
                "error": (
                    f"Le service WhatsApp s'est arrêté immédiatement (code {proc.returncode}). "
                    f"Vérifiez {log_path} et lancez `npm install` dans whatsapp_service."
                ),
            }

        with _lock:
            # Stop any stale entry
            old = _processes.get(key)
            if old and old.poll() is None and old.pid != proc.pid:
                try:
                    old.send_signal(signal.SIGTERM)
                except Exception:
                    pass
            _processes[key] = proc

        logger.info("Started WhatsApp process for user %s (pid=%s)", key, proc.pid)
        return {
            "started": True,
            "already_running": False,
            "pid": proc.pid,
            "error": None,
        }
    except FileNotFoundError:
        return {
            "started": False,
            "already_running": False,
            "pid": None,
            "error": "Node.js introuvable. Installez Node 20+ ou définissez NODE_BINARY.",
        }
    except Exception as exc:
        logger.exception("Failed to start WhatsApp for %s: %s", key, exc)
        return {
            "started": False,
            "already_running": False,
            "pid": None,
            "error": str(exc),
        }


def wait_for_qr(user, timeout_seconds: float = 25.0, poll_interval: float = 0.8) -> Optional[str]:
    """Poll WhatsAppConfig.qr_code until set or timeout."""
    from .models import WhatsAppConfig

    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        config = WhatsAppConfig.objects.filter(user=user).order_by("-id").first()
        if config and config.qr_code:
            return config.qr_code
        if config and config.is_connected:
            return None
        time.sleep(poll_interval)
    return None
