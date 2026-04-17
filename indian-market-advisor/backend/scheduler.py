import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler()
_refresh_job = None


def start_scheduler(refresh_fn, interval_minutes: int = 15):
    global _refresh_job

    try:
        refresh_fn()
    except Exception as e:
        logger.error(f"Initial refresh failed: {e}")

    _refresh_job = _scheduler.add_job(
        refresh_fn,
        trigger=IntervalTrigger(minutes=interval_minutes),
        id="market_refresh",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    if not _scheduler.running:
        _scheduler.start()
        logger.info(f"Scheduler started — refreshing every {interval_minutes} minutes")


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
