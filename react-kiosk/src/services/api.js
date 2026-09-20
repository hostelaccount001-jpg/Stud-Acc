const API_BASE_URL = 'http://localhost:5000/api/v1';

export const verifyFaceBiometric = async (imageBase64) => {
  try {
    const res = await fetch(`${API_BASE_URL}/verify-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64, kiosk_id: 'KIOSK-MAIN' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Face verification failed');
    return data;
  } catch (err) {
    console.warn('[Face API Error]', err.message);
    throw err;
  }
};

export const verifyNfcSession = async (sessionId, scannedNfcUid) => {
  try {
    const res = await fetch(`${API_BASE_URL}/verify-nfc-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        scanned_nfc_uid: scannedNfcUid,
        kiosk_id: 'KIOSK-MAIN',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'NFC Verification Failed');
    return data;
  } catch (err) {
    console.warn('[NFC Session API Error]', err.message);
    throw err;
  }
};

export const triggerThermalPrintJob = async (receiptData) => {
  try {
    const res = await fetch(`${API_BASE_URL}/print-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receiptData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Print job failed');
    return data;
  } catch (err) {
    console.warn('[Thermal Print API Error]', err.message);
    throw err;
  }
};

export const logUnmatchedScanApi = async ({ deviceId, attemptedNfc, attemptedSuid, alertReason, snapshotBase64 }) => {
  try {
    const res = await fetch(`${API_BASE_URL}/log-unmatched-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: deviceId || 'KIOSK-MAIN',
        attempted_nfc: attemptedNfc || '',
        attempted_suid: attemptedSuid || '',
        alert_reason: alertReason,
        snapshot_base64: snapshotBase64 || '',
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn('[Audit Log API Error]', err.message);
  }
};

export const fetchStudentsApi = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/students`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[Fetch Students Error]', err.message);
    return [];
  }
};

export const saveStudentApi = async (studentData) => {
  try {
    const res = await fetch(`${API_BASE_URL}/save-student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: studentData.id,
        name: studentData.name,
        suid: studentData.suid,
        nfc_code: studentData.nfcCode || studentData.nfc_code || '',
        standard: studentData.standard || '',
        mobile_number: studentData.mobileNumber || studentData.mobile_number || '',
        face_vector: studentData.faceVector || studentData.face_vector || [],
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn('[Save Student Error]', err.message);
    throw err;
  }
};

export const deleteStudentApi = async (studentId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/students/${studentId}`, {
      method: 'DELETE',
    });
    return await res.json();
  } catch (err) {
    console.warn('[Delete Student Error]', err.message);
    throw err;
  }
};

export const enrollStudentFaceApi = async ({ studentId, name, suid, nfcCode, standard, imageBase64 }) => {
  try {
    const res = await fetch(`${API_BASE_URL}/enroll-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        name: name,
        suid: suid,
        nfc_code: nfcCode || '',
        standard: standard || '',
        image_base64: imageBase64,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Enrollment failed');
    return data;
  } catch (err) {
    console.warn('[Enroll Face Error]', err.message);
    throw err;
  }
};

export const fetchAuditLogsApi = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/unmatched-scans`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[Fetch Audit Logs Error]', err.message);
    return [];
  }
};

