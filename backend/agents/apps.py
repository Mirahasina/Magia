import logging
import os
import sys
import threading

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class AgentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'agents'

    def ready(self):
        if os.environ.get('FOLLOWUP_SCHEDULER_ENABLED', 'true').lower() in ('0', 'false', 'no'):
            return

        # Under Django runserver autoreload, only start in the child process
        is_runserver = any('runserver' in arg for arg in sys.argv)
        if is_runserver and os.environ.get('RUN_MAIN') != 'true':
            return

        interval = int(os.environ.get('FOLLOWUP_SCHEDULER_INTERVAL_SECONDS', '3600'))
        self._start_followup_scheduler(interval)

    def _start_followup_scheduler(self, interval_seconds: int):
        if getattr(AgentsConfig, '_followup_scheduler_started', False):
            return
        AgentsConfig._followup_scheduler_started = True

        def _loop():
            stop = threading.Event()
            # Delay first run so DB/migrations are ready after boot
            stop.wait(min(90, max(30, interval_seconds // 4)))
            while True:
                try:
                    from django.core.management import call_command
                    call_command('run_followups')
                except Exception as exc:
                    logger.warning("Follow-up scheduler tick failed: %s", exc)
                stop.wait(interval_seconds)

        thread = threading.Thread(
            target=_loop,
            name='magia-followup-scheduler',
            daemon=True,
        )
        thread.start()
        logger.info(
            "Follow-up scheduler started (interval=%ss)",
            interval_seconds,
        )
