"""
InsightFace ArcFace 512D Face Biometric Engine
Production-grade face embedding extraction and 1:1 verification.

Uses buffalo_l model (ResNet-100 ArcFace backbone) for 512-dimensional
unit-normalized face embeddings with cosine similarity matching.
"""

import logging
import threading
import base64
import io
import math
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
import cv2

logger = logging.getLogger("insightface_engine")

# ---------------------------------------------------------------------------
# Singleton Face Analysis Engine
# ---------------------------------------------------------------------------

class FaceEngine:
    """
    Thread-safe singleton that lazy-loads InsightFace buffalo_l model.
    The model (~300MB) is downloaded once to ~/.insightface/models/ on first use.
    """

    _instance: Optional["FaceEngine"] = None
    _lock = threading.Lock()
    _initialized = False

    def __new__(cls) -> "FaceEngine":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        with self._lock:
            if self._initialized:
                return
            self._app = None
            self._initialized = True
            logger.info("FaceEngine singleton created (model loads on first call)")

    def _ensure_model(self) -> None:
        """Lazy-load the InsightFace model on first use."""
        if self._app is not None:
            return
        try:
            from insightface.app import FaceAnalysis

            self._app = FaceAnalysis(
                name="buffalo_l",
                root="~/.insightface",
                providers=["CPUExecutionProvider"],
            )
            # det_size: detection input resolution — 640x640 is standard
            self._app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("InsightFace buffalo_l model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load InsightFace model: {e}")
            raise RuntimeError(
                "InsightFace model failed to load. "
                "Ensure 'insightface' and 'onnxruntime' are installed."
            ) from e

    # ------------------------------------------------------------------
    # Core API
    # ------------------------------------------------------------------

    def extract_embedding(
        self, image_bytes: bytes
    ) -> Dict[str, Any]:
        """
        Detect face and extract 512D ArcFace embedding from raw JPEG/PNG bytes.

        Returns:
            {
                "success": bool,
                "embedding": List[float] (512D, unit-normalized),
                "det_score": float (face detection confidence),
                "bbox": [x1, y1, x2, y2],
                "face_crop_b64": str (base64 cropped face JPEG),
                "error": str | None
            }
        """
        self._ensure_model()

        # Decode image bytes to numpy BGR array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {
                "success": False,
                "embedding": [],
                "det_score": 0.0,
                "bbox": [],
                "face_crop_b64": "",
                "error": "Failed to decode image",
            }

        # Detect faces
        faces = self._app.get(img)
        if not faces:
            return {
                "success": False,
                "embedding": [],
                "det_score": 0.0,
                "bbox": [],
                "face_crop_b64": "",
                "error": "No face detected in image",
            }

        # Pick the face with highest detection score
        best_face = max(faces, key=lambda f: f.det_score)

        # Liveness gate: reject low-confidence detections (shadows, objects)
        if best_face.det_score < 0.5:
            return {
                "success": False,
                "embedding": [],
                "det_score": float(best_face.det_score),
                "bbox": [],
                "face_crop_b64": "",
                "error": f"Face detection confidence too low ({best_face.det_score:.2f}). Please look directly at the camera.",
            }

        # Extract 512D embedding (already unit-normalized by ArcFace)
        embedding = best_face.normed_embedding.tolist()

        # Crop face region for thumbnail
        bbox = best_face.bbox.astype(int).tolist()
        x1, y1, x2, y2 = bbox
        h, w = img.shape[:2]
        # Pad crop by 15%
        pad_x = int((x2 - x1) * 0.15)
        pad_y = int((y2 - y1) * 0.15)
        cx1 = max(0, x1 - pad_x)
        cy1 = max(0, y1 - pad_y)
        cx2 = min(w, x2 + pad_x)
        cy2 = min(h, y2 + pad_y)
        face_crop = img[cy1:cy2, cx1:cx2]

        # Encode crop to base64 JPEG
        face_crop_b64 = ""
        if face_crop.size > 0:
            _, buf = cv2.imencode(".jpg", face_crop, [cv2.IMWRITE_JPEG_QUALITY, 85])
            face_crop_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")

        return {
            "success": True,
            "embedding": embedding,
            "det_score": float(best_face.det_score),
            "bbox": bbox,
            "face_crop_b64": face_crop_b64,
            "error": None,
        }

    def verify_embeddings(
        self,
        probe: List[float],
        gallery: List[float],
        threshold: float = 0.45,
    ) -> Dict[str, Any]:
        """
        1:1 face verification using cosine similarity between two 512D embeddings.

        ArcFace embeddings are unit-normalized, so cosine similarity = dot product.

        Thresholds (calibrated for ArcFace buffalo_l):
            >= 0.45: Same person (verified)
            >= 0.85: High-confidence — trigger gallery auto-update for age invariance
            <  0.45: Different person (rejected)

        Returns:
            {
                "verified": bool,
                "score": float (cosine similarity, 0.0 to 1.0),
                "should_update": bool (True if score >= 0.85),
                "message": str
            }
        """
        if not probe or not gallery:
            return {
                "verified": False,
                "score": 0.0,
                "should_update": False,
                "message": "Missing embedding data",
            }

        if len(probe) != 512 or len(gallery) != 512:
            return {
                "verified": False,
                "score": 0.0,
                "should_update": False,
                "message": f"Invalid embedding dimensions (probe={len(probe)}, gallery={len(gallery)}). Expected 512.",
            }

        # Cosine similarity (unit vectors → dot product)
        probe_arr = np.array(probe, dtype=np.float32)
        gallery_arr = np.array(gallery, dtype=np.float32)

        # Re-normalize for safety
        probe_norm = np.linalg.norm(probe_arr)
        gallery_norm = np.linalg.norm(gallery_arr)

        if probe_norm < 1e-6 or gallery_norm < 1e-6:
            return {
                "verified": False,
                "score": 0.0,
                "should_update": False,
                "message": "Zero-norm embedding detected",
            }

        cosine_sim = float(
            np.dot(probe_arr / probe_norm, gallery_arr / gallery_norm)
        )

        verified = cosine_sim >= threshold
        should_update = cosine_sim >= 0.85

        if verified:
            message = "Face verified successfully"
            if should_update:
                message = "Face verified with high confidence — embedding refresh recommended"
        else:
            message = "Face does not match the registered student"

        return {
            "verified": verified,
            "score": round(cosine_sim, 4),
            "should_update": should_update,
            "message": message,
        }


# Module-level convenience functions
_engine: Optional[FaceEngine] = None


def get_engine() -> FaceEngine:
    """Get or create the global FaceEngine singleton."""
    global _engine
    if _engine is None:
        _engine = FaceEngine()
    return _engine


def extract_embedding(image_bytes: bytes) -> Dict[str, Any]:
    """Extract 512D face embedding from raw image bytes."""
    return get_engine().extract_embedding(image_bytes)


def verify_embeddings(
    probe: List[float], gallery: List[float], threshold: float = 0.45
) -> Dict[str, Any]:
    """Verify two 512D embeddings with cosine similarity."""
    return get_engine().verify_embeddings(probe, gallery, threshold)
