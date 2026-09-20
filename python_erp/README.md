# Shree Swaminarayan Gurukul - Python Enterprise ERP & Kiosk Backend

A high-performance, asynchronous FastAPI backend engineered for Gurukul campus student accounts, NFC smart card issuance, direct Mantra MFS100 / MFS110 fingerprint minutiae matching (ISO-19794-2), and silent ESC/POS thermal printing.

---

## ⚡ Key Highlights
- **Microsecond Response Time**: FastAPI + ASGI architecture with asynchronous database queries.
- **Enterprise Security**: JWT Authentication, CORS protection, SQL injection prevention via parameterized queries.
- **Hardware Integration**:
  - **Mantra MFS100 / MFS110**: Native ISO-19794-2 minutiae parser with rotational alignment $(<15\text{ms})$.
  - **Thermal Receipt Printer**: Silent raw ESC/POS byte streaming via Windows Print Spooler.
  - **NFC Smart Card Reader**: Real-time UID normalization and card validation.
- **Pure Fingerprint Kiosk Flow**: 100% free of webcams/face recognition for strict hardware compliance.

---

## 🚀 How to Run

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env` from root or configure `python_erp/.env`:
```env
SUPABASE_URL=https://jjkxtgtbogtzhbuxutag.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=8000
```

### 3. Start the Server
```bash
python run_server.py
```

- **API Base URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/api/docs`

---

## 📚 API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/kiosk/config` | Active services, settings & enrolled student cache |
| `POST` | `/api/kiosk/lookup` | Step 1: Lookup student by NFC UID or SUID |
| `POST` | `/api/kiosk/verify-fingerprint` | Step 2: 1:1 ISO minutiae fingerprint verification |
| `POST` | `/api/kiosk/punch` | Step 3: Service punch, ledger commit & thermal print |
| `GET` | `/api/students` | List, search and filter students |
| `POST` | `/api/students` | Enroll student + 10-finger biometric minutiae |
| `GET` | `/api/services` | List active services & price rates |
| `GET` | `/api/reports/transactions` | Full ledger transaction history |
| `GET` | `/api/reports/export-excel` | Export complete ledger to Excel (.xlsx) |
| `POST` | `/api/hardware/mantra/match` | Direct Mantra minutiae matching bridge |
| `POST` | `/api/hardware/printer/print-receipt` | Direct thermal ESC/POS print test |
