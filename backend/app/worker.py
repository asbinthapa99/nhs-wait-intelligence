import os
import smtplib
from email.mime.text import MIMEText
from celery import Celery
from celery.signals import task_failure
from .config import settings

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@task_failure.connect
def handle_task_failure(sender=None, task_id=None, exception=None, args=None, kwargs=None, traceback=None, einfo=None, **extra):
    """Global failure handler to notify via email when any background task fails."""
    if not settings.smtp_host or not settings.alert_email:
        return

    subject = f"🚨 Background Task Failed: {sender.name if sender else 'Unknown'}"
    body = (
        f"Task ID: {task_id}\n"
        f"Exception: {exception}\n\n"
        f"Traceback:\n{traceback}"
    )
    
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = "NHS Intelligence Worker"
    msg["To"] = settings.alert_email

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
    except Exception as e:
        print(f"Failed to send alert email: {e}")

@celery_app.task(name="agent_query_task", bind=True)
def run_agent_query(self, question: str):
    """Background task to run the Text-to-SQL logic without blocking FastAPI."""
    from .services.agent import get_sql_agent_response
    # Logic to emit websockets would go here
    return get_sql_agent_response(question)

