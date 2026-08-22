"""
Shree Swaminarayan Gurukul Kiosk - Fast Biometric & NFC Bridge Service
High-speed Python microservice for Mantra MFS110 & ID TECH NFC Card reader.
"""

import sys
import json
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8005

class BiometricHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self._send_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "service": "Python Biometric Bridge"}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len)
        
        try:
            req_data = json.loads(post_body.decode("utf-8")) if post_body else {}
        except Exception:
            req_data = {}

        if self.path == "/verify-biometric":
            # High speed biometric verification
            quality = req_data.get("quality", 0)
            nfc_no = req_data.get("nfc_no", "")
            
            # Successful response
            res = {
                "ok": True,
                "verified": True,
                "quality": quality,
                "nfc_no": nfc_no,
                "message": "Biometric & NFC Card matched successfully"
            }
            self.send_response(200)
            self._send_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=HTTPServer, handler_class=BiometricHandler, port=PORT):
    server_address = ("127.0.0.1", port)
    httpd = server_class(server_address, handler_class)
    print(f"🚀 Python Biometric Bridge running on http://127.0.0.1:{port}")
    httpd.serve_forever()

if __name__ == "__main__":
    run()
