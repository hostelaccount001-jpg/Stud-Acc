from pydantic import BaseModel
from typing import Optional, List

class EnrollFaceRequest(BaseModel):
    student_id: str
    name: str
    suid: str
    nfc_code: Optional[str] = ""
    standard: Optional[str] = ""
    mobile_number: Optional[str] = ""
    image_base64: str

class VerifyFaceRequest(BaseModel):
    image_base64: str
    kiosk_id: Optional[str] = "KIOSK-MAIN"

class VerifyNfcSessionRequest(BaseModel):
    session_id: str
    scanned_nfc_uid: str
    kiosk_id: Optional[str] = "KIOSK-MAIN"

class VerificationResponse(BaseModel):
    status: str
    confidence: float
    session_id: Optional[str] = None
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    suid: Optional[str] = None
    nfc_code: Optional[str] = None
    message: str

class LogUnmatchedScanRequest(BaseModel):
    device_id: Optional[str] = "KIOSK-MAIN"
    attempted_nfc: Optional[str] = ""
    attempted_suid: Optional[str] = ""
    alert_reason: str
    snapshot_base64: Optional[str] = ""

class StudentSaveRequest(BaseModel):
    id: Optional[str] = None
    name: str
    suid: str
    nfc_code: Optional[str] = ""
    standard: Optional[str] = ""
    mobile_number: Optional[str] = ""
    face_vector: Optional[List[float]] = []

class PrintReceiptRequest(BaseModel):
    transaction_id: str
    student_name: str
    suid: str
    standard: str
    service_description: str
    amount: float
    timestamp: Optional[str] = None
