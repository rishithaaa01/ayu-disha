from fastapi import APIRouter, Depends
from database import get_database
from middleware.auth_middleware import get_current_user, require_role
from models.user import UserResponse
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/stats")
async def get_admin_stats(current_user: UserResponse = Depends(require_role("admin", "doctor", "pho"))):
    db = get_database()
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_patients  = await db.patients.count_documents({})
    total_doctors   = await db.users.count_documents({"role": "doctor"})
    total_asha      = await db.users.count_documents({"role": "asha"})
    total_hospitals = await db.hospitals.count_documents({})
    visits_today    = await db.visits.count_documents({"created_at": {"$gte": today_start}})
    referrals_pending = await db.referrals.count_documents({"status": "pending"})
    high_risk_hh    = await db.households.count_documents({"risk_level": "red"})
    consents_active = await db.consents.count_documents({
        "revoked": False,
        "expires_at": {"$gt": now}
    })

    return {
        "total_patients":       total_patients,
        "total_doctors":        total_doctors,
        "total_asha_workers":   total_asha,
        "total_hospitals":      total_hospitals,
        "visits_today":         visits_today,
        "referrals_pending":    referrals_pending,
        "high_risk_households": high_risk_hh,
        "consents_active":      consents_active,
    }


@router.get("/activity")
async def get_recent_activity(current_user: UserResponse = Depends(require_role("admin", "doctor", "pho"))):
    db = get_database()
    activities = []

    # Last 5 referrals
    referrals = await db.referrals.find({}).sort("created_at", -1).limit(5).to_list(5)
    for r in referrals:
        worker_name = r.get("from_worker_name", "ASHA Worker")
        created = r.get("created_at", datetime.utcnow())
        diff = datetime.utcnow() - created
        minutes = int(diff.total_seconds() / 60)
        time_str = f"{minutes} min ago" if minutes < 60 else f"{int(minutes/60)} hr ago"
        activities.append({
            "type": "referral",
            "message": f"{worker_name} sent a referral (urgency: {r.get('urgency', 'routine')})",
            "time": time_str,
            "severity": "urgent" if r.get("urgency") in ["Today", "Immediate"] else "normal"
        })

    # Last 5 completed visits
    visits = await db.visits.find({"status": "completed"}).sort("created_at", -1).limit(5).to_list(5)
    for v in visits:
        created = v.get("created_at", datetime.utcnow())
        diff = datetime.utcnow() - created
        minutes = int(diff.total_seconds() / 60)
        time_str = f"{minutes} min ago" if minutes < 60 else f"{int(minutes/60)} hr ago"
        activities.append({
            "type": "visit",
            "message": f"Consultation completed at {v.get('hospital_id', 'hospital')}",
            "time": time_str,
            "severity": "normal"
        })

    # Last 5 new users
    new_users = await db.users.find({}).sort("created_at", -1).limit(5).to_list(5)
    for u in new_users:
        created = u.get("created_at", datetime.utcnow())
        diff = datetime.utcnow() - created
        minutes = int(diff.total_seconds() / 60)
        time_str = f"{minutes} min ago" if minutes < 60 else f"{int(minutes/60)} hr ago"
        activities.append({
            "type": "registration",
            "message": f"New {u.get('role', 'user')} registered: {u.get('name', 'Unknown')}",
            "time": time_str,
            "severity": "normal"
        })

    # Sort by recency (approximate — all have time strings, sort by created_at from original docs)
    activities = activities[:10]
    return activities
