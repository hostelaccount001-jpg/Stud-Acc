import requests
from config import SUPABASE_URL, SUPABASE_KEY

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def fetch_all_students():
    """Fetches all student records with face vectors from Supabase"""
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/students?select=*", headers=headers, timeout=5)
        if r.status_code == 200:
            return r.json()
        return []
    except Exception as e:
        print(f"[Supabase Fetch Error] {e}")
        return []

def save_student_face_vector(student_id: str, suid: str, payload: dict):
    """Saves or updates face vector for student in Supabase"""
    try:
        r_patch = requests.patch(f"{SUPABASE_URL}/rest/v1/students?id=eq.{student_id}", headers=headers, json=payload)
        if r_patch.status_code not in (200, 204) or not r_patch.text or r_patch.text == "[]":
            r_suid = requests.patch(f"{SUPABASE_URL}/rest/v1/students?suid=eq.{suid}", headers=headers, json=payload)
            if r_suid.status_code not in (200, 204) or not r_suid.text or r_suid.text == "[]":
                requests.post(f"{SUPABASE_URL}/rest/v1/students", headers=headers, json=payload)
        return True
    except Exception as e:
        print(f"[Supabase Save Error] {e}")
        return False

def record_attendance(entry: dict):
    """Logs atomic attendance record in Supabase"""
    try:
        r = requests.post(f"{SUPABASE_URL}/rest/v1/attendance", headers=headers, json=entry)
        return r.status_code in (200, 201)
    except Exception as e:
        print(f"[Supabase Attendance Error] {e}")
        return False

def log_unmatched_scan(alert_entry: dict):
    """Logs security alert for unmatched scans in Supabase"""
    try:
        r = requests.post(f"{SUPABASE_URL}/rest/v1/unmatched_scans", headers=headers, json=alert_entry)
        return r.status_code in (200, 201)
    except Exception as e:
        print(f"[Supabase Unmatched Log Error] {e}")
        return False

def fetch_unmatched_scans():
    """Fetches recent security audit discrepancy logs from Supabase"""
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/unmatched_scans?select=*&order=id.desc&limit=50", headers=headers, timeout=5)
        if r.status_code == 200:
            return r.json()
        return []
    except Exception as e:
        print(f"[Supabase Audit Log Fetch Error] {e}")
        return []

def delete_student(student_id: str):
    """Deletes student record from Supabase"""
    try:
        r = requests.delete(f"{SUPABASE_URL}/rest/v1/students?id=eq.{student_id}", headers=headers)
        return r.status_code in (200, 204)
    except Exception as e:
        print(f"[Supabase Delete Student Error] {e}")
        return False

