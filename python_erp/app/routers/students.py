from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Optional
from app.models import StudentCreate, StudentUpdate, StudentResponse, FingerprintRecord
from app.database import get_supabase_client
from app.security import get_current_user
from app.hardware.nfc_reader import sanitize_nfc_uid

router = APIRouter(prefix="/students", tags=["Students Management"])

@router.get("", response_model=List[StudentResponse])
async def list_students(
    search: Optional[str] = Query(None, description="Search by name, SUID, or NFC"),
    class_name: Optional[str] = Query(None),
    blocked: Optional[bool] = Query(None),
    limit: int = Query(100, le=1000),
    user: dict = Depends(get_current_user)
):
    client = get_supabase_client()
    if not client:
        return []

    query = client.table("students").select("*")
    if class_name:
        query = query.eq("class_name", class_name)
    if blocked is not None:
        query = query.eq("blocked", blocked)
    
    res = query.order("created_at", desc=True).limit(limit).execute()
    data = res.data or []

    if search:
        s = search.lower().strip()
        data = [
            row for row in data
            if s in (row.get("name") or "").lower()
            or s in (row.get("suid") or "").lower()
            or s in (row.get("nfc_no") or "").lower()
        ]

    return data

@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(student_id: str, user: dict = Depends(get_current_user)):
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database unavailable")

    res = client.table("students").select("*").eq("id", student_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Student not found")
    return res.data[0]

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(payload: StudentCreate, user: dict = Depends(get_current_user)):
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database unavailable")

    clean_nfc = sanitize_nfc_uid(payload.nfc_no)
    clean_suid = payload.suid.strip().upper()

    # Check NFC unique
    check_nfc = client.table("students").select("id").eq("nfc_no", clean_nfc).execute()
    if check_nfc.data:
        raise HTTPException(status_code=400, detail="A student with this NFC Smart Card already exists.")

    # Check SUID unique
    check_suid = client.table("students").select("id").eq("suid", clean_suid).execute()
    if check_suid.data:
        raise HTTPException(status_code=400, detail="A student with this SUID already exists.")

    student_data = payload.model_dump()
    student_data["nfc_no"] = clean_nfc
    student_data["suid"] = clean_suid
    student_data["fingerprints"] = [f.model_dump() for f in (payload.fingerprints or [])]

    res = client.table("students").insert(student_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create student")
    return res.data[0]

@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(student_id: str, payload: StudentUpdate, user: dict = Depends(get_current_user)):
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database unavailable")

    update_dict = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "nfc_no" in update_dict and update_dict["nfc_no"]:
        update_dict["nfc_no"] = sanitize_nfc_uid(update_dict["nfc_no"])
    if "suid" in update_dict and update_dict["suid"]:
        update_dict["suid"] = update_dict["suid"].strip().upper()
    if "fingerprints" in update_dict and update_dict["fingerprints"] is not None:
        update_dict["fingerprints"] = [
            f.model_dump() if hasattr(f, "model_dump") else f
            for f in update_dict["fingerprints"]
        ]

    res = client.table("students").update(update_dict).eq("id", student_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Student not found or update failed")
    return res.data[0]

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(student_id: str, user: dict = Depends(get_current_user)):
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database unavailable")

    res = client.table("students").delete().eq("id", student_id).execute()
    return None
