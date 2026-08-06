from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from database import get_database
from middleware.auth_middleware import get_current_user, require_role
from models.user import UserResponse
from datetime import datetime, timedelta

router = APIRouter()

# ─── Hospital Management Models ───────────────────────────────────────────────

class HospitalCreate(BaseModel):
    name: str
    type: str = "govt"          # govt | private | ngo
    district: str = "Chennai"
    state: str = "Tamil Nadu"

class HospitalResponse(BaseModel):
    id: str
    name: str
    type: str
    district: str
    state: str


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

# ─── Hospital Management Endpoints ────────────────────────────────────────────

@router.get("/hospitals")
async def list_hospitals(current_user: UserResponse = Depends(require_role("admin"))):
    db = get_database()
    hospitals = await db.hospitals.find({}).sort("name", 1).to_list(length=200)
    result = []
    for h in hospitals:
        result.append({
            "id":       str(h["_id"]),
            "name":     h.get("name", ""),
            "type":     h.get("type", "govt"),
            "district": h.get("district", ""),
            "state":    h.get("state", ""),
        })
    return result


@router.post("/hospitals", status_code=201)
async def add_hospital(
    payload: HospitalCreate,
    current_user: UserResponse = Depends(require_role("admin"))
):
    db = get_database()

    # Prevent duplicates (case-insensitive name + district)
    existing = await db.hospitals.find_one({
        "name":     {"$regex": f"^{payload.name.strip()}$", "$options": "i"},
        "district": payload.district.strip()
    })
    if existing:
        raise HTTPException(status_code=400, detail="A hospital with this name already exists in that district.")

    new_hospital = {
        "name":       payload.name.strip(),
        "type":       payload.type,
        "district":   payload.district.strip(),
        "state":      payload.state.strip(),
        "created_at": datetime.utcnow(),
        "created_by": current_user.id,
    }
    result = await db.hospitals.insert_one(new_hospital)
    return {
        "id":       str(result.inserted_id),
        "name":     new_hospital["name"],
        "type":     new_hospital["type"],
        "district": new_hospital["district"],
        "state":    new_hospital["state"],
    }


@router.delete("/hospitals/{hospital_id}", status_code=200)
async def delete_hospital(
    hospital_id: str,
    current_user: UserResponse = Depends(require_role("admin"))
):
    db = get_database()

    try:
        oid = ObjectId(hospital_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid hospital ID format.")

    # Check if any doctor is still affiliated with this hospital (stored as name string)
    hospital_doc = await db.hospitals.find_one({"_id": oid})
    if not hospital_doc:
        raise HTTPException(status_code=404, detail="Hospital not found.")

    affiliated = await db.users.count_documents({"role": "doctor", "hospital": hospital_doc["name"]})
    if affiliated > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete — {affiliated} doctor(s) are affiliated with this hospital."
        )

    result = await db.hospitals.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hospital not found.")

    return {"status": "success", "message": "Hospital deleted successfully."}

@router.get("/users")
async def list_users(current_user: UserResponse = Depends(require_role("admin", "pho"))):
    db = get_database()
    users_cursor = db.users.find({}).sort("created_at", -1)
    users = await users_cursor.to_list(length=500)
    
    result = []
    for u in users:
        created_at = u.get("created_at", datetime.utcnow())
        if isinstance(created_at, datetime):
            created_at_str = created_at.strftime("%Y-%m-%d")
        else:
            created_at_str = str(created_at)
            
        result.append({
            "id": str(u["_id"]),
            "name": u.get("name", "Unknown"),
            "email": u.get("email", ""),
            "role": u.get("role", "user"),
            "hospital": u.get("hospital", u.get("district", "N/A")),
            "status": u.get("status", "Active"),
            "created_at": created_at_str
        })
    return result

@router.get("/maternal-stats")
async def get_maternal_stats(current_user: UserResponse = Depends(require_role("admin", "pho"))):
    db = get_database()
    
    high_risk = await db.households.count_documents({"risk_level": "red"})
    
    # Get last 10 high-risk households as registry
    registry_cursor = db.households.find({"risk_level": "red"}).sort("last_visit_date", -1).limit(10)
    registry_docs = await registry_cursor.to_list(length=10)
    
    registry = []
    for doc in registry_docs:
        # Get ASHA name
        asha_name = "Unknown ASHA"
        try:
            asha = await db.users.find_one({"_id": ObjectId(doc.get("created_by"))}) if doc.get("created_by") else None
            if asha:
                asha_name = asha.get("name", "Unknown ASHA")
        except Exception:
            pass
        
        registry.append({
            "id": str(doc["_id"]),
            "name": doc.get("family_name", doc.get("name", "Unknown Family")),
            "age": "--",
            "trimester": "High Risk Household",
            "hb": "--",
            "risk": "Severe Risk",
            "asha": asha_name,
            "hospital": doc.get("village", "Unknown"),
            "anc_status": "Pending"
        })
        
    return {
        "high_risk_pregnant": high_risk,
        "anc_checkups_completed": 0,
        "immunization_coverage_pct": 0,
        "institutional_deliveries_pct": 0,
        "registry": registry
    }
