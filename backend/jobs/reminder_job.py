import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from database import get_database
import logging

logger = logging.getLogger(__name__)

async def check_and_send_reminders():
    """
    Checks for pending reminders scheduled for today and 'sends' them (logs them).
    """
    logger.info("⏰ Running Monthly/Daily Reminder Job...")
    db = get_database()
    if db is None:
        logger.error("Database not available for reminder job.")
        return

    now = datetime.utcnow()
    
    # 1. Find unsent reminders due before or at now
    cursor = db.scheduled_reminders.find({
        "reminder_date": {"$lte": now},
        "sent": False
    })
    
    reminders = await cursor.to_list(length=100)
    
    for rem in reminders:
        # MOCK NOTIFICATION LOGIC
        # In production, this would call FCM (Firebase Cloud Messaging)
        logger.info(f"🔔 NOTIFICATION SENT to Patient {rem['patient_id']}: {rem['message']}")
        
        # Mark as sent
        await db.scheduled_reminders.update_one(
            {"_id": rem["_id"]},
            {"$set": {"sent": True, "sent_at": now}}
        )

def start_scheduler():
    scheduler = AsyncIOScheduler()
    # Runs every hour for the demo, or we can use a cron style
    scheduler.add_job(check_and_send_reminders, 'interval', minutes=60)
    scheduler.start()
    logger.info("🚀 APScheduler Started: Automated reminders active.")
    return scheduler
