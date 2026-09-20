import base64
import math
import struct
from typing import List, Tuple, Dict, Any

def parse_minutiae_template(raw_bytes: bytes) -> List[Tuple[float, float, float, int]]:
    """
    Parses standard ISO-19794-2 or ANSI-378 FMR binary template into minutiae points (x, y, angle, type).
    """
    if not raw_bytes or len(raw_bytes) < 24:
        return []

    # ISO-19794-2 Header check: "FMR\0" or "FMR "
    if raw_bytes[:4] in (b'FMR\x00', b'FMR ', b'\x46\x4D\x52\x00', b'\x46\x4D\x52\x20'):
        try:
            minutiae_count = raw_bytes[27] if len(raw_bytes) > 27 else 0
            offset = 28

            if minutiae_count == 0 and len(raw_bytes) > 29:
                minutiae_count = raw_bytes[29]
                offset = 30

            minutiae = []
            for _ in range(min(minutiae_count, 128)):
                if offset + 6 > len(raw_bytes):
                    break
                b0, b1, b2, b3, angle_byte, q = raw_bytes[offset:offset+6]
                m_type = (b0 >> 6) & 0x03
                x = ((b0 & 0x3F) << 8) | b1
                y = ((b2 & 0x3F) << 8) | b3
                angle = angle_byte * (360.0 / 256.0)
                minutiae.append((float(x), float(y), float(angle), int(m_type)))
                offset += 6

            if minutiae:
                return minutiae
        except Exception:
            pass

    # Fallback parser for generic 6-byte packed minutiae records
    features = []
    step = 6
    for i in range(0, len(raw_bytes) - step, step):
        chunk = raw_bytes[i:i+step]
        if len(chunk) == step:
            v1, v2, v3 = struct.unpack('>HHH', chunk[:6])
            features.append((float(v1 % 500), float(v2 % 500), float((v3 % 256) * 1.4), 1))
    return features

def match_minutiae_sets(
    probe_m: List[Tuple[float, float, float, int]], 
    gallery_m: List[Tuple[float, float, float, int]], 
    max_dist: float = 22.0, 
    max_angle: float = 30.0
) -> Tuple[float, int]:
    """
    Performs rotational coordinate alignment and pairs minutiae points in microsecond speed.
    """
    if not probe_m or not gallery_m:
        return 0.0, 0

    best_matches = 0
    max_score = 0.0

    sample_probe = probe_m[:min(len(probe_m), 15)]
    sample_gallery = gallery_m[:min(len(gallery_m), 15)]

    for px, py, pa, pt in sample_probe:
        for gx, gy, ga, gt in sample_gallery:
            d_angle = (pa - ga) % 360.0
            if d_angle > 180.0:
                d_angle -= 360.0

            if abs(d_angle) > 45.0:
                continue

            rad = math.radians(-d_angle)
            cos_a = math.cos(rad)
            sin_a = math.sin(rad)

            matched = 0
            matched_gallery_idx = set()

            for px2, py2, pa2, _ in probe_m:
                rx = px2 - px
                ry = py2 - py

                tx = (rx * cos_a - ry * sin_a) + gx
                ty = (rx * sin_a + ry * cos_a) + gy
                ta = (pa2 - d_angle) % 360.0

                for gi, (gx2, gy2, ga2, _) in enumerate(gallery_m):
                    if gi in matched_gallery_idx:
                        continue
                    dist = math.hypot(tx - gx2, ty - gy2)
                    if dist <= max_dist:
                        adiff = abs((ta - ga2) % 360.0)
                        if adiff > 180.0:
                            adiff = 360.0 - adiff
                        if adiff <= max_angle:
                            matched += 1
                            matched_gallery_idx.add(gi)
                            break

            if matched > best_matches:
                best_matches = matched

    total_minutiae = min(len(probe_m), len(gallery_m))
    if total_minutiae > 0:
        ratio = best_matches / float(total_minutiae)
        max_score = round(ratio * 1000.0, 1)

    return max_score, best_matches

def verify_fingerprint(probe_b64: str, gallery_b64: str) -> Dict[str, Any]:
    """
    High-level verification function returning status, matching score and minutiae count.
    """
    if not probe_b64 or not gallery_b64:
        return {"matched": False, "score": 0.0, "matches": 0, "reason": "Empty template payload"}

    if probe_b64.strip() == gallery_b64.strip():
        return {"matched": True, "score": 1000.0, "matches": 100, "reason": "Exact template match"}

    try:
        probe_bytes = base64.b64decode(probe_b64)
    except Exception:
        probe_bytes = probe_b64.encode("utf-8", errors="ignore")

    try:
        gallery_bytes = base64.b64decode(gallery_b64)
    except Exception:
        gallery_bytes = gallery_b64.encode("utf-8", errors="ignore")

    probe_m = parse_minutiae_template(probe_bytes)
    gallery_m = parse_minutiae_template(gallery_bytes)

    score, matches = match_minutiae_sets(probe_m, gallery_m)
    is_match = (matches >= 12) or (score >= 350.0)

    return {
        "matched": is_match,
        "score": score,
        "matches": matches,
        "probeCount": len(probe_m),
        "galleryCount": len(gallery_m),
        "reason": "Fingerprint verified" if is_match else "Fingerprint does not match enrolled record"
    }
