from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

# Fingerprint Biometric Record
class FingerprintRecord(BaseModel):
    finger: str
    template: str
    quality: int = Field(default=0)
    enrolled_at: Optional[str] = None
    serial: Optional[str] = None

# Student Models
class StudentBase(BaseModel):
    suid: str = Field(..., description="Student Unique ID (e.g. SUID-101)")
    name: str = Field(..., min_length=2, max_length=120)
    nfc_no: str = Field(..., description="14-char Hex NFC UID")
    class_name: Optional[str] = Field(default=None)
    room_no: Optional[str] = Field(default=None)
    contact_no: Optional[str] = Field(default=None)
    parent_phone: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    blocked: bool = Field(default=False)

class StudentCreate(StudentBase):
    fingerprints: Optional[List[FingerprintRecord]] = Field(default_factory=list)

class StudentUpdate(BaseModel):
    suid: Optional[str] = None
    name: Optional[str] = None
    nfc_no: Optional[str] = None
    class_name: Optional[str] = None
    room_no: Optional[str] = None
    contact_no: Optional[str] = None
    parent_phone: Optional[str] = None
    notes: Optional[str] = None
    blocked: Optional[bool] = None
    fingerprints: Optional[List[FingerprintRecord]] = None

class StudentResponse(StudentBase):
    id: str
    fingerprints: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# Service Models
class ServiceBase(BaseModel):
    name: str
    price: float = Field(ge=0.0)
    print_receipt: bool = Field(default=True)
    active: bool = Field(default=True)
    daily_limit: Optional[float] = Field(default=None)
    sort_order: Optional[int] = Field(default=0)

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    print_receipt: Optional[bool] = None
    active: Optional[bool] = None
    daily_limit: Optional[float] = None
    sort_order: Optional[int] = None

class ServiceResponse(ServiceBase):
    id: str
    created_at: Optional[str] = None

# Transaction & Kiosk Punch Models
class KioskLookupRequest(BaseModel):
    nfc_or_suid: str

class BiometricVerifyRequest(BaseModel):
    probe_template: str
    gallery_template: str

class BiometricVerifyResponse(BaseModel):
    matched: bool
    score: float
    matches: int = 0
    message: str

class KioskPunchRequest(BaseModel):
    nfc: str
    service_id: str
    custom_amount: Optional[float] = None

class ReceiptData(BaseModel):
    receipt_no: int
    suid: str
    student_name: str
    class_name: Optional[str] = None
    room_no: Optional[str] = None
    service_name: str
    amount: float
    created_at: str

class KioskPunchResponse(BaseModel):
    status: str
    message: str
    print_receipt: bool
    receipt: Optional[ReceiptData] = None

# Thermal Direct Print Request
class PrintReceiptRequest(BaseModel):
    receipt: ReceiptData
    printer_name: Optional[str] = None
    copies: int = 1

# InsightFace 512D Face Biometric Models
class FaceExtractRequest(BaseModel):
    image: str = Field(..., description="Base64-encoded JPEG/PNG image")

class FaceExtractResponse(BaseModel):
    success: bool
    embedding: List[float] = Field(default_factory=list, description="512D ArcFace embedding")
    det_score: float = Field(default=0.0, description="Face detection confidence")
    bbox: List[int] = Field(default_factory=list, description="Face bounding box [x1,y1,x2,y2]")
    face_crop_b64: str = Field(default="", description="Base64 cropped face JPEG")
    error: Optional[str] = None

class FaceVerifyRequest(BaseModel):
    probe_embedding: List[float] = Field(..., description="512D probe embedding")
    gallery_embedding: List[float] = Field(..., description="512D gallery embedding")
    threshold: float = Field(default=0.45, ge=0.0, le=1.0)

class FaceVerifyResponse(BaseModel):
    verified: bool
    score: float = Field(description="Cosine similarity 0.0 to 1.0")
    should_update: bool = Field(default=False, description="True if score >= 0.85 for age-invariant auto-update")
    message: str

class FaceRegisterRequest(BaseModel):
    student_id: str = Field(..., description="Supabase student UUID")
    image: str = Field(..., description="Base64-encoded JPEG/PNG image")

