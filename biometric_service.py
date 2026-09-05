"""
Shree Swaminarayan Gurukul Kiosk - Local High-Speed Biometric Engine
Standalone 1:1 Fingerprint Matcher & Verification Bridge (Port 8005 / 8004)
Zero external dependencies required - Pure Python Standard Library
"""

import sys
import json
import base64
import math
import struct
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8005

def parse_minutiae_template(raw_bytes):
    """
    Extracts minutiae points (x, y, angle, type, quality) from ISO 19794-2 or ANSI 378 template.
    """
    if not raw_bytes or len(raw_bytes) < 24:
        return []

    # Check for ISO 19794-2 / ANSI-378 header ('FMR\0' or 'FMR ')
    if raw_bytes[:4] in (b'FMR\x00', b'FMR ', b'\x46\x4D\x52\x00', b'\x46\x4D\x52\x20'):
        try:
            # ISO 19794-2 standard layout:
            # Minutiae count is at byte 27 (standard 2005) or byte 29
            minutiae_count = 0
            offset = 28

            if len(raw_bytes) > 27:
                minutiae_count = raw_bytes[27]
            
            # If count is 0 or invalid, try alternate header offset
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

    # Generic binary feature extractor for non-standard / proprietary templates
    features = []
    step = 6
    for i in range(0, len(raw_bytes) - step, step):
        chunk = raw_bytes[i:i+step]
        if len(chunk) == step:
            v1, v2, v3 = struct.unpack('>HHH', chunk[:6])
            features.append((float(v1 % 500), float(v2 % 500), float((v3 % 256) * 1.4), 1))
    return features


def match_minutiae_sets(probe_m, gallery_m, max_dist=22.0, max_angle=30.0):
    """
    Computes 1:1 matching score between two minutiae sets using spatial/angular alignment.
    Returns (score: float, matched_count: int).
    """
    if not probe_m or not gallery_m:
        return 0.0, 0

    best_matches = 0
    max_score = 0.0

    # Test top candidate reference pairs to find optimal spatial alignment (dx, dy, d_angle)
    sample_probe = probe_m[:min(len(probe_m), 15)]
    sample_gallery = gallery_m[:min(len(gallery_m), 15)]

    for px, py, pa, pt in sample_probe:
        for gx, gy, ga, gt in sample_gallery:
            d_angle = (pa - ga) % 360.0
            if d_angle > 180.0:
                d_angle -= 360.0

            # Angle threshold between reference minutiae
            if abs(d_angle) > 45.0:
                continue

            rad = math.radians(-d_angle)
            cos_a = math.cos(rad)
            sin_a = math.sin(rad)

            # Align probe coordinates to gallery space
            matched = 0
            matched_gallery_idx = set()

            for px2, py2, pa2, _ in probe_m:
                # Translate relative to probe anchor
                rx = px2 - px
                ry = py2 - py

                # Rotate
                tx = (rx * cos_a - ry * sin_a) + gx
                ty = (rx * sin_a + ry * cos_a) + gy
                ta = (pa2 - d_angle) % 360.0

                # Find nearest matching minutia in gallery
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

    # Calculate normalized similarity score (0 to 1000)
    total_minutiae = min(len(probe_m), len(gallery_m))
    if total_minutiae > 0:
        ratio = best_matches / float(total_minutiae)
        max_score = round(ratio * 1000.0, 1)

    return max_score, best_matches


def verify_fingerprint_match(probe_b64, gallery_b64):
    """
    Decodes base64 templates, runs minutiae matching, and returns result dictionary.
    """
    if not probe_b64 or not gallery_b64:
        return {"matched": False, "score": 0, "status": False, "reason": "Empty template"}

    # Exact string match shortcut
    if probe_b64.strip() == gallery_b64.strip():
        return {"matched": True, "score": 1000, "status": True, "matches": 100, "reason": "Exact match"}

    try:
        probe_bytes = base64.b64decode(probe_b64)
    except Exception:
        probe_bytes = probe_b64.encode("utf-8", errors="ignore")

    try:
        gallery_bytes = base64.b64decode(gallery_b64)
    except Exception:
        gallery_bytes = gallery_b64.encode("utf-8", errors="ignore")

    probe_minutiae = parse_minutiae_template(probe_bytes)
    gallery_minutiae = parse_minutiae_template(gallery_bytes)

    score, matches = match_minutiae_sets(probe_minutiae, gallery_minutiae)

    # Acceptance threshold: >= 12 matched minutiae or similarity score >= 350 (35%)
    is_match = (matches >= 12) or (score >= 350.0)

    return {
        "matched": is_match,
        "status": is_match,
        "score": score,
        "matches": matches,
        "probeCount": len(probe_minutiae),
        "galleryCount": len(gallery_minutiae)
    }


class BiometricHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self._send_cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()

        if self.path in ("/health", "/", "/mfs100/info", "/mfs110/info"):
            res = {
                "status": "ok",
                "service": "Gurukul Local Biometric Matcher",
                "engine": "ISO-19794-2 / ANSI-378 Minutiae Matcher",
                "port": PORT,
                "Model": "MFS110",
                "ErrorCode": 0
            }
            self.wfile.write(json.dumps(res).encode())
        else:
            self.wfile.write(json.dumps({"status": "running"}).encode())

    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b"{}"

        try:
            req_data = json.loads(post_body.decode("utf-8"))
        except Exception:
            req_data = {}

        # 1. Mantra MFS100 / MFS110 Client Match Endpoint: /mfs100/match or /mfs110/match
        if self.path in ("/mfs100/match", "/mfs110/match", "/match"):
            probe = req_data.get("ProbTemplate") or req_data.get("ProbeTemplate") or req_data.get("probe", "")
            gallery = req_data.get("GalleryTemplate") or req_data.get("GallaryTemplate") or req_data.get("gallery", "")

            result = verify_fingerprint_match(probe, gallery)
            
            response_payload = {
                "ErrorCode": 0 if result["matched"] else 1,
                "ErrorDescription": "Fingerprint matched" if result["matched"] else "Fingerprint did not match",
                "Status": result["matched"],
                "Score": result["score"],
                "MatchingScore": result["score"],
                "MatchedMinutiae": result.get("matches", 0)
            }

            self.send_response(200)
            self._send_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode())
            print(f"[Match Request] Score: {result['score']} | Matched: {result['matched']} (Minutiae: {result.get('matches', 0)})")
            return

        # 2. General Biometric Verification Endpoint: /verify-biometric
        if self.path == "/verify-biometric":
            probe = req_data.get("probeTemplate") or req_data.get("probe") or req_data.get("ProbTemplate", "")
            gallery = req_data.get("galleryTemplate") or req_data.get("gallery") or req_data.get("GalleryTemplate", "")
            nfc_no = req_data.get("nfc_no", "")

            result = verify_fingerprint_match(probe, gallery)

            response_payload = {
                "ok": True,
                "verified": result["matched"],
                "status": result["matched"],
                "score": result["score"],
                "nfc_no": nfc_no,
                "message": "Biometric match verified" if result["matched"] else "Fingerprint does not match the scanned NFC card"
            }

            self.send_response(200)
            self._send_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode())
            return

        self.send_response(404)
        self._send_cors()
        self.end_headers()

def run(server_class=HTTPServer, handler_class=BiometricHandler, port=PORT):
    server_address = ("127.0.0.1", port)
    httpd = server_class(server_address, handler_class)
    print("=" * 60)
    print(f"🚀 Shree Swaminarayan Gurukul - Local Biometric Matcher Active")
    print(f"   Port: http://127.0.0.1:{port}")
    print(f"   Endpoints: /mfs100/match, /verify-biometric, /health")
    print("=" * 60)
    httpd.serve_forever()

if __name__ == "__main__":
    run()
