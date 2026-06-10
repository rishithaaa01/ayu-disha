from fastapi import APIRouter, Depends
from database import get_database
from middleware.auth_middleware import get_current_user, require_role
from models.user import UserResponse
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/stats")
async def get_pho_stats(current_user: UserResponse = Depends(require_role("pho", "admin"))):
    db = get_database()
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    active_asha      = await db.users.count_documents({"role": "asha"})
    high_risk_hh     = await db.households.count_documents({"risk_level": "red"})
    referrals_month  = await db.referrals.count_documents({"created_at": {"$gte": month_start}})
    disease_alerts   = await db.referrals.count_documents({
        "status": "pending",
        "urgency": {"$in": ["Today", "Immediate"]}
    })
    maternal_cases   = await db.visits.count_documents({
        "created_at": {"$gte": month_start},
        "chief_complaint": {"$regex": "maternal|pregnancy|antenatal|postnatal|delivery", "$options": "i"}
    })

    # Estimate population covered: each ASHA covers ~1000 people on average
    total_population = active_asha * 1000

    return {
        "total_population_covered": total_population,
        "active_asha_workers":      active_asha,
        "high_risk_households":     high_risk_hh,
        "referrals_this_month":     referrals_month,
        "immunization_coverage":    None,   # requires separate immunization module
        "maternal_health_cases":    maternal_cases,
        "disease_alerts":           disease_alerts,
    }


@router.get("/asha-performance")
async def get_asha_performance(current_user: UserResponse = Depends(require_role("pho", "admin"))):
    db = get_database()
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    asha_workers = await db.users.find({"role": "asha"}).to_list(100)
    results = []

    for worker in asha_workers:
        wid = str(worker["_id"])
        households = await db.households.count_documents({"created_by": wid})
        visits     = await db.asha_visits.count_documents({
            "asha_id": wid,
            "created_at": {"$gte": month_start}
        })
        referrals  = await db.referrals.count_documents({
            "asha_id": wid,
            "created_at": {"$gte": month_start}
        })
        # Simple score: weighted by visits and referrals relative to households
        score = min(100, int(
            (visits / max(households, 1)) * 60 +
            (referrals / max(visits, 1)) * 40
        )) if households > 0 else 0

        results.append({
            "name":       worker.get("name", "Unknown"),
            "village":    worker.get("village", "—"),
            "households": households,
            "visits":     visits,
            "referrals":  referrals,
            "score":      score,
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results


@router.get("/disease-surveillance")
async def get_disease_surveillance(current_user: UserResponse = Depends(require_role("pho", "admin"))):
    """
    Aggregates diagnoses from completed visits to surface disease trends.
    """
    db = get_database()
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

    visits = await db.visits.find({
        "status": "completed",
        "created_at": {"$gte": prev_month_start}
    }).to_list(1000)

    # Count diagnoses per disease this month vs last
    this_month: dict = {}
    last_month: dict = {}

    for v in visits:
        is_this_month = v.get("created_at", now) >= month_start
        target = this_month if is_this_month else last_month
        district = v.get("hospital_id", "Unknown")
        for diag in v.get("diagnosis", []):
            name = str(diag).strip()
            if not name:
                continue
            if name not in target:
                target[name] = {"cases": 0, "district": district}
            target[name]["cases"] += 1

    results = []
    all_diseases = set(list(this_month.keys()) + list(last_month.keys()))
    for name in all_diseases:
        this = this_month.get(name, {}).get("cases", 0)
        last = last_month.get(name, {}).get("cases", 0)
        if this == 0 and last == 0:
            continue
        trend = "up" if this > last else ("down" if this < last else "stable")
        results.append({
            "name":     name,
            "cases":    this,
            "trend":    trend,
            "district": this_month.get(name, last_month.get(name, {})).get("district", "Unknown"),
        })

    results.sort(key=lambda x: x["cases"], reverse=True)
    return results[:20]


@router.get("/alerts")
async def get_health_alerts(current_user: UserResponse = Depends(require_role("pho", "admin"))):
    """Returns pending urgent referrals and high-risk household flags as health alerts."""
    db = get_database()
    now = datetime.utcnow()
    alerts = []

    # Urgent referrals not yet accepted
    urgent_refs = await db.referrals.find({
        "status": "pending",
        "urgency": {"$in": ["Today", "Immediate"]}
    }).sort("created_at", -1).limit(10).to_list(10)

    for r in urgent_refs:
        created = r.get("created_at", now)
        diff    = now - created
        hours   = int(diff.total_seconds() / 3600)
        time_str = f"{hours} hr ago" if hours >= 1 else f"{int(diff.total_seconds()/60)} min ago"
        alerts.append({
            "title":    "Urgent Referral Pending",
            "desc":     r.get("ai_summary") or r.get("notes") or "Patient referred for urgent clinical review.",
            "severity": "high",
            "time":     time_str,
            "district": r.get("to_hospital_id", "Unknown"),
        })

    # High-risk households
    red_hh = await db.households.find({"risk_level": "red"}).sort("last_visit_date", 1).limit(5).to_list(5)
    for h in red_hh:
        last_visit = h.get("last_visit_date")
        time_str = last_visit.strftime("%d %b") if last_visit else "Never visited"
        alerts.append({
            "title":    f"High-Risk Household: {h.get('family_name', 'Unknown Family')}",
            "desc":     f"Household in {h.get('village', 'unknown village')} flagged as high-risk. Last visit: {time_str}.",
            "severity": "medium",
            "time":     time_str,
            "district": h.get("district", "Unknown"),
        })

    return alerts
