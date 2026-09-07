"""
InsightFace 512D Face Biometric API Router
Endpoints: /extract, /verify, /register
"""

import base64
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from app.models import (
    FaceExtractRequest,
    FaceExtractResponse,
    FaceVerifyRequest,
    FaceVerifyResponse,
    FaceRegisterRequest,
)

logger = logging.getLogger("face_router")

router = APIRouter(prefix="/face", tags=["Face Biometrics (InsightFace 512D)"])


def _get_engine():
    """Lazy import to avoid loading heavy ML deps at module level."""
    from app.hardware.insightface_engine import get_engine
    return get_engine()


def _decode_base64_image(b64_string: str) -> bytes:
    """Decode a base64 image string (with or without data URL prefix) to raw bytes."""
    if "," in b64_string:
        # Strip data URL prefix: "data:image/jpeg;base64,..."
        b64_string = b64_string.split(",", 1)[1]
    try:
        return base64.b64decode(b64_string)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image: {e}")


@router.post("/extract", response_model=FaceExtractResponse)
async def extract_face_embedding(req: FaceExtractRequest):
    """
    Extract a 512D ArcFace face embedding from a base64-encoded image.

    Returns the embedding, detection confidence, bounding box, and cropped face.
    """
    image_bytes = _decode_base64_image(req.image)

    if len(image_bytes) < 100:
        return FaceExtractResponse(
            success=False,
            error="Image too small or empty",
        )

    try:
        engine = _get_engine()
        result = engine.extract_embedding(image_bytes)

        return FaceExtractResponse(
            success=result["success"],
            embedding=result.get("embedding", []),
            det_score=result.get("det_score", 0.0),
            bbox=result.get("bbox", []),
            face_crop_b64=result.get("face_crop_b64", ""),
            error=result.get("error"),
        )
    except RuntimeError as e:
        logger.error(f"InsightFace extraction error: {e}")
        return FaceExtractResponse(
            success=False,
            error=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"Face extraction failed: {e}")


@router.post("/verify", response_model=FaceVerifyResponse)
async def verify_face_embeddings(req: FaceVerifyRequest):
    """
    Verify two 512D face embeddings using cosine similarity.

    Returns verified status, similarity score, and whether the gallery
    embedding should be auto-updated (score >= 0.85) for age invariance.
    """
    if len(req.probe_embedding) != 512:
        return FaceVerifyResponse(
            verified=False,
            score=0.0,
            should_update=False,
            message=f"Probe embedding must be 512D (got {len(req.probe_embedding)})",
        )

    if len(req.gallery_embedding) != 512:
        return FaceVerifyResponse(
            verified=False,
            score=0.0,
            should_update=False,
            message=f"Gallery embedding must be 512D (got {len(req.gallery_embedding)})",
        )

    try:
        engine = _get_engine()
        result = engine.verify_embeddings(
            probe=req.probe_embedding,
            gallery=req.gallery_embedding,
            threshold=req.threshold,
        )

        return FaceVerifyResponse(
            verified=result["verified"],
            score=result["score"],
            should_update=result.get("should_update", False),
            message=result["message"],
        )
    except Exception as e:
        logger.error(f"Face verification error: {e}")
        raise HTTPException(status_code=500, detail=f"Face verification failed: {e}")


@router.post("/register")
async def register_face(req: FaceRegisterRequest):
    """
    Extract 512D embedding from image and store it in the student's
    fingerprints JSON array in Supabase.

    This appends/updates a record with type="face" that includes:
    - photo: base64 cropped face
    - descriptor512: 512D ArcFace embedding
    - descriptor: 128D placeholder (set to empty, filled by browser)
    """
    image_bytes = _decode_base64_image(req.image)

    try:
        engine = _get_engine()
        result = engine.extract_embedding(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face extraction failed: {e}")

    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "No face detected in the provided image"),
        )

    # Build the face record
    face_record = {
        "type": "face",
        "photo": f"data:image/jpeg;base64,{result['face_crop_b64']}",
        "descriptor": [],  # 128D placeholder — browser fills this
        "descriptor512": result["embedding"],
        "det_score": result["det_score"],
        "enrolled_at": __import__("datetime").datetime.utcnow().isoformat(),
    }

    # Read current student fingerprints from Supabase
    try:
        from app.config import settings
        from supabase import create_client

        sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

        student_resp = sb.table("students").select("fingerprints").eq("id", req.student_id).maybe_single().execute()

        if not student_resp.data:
            raise HTTPException(status_code=404, detail="Student not found")

        current_fps = student_resp.data.get("fingerprints") or []
        if not isinstance(current_fps, list):
            current_fps = []

        # Remove existing face records (replace with new one)
        updated_fps = [fp for fp in current_fps if not (isinstance(fp, dict) and fp.get("type") == "face")]
        updated_fps.append(face_record)

        # Write back
        sb.table("students").update({"fingerprints": updated_fps}).eq("id", req.student_id).execute()

        return {
            "success": True,
            "message": "512D face embedding registered successfully",
            "det_score": result["det_score"],
            "embedding_dim": len(result["embedding"]),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Supabase update error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save face record: {e}")
