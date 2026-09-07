from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.models import BiometricVerifyRequest, BiometricVerifyResponse, PrintReceiptRequest
from app.hardware.mantra_matcher import verify_fingerprint
from app.hardware.thermal_printer import build_receipt_bytes, print_raw_bytes

router = APIRouter(prefix="/hardware", tags=["Hardware Services"])

@router.post("/mantra/match", response_model=BiometricVerifyResponse)
async def mantra_match_fingerprint(req: BiometricVerifyRequest):
    """
    Direct Mantra ISO-19794-2 template matching endpoint.
    """
    res = verify_fingerprint(req.probe_template, req.gallery_template)
    return BiometricVerifyResponse(
        matched=res["matched"],
        score=res["score"],
        matches=res.get("matches", 0),
        message=res.get("reason", "")
    )

@router.post("/printer/print-receipt")
async def print_thermal_receipt(req: PrintReceiptRequest):
    """
    Triggers direct ESC/POS silent print to thermal printer.
    """
    try:
        raw_bytes = build_receipt_bytes(req.receipt.model_dump())
        success = print_raw_bytes(raw_bytes, req.printer_name)
        return {"success": success, "printer": req.printer_name or "default"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Print error: {str(e)}")
