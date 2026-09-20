import time
import uuid
import cv2
from datetime import datetime
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict

from config import PORT, HOST, BIOMETRIC_STRICT_THRESHOLD, SESSION_TTL_SECONDS
from models.schemas import (
    EnrollFaceRequest,
    VerifyFaceRequest,
    VerifyNfcSessionRequest,
    VerificationResponse,
    PrintReceiptRequest
)
from services.face_service import (
    decode_base64_image,
    check_blur,
    check_exposure,
    detect_single_face,
    extract_128d_embedding,
    calculate_cosine_distance,
    calculate_confidence_score
)
from services.supabase_service import (
    fetch_all_students,
    save_student_face_vector,
    record_attendance,
    log_unmatched_scan
)
from services.printer_service import send_to_thermal_printer

app = FastAPI(
    title="Student ERP Kiosk AI Biometric & NFC Engine",
    description="FastAPI Backend for WebRTC Live Surveillance, OpenCV Face Recognition & NFC Dual Verification",
    version="3.5.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active Verification Sessions Store
ACTIVE_SESSIONS: Dict[str, dict] = {}

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "ONLINE",
        "service": "Student Kiosk FastAPI Biometric Engine",
        "threshold": f"Strict Cosine Distance <= {BIOMETRIC_STRICT_THRESHOLD}",
        "active_sessions": len(ACTIVE_SESSIONS)
    }

@app.post("/api/v1/enroll-face")
def enroll_face(req: EnrollFaceRequest):
    img = decode_base64_image(req.image_base64)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    is_clear, blur_score = check_blur(gray)
    if not is_clear:
        raise HTTPException(status_code=400, detail=f"ENROLLMENT REJECTED: Image too blurry (Blur score: {blur_score}).")

    is_lit, exp_msg = check_exposure(gray)
    if not is_lit:
        raise HTTPException(status_code=400, detail=f"ENROLLMENT REJECTED: {exp_msg}")

    face_ok, face_rect, face_msg = detect_single_face(img)
    if not face_ok:
        raise HTTPException(status_code=400, detail=f"ENROLLMENT REJECTED: {face_msg}")

    vector_128d = extract_128d_embedding(img, face_rect)

    student_payload = {
        "id": req.student_id,
        "name": req.name,
        "suid": req.suid,
        "nfc_code": req.nfc_code,
        "standard": req.standard,
        "mobile_number": req.mobile_number,
        "face_vector": vector_128d
    }

    save_student_face_vector(req.student_id, req.suid, student_payload)

    return {
        "status": "SUCCESS",
        "message": f"Biometric Face Vector registered for {req.name} ({req.suid}) in Supabase database!",
        "student_id": req.student_id,
        "student_name": req.name,
        "face_vector": vector_128d
    }

@app.post("/api/v1/verify-face", response_model=VerificationResponse)
def verify_face(req: VerifyFaceRequest):
    """STEP 1: FACE VERIFICATION AGAINST SUPABASE BIOMETRIC VECTOR DATABASE"""
    img = decode_base64_image(req.image_base64)

    face_ok, face_rect, face_msg = detect_single_face(img)
    if not face_ok:
        return VerificationResponse(status="ACCESS_DENIED", confidence=0.0, message=f"SECURITY ALERT: {face_msg}")

    live_vector = extract_128d_embedding(img, face_rect)
    students = fetch_all_students()

    if not students:
        return VerificationResponse(status="ACCESS_DENIED", confidence=0.0, message="ACCESS DENIED: No students found in database.")

    best_student = None
    min_cosine_dist = 1.0

    for st in students:
        raw_vec = st.get("face_vector") or st.get("faceVector")
        if raw_vec and isinstance(raw_vec, list) and len(raw_vec) >= 3:
            target_vec = raw_vec if len(raw_vec) == len(live_vector) else np.interp(
                np.linspace(0, len(raw_vec) - 1, len(live_vector)), np.arange(len(raw_vec)), raw_vec
            ).tolist()
            dist = calculate_cosine_distance(live_vector, target_vec)
            if dist < min_cosine_dist:
                min_cosine_dist = dist
                best_student = st

    confidence_score = calculate_confidence_score(min_cosine_dist)

    if best_student and min_cosine_dist <= BIOMETRIC_STRICT_THRESHOLD:
        student_name = best_student.get("name") or "Student"
        suid = best_student.get("suid") or "SUID-UNKNOWN"
        nfc_code = best_student.get("nfc_code") or best_student.get("nfcCode") or ""
        st_id = best_student.get("id") or "ID-UNKNOWN"

        session_id = str(uuid.uuid4())
        ACTIVE_SESSIONS[session_id] = {
            "id": session_id,
            "kiosk_id": req.kiosk_id,
            "face_student_id": st_id,
            "face_student_name": student_name,
            "face_suid": suid,
            "face_nfc_code": nfc_code,
            "face_similarity": confidence_score,
            "verification_status": "FACE_VERIFIED",
            "expires_at": time.time() + SESSION_TTL_SECONDS
        }

        return VerificationResponse(
            status="SUCCESS",
            confidence=confidence_score,
            session_id=session_id,
            student_id=st_id,
            student_name=student_name,
            suid=suid,
            nfc_code=nfc_code,
            message=f"STEP 1 PASSED: FACE VERIFIED FOR {student_name} ({suid})! NOW TOUCH NFC CARD..."
        )
    else:
        return VerificationResponse(
            status="ACCESS_DENIED",
            confidence=confidence_score,
            message=f"ACCESS DENIED: Face Not Recognized in database! Match score ({confidence_score}%) below required threshold."
        )

@app.post("/api/v1/verify-nfc-session")
def verify_nfc_session(req: VerifyNfcSessionRequest):
    """STEP 2: NFC CARD CROSS-VERIFICATION WITH FACE SESSION"""
    session = ACTIVE_SESSIONS.get(req.session_id)
    if not session or time.time() > session.get("expires_at", 0):
        raise HTTPException(status_code=400, detail="SESSION EXPIRED: Scan NFC card within 30 seconds of face scan.")

    scanned_clean = req.scanned_nfc_uid.strip().upper().replace(":", "").replace("-", "").replace(" ", "")
    expected_clean = session.get("face_nfc_code", "").strip().upper().replace(":", "").replace("-", "").replace(" ", "")

    if scanned_clean == expected_clean or (scanned_clean and scanned_clean in expected_clean) or (expected_clean and expected_clean in scanned_clean):
        session["verification_status"] = "DUAL_PASSED"
        return {
            "status": "SUCCESS",
            "message": f"DUAL AUTHENTICATION PASSED: Both Face & NFC Card matched for {session.get('face_student_name')} ({session.get('face_suid')})!",
            "student_id": session.get("face_student_id"),
            "student_name": session.get("face_student_name"),
            "suid": session.get("face_suid"),
            "nfc_code": req.scanned_nfc_uid
        }
    else:
        log_unmatched_scan({
            "device_id": req.kiosk_id,
            "attempted_nfc": req.scanned_nfc_uid,
            "attempted_suid": session.get("face_suid"),
            "alert_reason": f"NFC Mismatch! Face: {session.get('face_student_name')}, Scanned Card: {req.scanned_nfc_uid}",
            "timestamp": datetime.now().isoformat()
        })
        raise HTTPException(
            status_code=400,
            detail=f"ACCESS DENIED: Face verified for {session.get('face_student_name')}, but scanned NFC Card ({req.scanned_nfc_uid}) does NOT match student's registered card ({session.get('face_nfc_code')})!"
        )

@app.post("/api/v1/log-unmatched-scan")
def log_unmatched(req: LogUnmatchedScanRequest):
    """Logs security audit discrepancy with optional base64 camera snapshot"""
    entry = {
        "device_id": req.device_id,
        "attempted_nfc": req.attempted_nfc,
        "attempted_suid": req.attempted_suid,
        "alert_reason": req.alert_reason,
        "snapshot_base64": req.snapshot_base64,
        "timestamp": datetime.now().isoformat()
    }
    success = log_unmatched_scan(entry)
    return {"status": "SUCCESS" if success else "FAILED", "message": "Discrepancy captured"}

@app.get("/api/v1/unmatched-scans")
def get_unmatched_scans():
    """Retrieves security audit logs from Supabase"""
    return fetch_unmatched_scans()

@app.get("/api/v1/students")
def get_students():
    """Retrieves all registered students from Supabase"""
    return fetch_all_students()

@app.post("/api/v1/save-student")
def save_student(req: StudentSaveRequest):
    """Saves or updates student record in Supabase"""
    st_id = req.id or f"STU-{str(uuid.uuid4())[:8].upper()}"
    payload = {
        "id": st_id,
        "name": req.name,
        "suid": req.suid,
        "nfc_code": req.nfc_code or "",
        "standard": req.standard or "",
        "mobile_number": req.mobile_number or "",
        "face_vector": req.face_vector or []
    }
    success = save_student_face_vector(st_id, req.suid, payload)
    return {"status": "SUCCESS" if success else "FAILED", "student": payload}

@app.delete("/api/v1/students/{student_id}")
def remove_student(student_id: str):
    """Deletes student record from Supabase"""
    success = delete_student(student_id)
    return {"status": "SUCCESS" if success else "FAILED"}

@app.post("/api/v1/print-receipt")
def print_receipt(req: PrintReceiptRequest):
    """STEP 3: EXECUTE THERMAL PRINT JOB"""
    success = send_to_thermal_printer(req.model_dump())
    if success:
        return {"status": "SUCCESS", "message": "Thermal Receipt print job dispatched to hardware printer!"}
    else:
        raise HTTPException(status_code=500, detail="Thermal printer hardware offline or unavailable.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
