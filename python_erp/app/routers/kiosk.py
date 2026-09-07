from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List
from datetime import datetime, timezone
from app.models import KioskLookupRequest, BiometricVerifyRequest, BiometricVerifyResponse, KioskPunchRequest, KioskPunchResponse, ReceiptData
from app.database import get_supabase_client
from app.hardware.mantra_matcher import verify_fingerprint
from app.hardware.thermal_printer import build_receipt_bytes, print_raw_bytes
from app.hardware.nfc_reader import sanitize_nfc_uid

router = APIRouter(prefix="/kiosk", tags=["Kiosk Terminal"])

@router.get("/config")
async def get_kiosk_configuration():
    """
    Returns active services, system settings, and registered student cache.
    """
    client = get_supabase_client()
    if not client:
        return {
            "services": [
                {"id": "s1", "name": "Breakfast", "price": 0.0, "print_receipt": True},
                {"id": "s2", "name": "Lunch", "price": 0.0, "print_receipt": True},
                {"id": "s3", "name": "Dinner", "price": 0.0, "print_receipt": True},
            ],
            "settings": {"kiosk_title": "Shree Swaminarayan Gurukul Kiosk"},
            "enrolledStudents": []
        }

    try:
        services_res = client.table("services").select("id, name, price, print_receipt, active, daily_limit").eq("active", True).order("sort_order").execute()
        settings_res = client.table("settings").select("key, value").execute()
        students_res = client.table("students").select("id, suid, name, class_name, room_no, nfc_no").eq("blocked", False).execute()

        services = services_res.data or []
        settings_dict = {item["key"]: item["value"] for item in (settings_res.data or [])}
        students = students_res.data or []

        return {
            "services": services,
            "settings": settings_dict,
            "enrolledStudents": students
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/lookup")
async def lookup_student_by_card(req: KioskLookupRequest):
    """
    Step 1: Scans NFC / SUID and returns enrolled fingerprint templates for 1:1 hardware match.
    """
    code = sanitize_nfc_uid(req.nfc_or_suid)
    if not code:
        raise HTTPException(status_code=400, detail="Invalid Card UID or SUID")

    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database service unavailable")

    # 1. Search by NFC
    res = client.table("students").select("*").eq("nfc_no", code).execute()
    student = res.data[0] if res.data else None

    # 2. Fallback search by SUID
    if not student:
        res = client.table("students").select("*").ilike("suid", code).execute()
        student = res.data[0] if res.data else None

    if not student:
        return {"status": "not_found", "message": "Card / SUID not registered in Gurukul system."}

    if student.get("blocked"):
        return {"status": "blocked", "message": "This student account is currently BLOCKED by administration."}

    # Extract fingerprint minutiae templates
    fingerprints = student.get("fingerprints") or []
    templates = []
    if isinstance(fingerprints, list):
        for f in fingerprints:
            if isinstance(f, dict) and f.get("template"):
                templates.append(f["template"].strip())

    if not templates:
        return {
            "status": "no_fingerprint",
            "message": "No fingerprint enrolled for this student. Please enroll fingerprint in Admin Portal first."
        }

    return {
        "status": "ok",
        "studentId": student["id"],
        "suid": student["suid"],
        "name": student["name"],
        "nfc_no": student["nfc_no"],
        "class_name": student.get("class_name"),
        "room_no": student.get("room_no"),
        "fingerprintsCount": len(templates),
        "templates": templates,
        "hasFingerprint": True
    }

@router.post("/verify-fingerprint", response_model=BiometricVerifyResponse)
async def verify_fingerprint_biometric(req: BiometricVerifyRequest):
    """
    Step 2: Microsecond ISO-19794-2 FMR Minutiae 1:1 match.
    """
    res = verify_fingerprint(req.probe_template, req.gallery_template)
    return BiometricVerifyResponse(
        matched=res["matched"],
        score=res["score"],
        matches=res.get("matches", 0),
        message=res.get("reason", "Processed")
    )

@router.post("/punch", response_model=KioskPunchResponse)
async def punch_kiosk_service(req: KioskPunchRequest):
    """
    Step 3: Service punch, daily limits evaluation, transaction commit & thermal receipt print.
    """
    nfc_code = sanitize_nfc_uid(req.nfc)
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database service unavailable")

    # 1. Fetch Student & Service
    student_res = client.table("students").select("*").eq("nfc_no", nfc_code).execute()
    student = student_res.data[0] if student_res.data else None
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.get("blocked"):
        return KioskPunchResponse(
            status="blocked",
            message="Student account is blocked.",
            print_receipt=False
        )

    service_res = client.table("services").select("*").eq("id", req.service_id).execute()
    service = service_res.data[0] if service_res.data else None
    if not service or not service.get("active"):
        raise HTTPException(status_code=400, detail="Selected service is inactive or not found")

    amount = float(req.custom_amount if req.custom_amount and req.custom_amount > 0 else service.get("price", 0.0))

    # 2. Daily limits check
    today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00Z")
    tx_res = client.table("transactions").select("amount, service_id").eq("student_id", student["id"]).gte("created_at", today_iso).execute()
    today_txs = tx_res.data or []
    
    today_spent = sum(float(tx.get("amount", 0.0)) for tx in today_txs)
    service_limit = service.get("daily_limit")

    if service_limit is not None and float(service_limit) > 0:
        service_spent = sum(float(tx.get("amount", 0.0)) for tx in today_txs if tx.get("service_id") == service["id"])
        if service_spent + amount > float(service_limit):
            return KioskPunchResponse(
                status="limit",
                message=f"Daily limit for {service['name']} exceeded.",
                print_receipt=False
            )

    # 3. Record Transaction
    tx_payload = {
        "student_id": student["id"],
        "suid": student["suid"],
        "nfc_no": student["nfc_no"],
        "student_name": student["name"],
        "service_id": service["id"],
        "service_name": service["name"],
        "amount": amount
    }

    insert_res = client.table("transactions").insert(tx_payload).execute()
    if not insert_res.data:
        raise HTTPException(status_code=500, detail="Failed to record transaction")

    record = insert_res.data[0]
    receipt_data = ReceiptData(
        receipt_no=record.get("receipt_no", 1001),
        suid=student["suid"],
        student_name=student["name"],
        class_name=student.get("class_name"),
        room_no=student.get("room_no"),
        service_name=service["name"],
        amount=amount,
        created_at=record.get("created_at", datetime.now(timezone.utc).isoformat())
    )

    # 4. Thermal Print if enabled
    if service.get("print_receipt", True):
        try:
            raw_bytes = build_receipt_bytes(receipt_data.model_dump())
            print_raw_bytes(raw_bytes)
        except Exception:
            pass

    return KioskPunchResponse(
        status="ok",
        message="Service punched successfully!",
        print_receipt=service.get("print_receipt", True),
        receipt=receipt_data
    )
