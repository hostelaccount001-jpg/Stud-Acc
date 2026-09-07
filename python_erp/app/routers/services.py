from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from app.models import ServiceCreate, ServiceUpdate, ServiceResponse
from app.database import get_supabase_client
from app.security import get_current_user

router = APIRouter(prefix="/services", tags=["Services & Items"])

@router.get("", response_model=List[ServiceResponse])
async def list_services(user: dict = Depends(get_current_user)):
    client = get_supabase_client()
    if not client:
        return []

    res = client.table("services").select("*").order("sort_order").execute()
    return res.data or []

@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(payload: ServiceCreate, user: dict = Depends(get_current_user)):
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database unavailable")

    res = client.table("services").insert(payload.model_dump()).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create service")
    return res.data[0]

@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(service_id: str, payload: ServiceUpdate, user: dict = Depends(get_current_user)):
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database unavailable")

    update_dict = {k: v for k, v in payload.model_dump().items() if v is not None}
    res = client.table("services").update(update_dict).eq("id", service_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Service not found or update failed")
    return res.data[0]

@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(service_id: str, user: dict = Depends(get_current_user)):
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database unavailable")

    client.table("services").delete().eq("id", service_id).execute()
    return None
