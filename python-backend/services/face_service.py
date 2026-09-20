import base64
import cv2
import numpy as np
from typing import List, Tuple
from fastapi import HTTPException

def decode_base64_image(base64_str: str) -> np.ndarray:
    """Decodes base64 data URL into OpenCV BGR Image"""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image bytes.")
        return img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

def check_blur(gray_img: np.ndarray, threshold: float = 35.0) -> Tuple[bool, float]:
    val = float(cv2.Laplacian(gray_img, cv2.CV_64F).var())
    return val >= threshold, round(val, 2)

def check_exposure(gray_img: np.ndarray) -> Tuple[bool, str]:
    mean_val = float(np.mean(gray_img))
    if mean_val < 25.0:
        return False, "LIGHTING TOO DARK: Position face under bright light."
    if mean_val > 245.0:
        return False, "OVEREXPOSED / GLARE: Avoid direct camera lens glare."
    return True, "Lighting clear"

def detect_single_face(img_bgr: np.ndarray) -> Tuple[bool, Tuple[int, int, int, int], str]:
    h_img, w_img = img_bgr.shape[:2]
    ycrcb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2YCrCb)
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

    lower_ycrcb = np.array([0, 133, 77], dtype=np.uint8)
    upper_ycrcb = np.array([255, 173, 127], dtype=np.uint8)
    mask_ycrcb = cv2.inRange(ycrcb, lower_ycrcb, upper_ycrcb)

    lower_hsv = np.array([0, 20, 70], dtype=np.uint8)
    upper_hsv = np.array([25, 255, 255], dtype=np.uint8)
    mask_hsv = cv2.inRange(hsv, lower_hsv, upper_hsv)

    skin_mask = cv2.bitwise_and(mask_ycrcb, mask_hsv)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    skin_mask = cv2.erode(skin_mask, kernel, iterations=1)
    skin_mask = cv2.dilate(skin_mask, kernel, iterations=2)
    skin_mask = cv2.GaussianBlur(skin_mask, (5, 5), 0)

    contours, _ = cv2.findContours(skin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_faces = []
    min_face_area = (h_img * w_img) * 0.04

    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        area = w * h
        aspect_ratio = h / float(w)
        if area >= min_face_area and 0.8 <= aspect_ratio <= 2.2:
            roi_skin = skin_mask[y:y+h, x:x+w]
            skin_ratio = np.count_nonzero(roi_skin) / float(area)
            if skin_ratio >= 0.30:
                valid_faces.append((x, y, w, h))

    if len(valid_faces) == 0:
        return False, (0, 0, 0, 0), "NO FACE DETECTED: Position face directly inside scanner ring."
    if len(valid_faces) > 2:
        return False, (0, 0, 0, 0), "MULTIPLE FACES DETECTED: Only 1 person permitted in view."

    best_face = max(valid_faces, key=lambda b: b[2] * b[3])
    return True, best_face, "Single physical face detected"

def extract_128d_embedding(img_bgr: np.ndarray, face_rect: Tuple[int, int, int, int]) -> List[float]:
    x, y, w, h = face_rect
    h_img, w_img = img_bgr.shape[:2]
    x, y = max(0, x), max(0, y)
    w, h = min(w_img - x, w), min(h_img - y, h)

    face_roi = img_bgr[y:y+h, x:x+w] if (w > 20 and h > 20) else img_bgr
    gray_face = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
    eq_face = cv2.equalizeHist(gray_face)
    resized = cv2.resize(eq_face, (128, 128))

    grid_features = []
    cell_h, cell_w = 32, 32
    for row in range(4):
        for col in range(4):
            cell = resized[row*cell_h:(row+1)*cell_h, col*cell_w:(col+1)*cell_w]
            gx = cv2.Sobel(cell, cv2.CV_32F, 1, 0, ksize=3)
            gy = cv2.Sobel(cell, cv2.CV_32F, 0, 1, ksize=3)
            mag, ang = cv2.cartToPolar(gx, gy, angleInDegrees=True)
            hist, _ = np.histogram(ang, bins=8, range=(0, 360), weights=mag)
            grid_features.extend(hist.tolist())

    feature_vector = np.array(grid_features, dtype=np.float32)
    norm = np.linalg.norm(feature_vector)
    if norm > 0:
        feature_vector = feature_vector / norm
    return [round(float(val), 5) for val in feature_vector.tolist()]

def calculate_cosine_distance(vec1: List[float], vec2: List[float]) -> float:
    v1, v2 = np.array(vec1, dtype=float), np.array(vec2, dtype=float)
    if len(v1) != len(v2) or np.linalg.norm(v1) == 0 or np.linalg.norm(v2) == 0:
        return 1.0
    cosine_sim = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
    return float(max(0.0, 1.0 - cosine_sim))

def calculate_confidence_score(cosine_dist: float) -> float:
    if cosine_dist <= 0.05:
        score = 99.5 - (cosine_dist * 20.0)
    elif cosine_dist <= 0.20:
        score = 98.5 - ((cosine_dist - 0.05) / 0.15) * 8.5
    else:
        score = max(0.0, 85.0 - ((cosine_dist - 0.20) / 0.80) * 85.0)
    return round(float(score), 1)
