import os
import uuid
import tempfile
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from bson import ObjectId
from database import get_database
from middleware.auth_middleware import get_current_user, require_role
from models.user import UserResponse
from config import settings
from groq import AsyncGroq

router = APIRouter()

# ─── Cloudinary Setup ─────────────────────────────────────────────────────────

def get_cloudinary():
    """Lazy-load cloudinary only if configured."""
    if not all([settings.cloudinary_cloud_name, settings.cloudinary_api_key, settings.cloudinary_api_secret]):
        return None
    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True
        )
        return cloudinary
    except ImportError:
        return None


def safe_object_id(id_str: str):
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid ID format: {id_str}")


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def extract_pdf_text(pdf_path: str) -> str:
    """Extract text from PDF using pdfplumber."""
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text.strip())
        return "\n".join(text_parts) if text_parts else ""
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""


async def ai_summarize_report(raw_text: str, test_name: str, patient_name: str) -> dict:
    """Use Groq to extract values and summarize lab report."""
    if not raw_text.strip():
        return {
            "summary": "Report uploaded. Manual review required.",
            "key_values": [],
            "is_abnormal": False,
            "recommendation": "Please review the uploaded PDF report."
        }

    groq_api_key = settings.groq_api_key
    if not groq_api_key:
        return {
            "summary": "AI summary unavailable — Groq API key not configured.",
            "key_values": [],
            "is_abnormal": False,
            "recommendation": "Review report manually."
        }

    prompt = f"""You are a clinical laboratory AI assistant in India.
Analyze this lab report text for patient: {patient_name}
Test: {test_name}

Lab Report Text:
{raw_text[:3000]}

Respond ONLY in this exact JSON format:
{{
  "summary": "2-3 sentence clinical summary of findings in plain English for a doctor",
  "key_values": [
    {{"parameter": "parameter name", "value": "result value with unit", "reference_range": "normal range", "status": "normal/high/low/critical"}}
  ],
  "is_abnormal": true or false,
  "recommendation": "One sentence clinical recommendation or follow-up action"
}}"""

    try:
        client = AsyncGroq(api_key=groq_api_key)
        completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        result = json.loads(completion.choices[0].message.content)

        # Validate and sanitize
        return {
            "summary": str(result.get("summary", ""))[:1000],
            "key_values": result.get("key_values", [])[:20],
            "is_abnormal": bool(result.get("is_abnormal", False)),
            "recommendation": str(result.get("recommendation", ""))[:500]
        }
    except Exception as e:
        print(f"AI summary error: {e}")
        return {
            "summary": "AI analysis failed. Please review the PDF report manually.",
            "key_values": [],
            "is_abnormal": False,
            "recommendation": "Manual review required."
        }


async def upload_pdf_to_cloudinary(file_path: str, lab_order_id: str) -> Optional[str]:
    """Upload PDF to Cloudinary and return the secure URL."""
    cloudinary = get_cloudinary()
    if not cloudinary:
        print("Cloudinary not configured — skipping PDF upload")
        return None

    try:
        result = cloudinary.uploader.upload(
            file_path,
            resource_type="raw",
            folder="ayu_disha/lab_reports",
            public_id=f"lab_{lab_order_id}_{uuid.uuid4().hex[:8]}",
            format="pdf",
            access_mode="public"
        )
        return result.get("secure_url")
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return None


# ─── Lab Endpoints ────────────────────────────────────────────────────────────

@router.get("/pending-orders")
async def get_pending_orders(current_user: UserResponse = Depends(require_role("lab"))):
    """
    Returns all pending lab orders for this lab technician's hospital.
    """
    db = get_database()
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Lab technician is not assigned to any hospital")

    orders = await db.lab_orders.find({
        "hospital_id": current_user.hospital,
        "status": {"$in": ["pending", "ordered"]}
    }).sort("ordered_date", 1).to_list(200)

    results = []
    for o in orders:
        o["_id"] = str(o["_id"])

        # Enrich with patient name
        patient_name = "Unknown Patient"
        try:
            if o.get("patient_id") and len(str(o["patient_id"])) == 24:
                patient = await db.patients.find_one({"_id": ObjectId(o["patient_id"])})
                if patient:
                    patient_name = patient.get("name", "Unknown Patient")
        except Exception:
            pass

        o["patient_name"] = patient_name
        results.append(o)

    return results


@router.get("/completed-orders")
async def get_completed_orders(current_user: UserResponse = Depends(require_role("lab"))):
    """Returns recently resulted lab orders for this lab's hospital."""
    db = get_database()
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Lab technician is not assigned to any hospital")

    orders = await db.lab_orders.find({
        "hospital_id": current_user.hospital,
        "status": "resulted"
    }).sort("result_date", -1).limit(50).to_list(50)

    results = []
    for o in orders:
        o["_id"] = str(o["_id"])
        patient_name = "Unknown Patient"
        try:
            if o.get("patient_id") and len(str(o["patient_id"])) == 24:
                patient = await db.patients.find_one({"_id": ObjectId(o["patient_id"])})
                if patient:
                    patient_name = patient.get("name", "Unknown Patient")
        except Exception:
            pass
        o["patient_name"] = patient_name
        results.append(o)

    return results


@router.post("/upload-result/{lab_order_id}")
async def upload_lab_result(
    lab_order_id: str,
    result_text: str = Form(...),
    notes: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: UserResponse = Depends(require_role("lab"))
):
    """
    Lab technician uploads result:
    - result_text: typed result value (e.g. "HbA1c: 7.2%")
    - file: optional PDF report
    - Extracts PDF text → AI summary → stores everything → notifies doctor & patient
    """
    db = get_database()

    # Verify lab order exists and belongs to this hospital
    lab_order = await db.lab_orders.find_one({"_id": safe_object_id(lab_order_id)})
    if not lab_order:
        raise HTTPException(status_code=404, detail="Lab order not found")
    if lab_order.get("hospital_id") != current_user.hospital:
        raise HTTPException(status_code=403, detail="Access denied to this lab order")

    # Get patient name for AI context
    patient_name = "Unknown Patient"
    try:
        if lab_order.get("patient_id") and len(str(lab_order["patient_id"])) == 24:
            patient = await db.patients.find_one({"_id": ObjectId(lab_order["patient_id"])})
            if patient:
                patient_name = patient.get("name", "Unknown Patient")
    except Exception:
        pass

    pdf_url = None
    pdf_text = ""
    temp_path = None

    # Handle PDF upload
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".pdf"]:
            raise HTTPException(status_code=400, detail="Only PDF files are accepted for lab reports")

        # Save to temp file
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"lab_{uuid.uuid4().hex}.pdf")

        try:
            MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
            file_size = 0
            with open(temp_path, "wb") as f:
                while True:
                    chunk = await file.read(1024 * 1024)
                    if not chunk:
                        break
                    file_size += len(chunk)
                    if file_size > MAX_FILE_SIZE:
                        raise HTTPException(status_code=413, detail="File too large. Max 20MB.")
                    f.write(chunk)

            # Extract text from PDF
            pdf_text = await extract_pdf_text(temp_path)
            print(f"Extracted {len(pdf_text)} chars from PDF")

            # Upload to Cloudinary
            pdf_url = await upload_pdf_to_cloudinary(temp_path, lab_order_id)

        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    # Build combined text for AI (PDF text + manual result)
    combined_text = ""
    if pdf_text:
        combined_text = pdf_text
    elif result_text:
        combined_text = result_text

    # AI summary
    ai_result = await ai_summarize_report(
        combined_text or result_text,
        lab_order.get("test_name", "Lab Test"),
        patient_name
    )

    # Update the lab order
    update_data = {
        "result": result_text.strip(),
        "result_notes": notes,
        "result_date": datetime.utcnow(),
        "resulted_by": current_user.name,
        "resulted_by_id": str(current_user.id),
        "status": "resulted",
        # PDF
        "pdf_url": pdf_url,
        "pdf_text_extracted": pdf_text[:5000] if pdf_text else None,
        # AI
        "ai_summary": ai_result["summary"],
        "ai_key_values": ai_result["key_values"],
        "ai_is_abnormal": ai_result["is_abnormal"],
        "ai_recommendation": ai_result["recommendation"],
    }

    await db.lab_orders.update_one(
        {"_id": safe_object_id(lab_order_id)},
        {"$set": update_data}
    )

    # Create notification records for doctor and patient
    now = datetime.utcnow()
    test_name = lab_order.get("test_name", "Lab Test")
    is_abnormal = ai_result["is_abnormal"]

    # Notify doctor
    doctor_id = lab_order.get("doctor_id") or lab_order.get("ordered_by_id")
    if doctor_id:
        await db.notifications.insert_one({
            "user_id": doctor_id,
            "type": "lab_result",
            "title": f"Lab Result: {test_name}",
            "message": f"Result for {patient_name} — {test_name} is now available.{' ⚠️ Abnormal values detected.' if is_abnormal else ''}",
            "lab_order_id": lab_order_id,
            "patient_id": lab_order.get("patient_id"),
            "is_abnormal": is_abnormal,
            "pdf_url": pdf_url,
            "read": False,
            "created_at": now
        })

    # Notify patient (via user_id lookup from patient record)
    try:
        patient_record = await db.patients.find_one({"_id": ObjectId(lab_order["patient_id"])})
        if patient_record and patient_record.get("user_id"):
            await db.notifications.insert_one({
                "user_id": patient_record["user_id"],
                "type": "lab_result",
                "title": f"Your {test_name} result is ready",
                "message": f"Your lab report from {current_user.hospital} is now available.{' Please consult your doctor — some values need attention.' if is_abnormal else ''}",
                "lab_order_id": lab_order_id,
                "is_abnormal": is_abnormal,
                "pdf_url": pdf_url,
                "read": False,
                "created_at": now
            })
    except Exception as e:
        print(f"Patient notification error: {e}")

    return {
        "status": "success",
        "lab_order_id": lab_order_id,
        "pdf_url": pdf_url,
        "ai_summary": ai_result["summary"],
        "ai_is_abnormal": ai_result["is_abnormal"],
        "ai_key_values": ai_result["key_values"],
        "message": f"Result uploaded successfully. {'⚠️ Abnormal values detected — doctor notified.' if is_abnormal else 'Doctor and patient notified.'}"
    }


@router.get("/notifications")
async def get_lab_notifications(current_user: UserResponse = Depends(get_current_user)):
    """Returns unread lab result notifications for the current user (doctor or patient)."""
    db = get_database()
    notifications = await db.notifications.find({
        "user_id": str(current_user.id),
        "type": "lab_result"
    }).sort("created_at", -1).limit(20).to_list(20)

    results = []
    for n in notifications:
        n["_id"] = str(n["_id"])
        results.append(n)

    return results


@router.get("/results/{lab_order_id}")
async def get_lab_result(lab_order_id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Get a lab result with strict access control.
    Only accessible to:
    1. The patient (owner of the report)
    2. The doctor that the patient is assigned to
    3. Lab technician who uploaded it (for their hospital only)
    """
    db = get_database()
    
    lab_order = await db.lab_orders.find_one({"_id": safe_object_id(lab_order_id)})
    if not lab_order:
        raise HTTPException(status_code=404, detail="Lab result not found")
    
    patient_id = lab_order.get("patient_id")
    patient = await db.patients.find_one({"_id": ObjectId(patient_id)}) if patient_id else None
    
    # Check access permissions
    has_access = False
    access_reason = None
    
    # 1. Check if current user is the patient
    if patient and patient.get("user_id") == str(current_user.id):
        has_access = True
        access_reason = "patient"
    
    # 2. Check if current user is the assigned doctor
    if current_user.role == "doctor" and patient:
        # Get patient's assigned doctor from visits or consultations
        recent_visit = await db.visits.find_one({
            "patient_id": patient_id,
            "doctor_id": str(current_user.id),
            "status": {"$in": ["active", "completed"]}
        }).sort("date", -1)
        
        if recent_visit:
            has_access = True
            access_reason = "assigned_doctor"
    
    # 3. Check if current user is the lab tech who uploaded it (same hospital)
    if current_user.role == "lab":
        if lab_order.get("hospital_id") == current_user.hospital:
            has_access = True
            access_reason = "lab_tech_same_hospital"
    
    if not has_access:
        raise HTTPException(
            status_code=403, 
            detail="Access denied: You do not have permission to view this lab result. Only the patient and their assigned doctor can access this report."
        )
    
    # Return sanitized result
    return {
        "id": str(lab_order["_id"]),
        "patient_id": patient_id,
        "patient_name": patient.get("name") if patient else "Unknown",
        "test_name": lab_order.get("test_name"),
        "result": lab_order.get("result"),
        "result_notes": lab_order.get("result_notes"),
        "result_date": lab_order.get("result_date"),
        "resulted_by": lab_order.get("resulted_by"),
        "pdf_url": lab_order.get("pdf_url"),
        "ai_summary": lab_order.get("ai_summary"),
        "ai_key_values": lab_order.get("ai_key_values"),
        "ai_is_abnormal": lab_order.get("ai_is_abnormal"),
        "ai_recommendation": lab_order.get("ai_recommendation"),
        "status": lab_order.get("status"),
        "access_reason": access_reason  # For debugging
    }


@router.get("/results")
async def get_my_lab_results(current_user: UserResponse = Depends(get_current_user)):
    """
    Get all lab results accessible to current user.
    For patients: their own results
    For doctors: results of their assigned patients
    For lab techs: results uploaded by their hospital
    """
    db = get_database()
    
    if current_user.role == "patient":
        # Get patient record
        patient = await db.patients.find_one({"user_id": str(current_user.id)})
        if not patient:
            return []
        
        # Get all lab orders for this patient
        results = await db.lab_orders.find({
            "patient_id": str(patient["_id"]),
            "status": "resulted"
        }).sort("result_date", -1).to_list(100)
        
        # Return sanitized results
        return [
            {
                "id": str(r["_id"]),
                "test_name": r.get("test_name"),
                "result_date": r.get("result_date"),
                "ai_summary": r.get("ai_summary"),
                "ai_is_abnormal": r.get("ai_is_abnormal"),
                "status": r.get("status")
            }
            for r in results
        ]
    
    elif current_user.role == "doctor":
        # Get all patients this doctor has visited
        visits = await db.visits.find({
            "doctor_id": str(current_user.id),
            "status": {"$in": ["active", "completed"]}
        }).to_list(1000)
        
        patient_ids = list(set([v.get("patient_id") for v in visits if v.get("patient_id")]))
        
        if not patient_ids:
            return []
        
        # Get lab orders for these patients
        results = await db.lab_orders.find({
            "patient_id": {"$in": patient_ids},
            "status": "resulted"
        }).sort("result_date", -1).to_list(100)
        
        # Return results with patient names
        response = []
        for r in results:
            patient = await db.patients.find_one({"_id": ObjectId(r.get("patient_id"))})
            response.append({
                "id": str(r["_id"]),
                "patient_name": patient.get("name") if patient else "Unknown",
                "test_name": r.get("test_name"),
                "result_date": r.get("result_date"),
                "ai_summary": r.get("ai_summary"),
                "ai_is_abnormal": r.get("ai_is_abnormal"),
                "status": r.get("status")
            })
        
        return response
    
    elif current_user.role == "lab":
        # Get all lab orders for this lab's hospital
        results = await db.lab_orders.find({
            "hospital_id": current_user.hospital,
            "status": "resulted"
        }).sort("result_date", -1).to_list(100)
        
        response = []
        for r in results:
            patient = await db.patients.find_one({"_id": ObjectId(r.get("patient_id"))})
            response.append({
                "id": str(r["_id"]),
                "patient_name": patient.get("name") if patient else "Unknown",
                "test_name": r.get("test_name"),
                "result_date": r.get("result_date"),
                "status": r.get("status")
            })
        
        return response
    
    return []


@router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Marks a notification as read."""
    db = get_database()
    await db.notifications.update_one(
        {"_id": safe_object_id(notif_id), "user_id": str(current_user.id)},
        {"$set": {"read": True}}
    )
    return {"status": "success"}
