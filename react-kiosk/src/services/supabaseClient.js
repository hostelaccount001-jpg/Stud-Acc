import { createClient } from '@supabase/supabase-js';

const STORAGE_KEYS = {
  SUPABASE_URL: 'kiosk_supabase_url',
  SUPABASE_KEY: 'kiosk_supabase_key',
  STUDENTS_CACHE: 'kiosk_registered_students',
  ATTENDANCE_CACHE: 'kiosk_attendance_records',
};

// Default or stored credentials
export const getSupabaseConfig = () => {
  const url = localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || import.meta.env.VITE_SUPABASE_URL || '';
  const key = localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY) || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, key };
};

export const saveSupabaseConfig = (url, key) => {
  localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url.trim());
  localStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, key.trim());
  cachedClient = null; // reset cached instance
};

let cachedClient = null;

export const getSupabaseClient = () => {
  if (cachedClient) return cachedClient;
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    try {
      cachedClient = createClient(url, key, {
        auth: { persistSession: false },
      });
      return cachedClient;
    } catch (e) {
      console.warn('[Supabase Init Note]', e.message);
    }
  }
  return null;
};

// Local storage helpers for 100% reliable offline resilience
const getLocalStudents = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS_CACHE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalStudents = (students) => {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS_CACHE, JSON.stringify(students));
  } catch (e) {
    console.warn('[Local Student Save Note]', e);
  }
};

/**
 * Fetches all students with registered fingerprint templates
 */
export const fetchRegisteredStudents = async () => {
  const client = getSupabaseClient();
  let students = [];
  let source = 'local';

  if (client) {
    try {
      const { data, error } = await client
        .from('students')
        .select('*')
        .order('name', { ascending: true });

      if (!error && Array.isArray(data)) {
        students = data.map((s) => ({
          id: s.id,
          name: s.name,
          suid: s.suid || s.roll_number || 'N/A',
          standard: s.standard || 'Std 10',
          nfcCode: s.nfc_code || s.nfcCode || '',
          mobileNumber: s.mobile_number || '',
          fingerprintTemplate: s.fingerprint_template || s.fingerprintTemplate || null,
          fingerprintImage: s.fingerprint_image || s.fingerprintImage || null,
          photoUrl: s.photo_url || s.captured_image || null,
        }));
        source = 'supabase';
        saveLocalStudents(students);
      }
    } catch (err) {
      console.warn('[Supabase Fetch Students Warning]', err.message);
    }
  }

  // Fallback to local storage if supabase returned empty or failed
  if (!students || students.length === 0) {
    students = getLocalStudents();
    source = 'local';
  }

  // Filter students who have a registered Mantra MFS 100 fingerprint template
  const enrolledStudents = students.filter(
    (s) => Boolean(s.fingerprintTemplate) && s.fingerprintTemplate.length > 0
  );

  return { allStudents: students, enrolledStudents, source };
};

/**
 * Saves student's Mantra MFS 100 fingerprint template and bitmap image
 */
export const saveStudentFingerprint = async ({
  studentId,
  isoTemplate,
  fingerprintImage,
  studentName,
  suid,
  standard,
  nfcCode,
  mobileNumber,
  photoBase64,
}) => {
  const client = getSupabaseClient();
  let dbSuccess = false;
  let finalId = studentId;

  const updatePayload = {
    fingerprint_template: isoTemplate,
    fingerprint_image: fingerprintImage || null,
    updated_at: new Date().toISOString(),
  };

  if (photoBase64) {
    updatePayload.photo_url = photoBase64;
  }

  if (client && studentId) {
    try {
      const { data, error } = await client
        .from('students')
        .update(updatePayload)
        .eq('id', studentId)
        .select();

      if (!error && data && data.length > 0) {
        dbSuccess = true;
      } else if (suid) {
        const { data: suidData, error: suidErr } = await client
          .from('students')
          .update(updatePayload)
          .eq('suid', suid)
          .select();
        if (!suidErr && suidData && suidData.length > 0) {
          dbSuccess = true;
          finalId = suidData[0].id;
        }
      }
    } catch (e) {
      console.warn('[Supabase Fingerprint Update Exception]', e.message);
    }
  }

  // If new student or supabase insert needed
  if (client && !dbSuccess) {
    try {
      const newRecord = {
        name: studentName || 'New Student',
        suid: suid || `SUID-${Date.now().toString().slice(-4)}`,
        nfc_code: nfcCode || `NFC-${Math.floor(100000 + Math.random() * 900000)}`,
        standard: standard || 'Std 10-A',
        mobile_number: mobileNumber || '',
        fingerprint_template: isoTemplate,
        fingerprint_image: fingerprintImage || null,
        photo_url: photoBase64 || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await client
        .from('students')
        .insert([newRecord])
        .select();
      if (!error && data && data.length > 0) {
        dbSuccess = true;
        finalId = data[0].id;
      }
    } catch (e) {
      console.warn('[Supabase Student Insert Exception]', e.message);
    }
  }

  // Always update local cache for instant zero-latency recognition
  const localList = getLocalStudents();
  const existingIdx = localList.findIndex((s) => s.id === finalId || (suid && s.suid === suid));
  const studentEntry = {
    id: finalId || `STU-${Date.now()}`,
    name: studentName || 'Registered Student',
    suid: suid || `SUID-${Date.now().toString().slice(-4)}`,
    standard: standard || 'Std 10-A',
    nfcCode: nfcCode || '',
    mobileNumber: mobileNumber || '',
    fingerprintTemplate: isoTemplate,
    fingerprintImage: fingerprintImage || null,
    photoUrl: photoBase64 || null,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    localList[existingIdx] = { ...localList[existingIdx], ...studentEntry };
  } else {
    localList.push(studentEntry);
  }
  saveLocalStudents(localList);

  return {
    success: true,
    dbSaved: dbSuccess,
    student: studentEntry,
  };
};

// Compatibility export
export const saveStudentFaceEncoding = saveStudentFingerprint;

/**
 * Inserts biometric attendance record into Supabase (method: 'fingerprint')
 */
export const recordAttendance = async ({
  student,
  score = 1500,
  confidence = 98.5,
  method = 'fingerprint',
}) => {
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toTimeString().slice(0, 8);
  const client = getSupabaseClient();
  let dbSuccess = false;

  const attendanceRecord = {
    student_id: student.id,
    student_name: student.name,
    suid: student.suid,
    standard: student.standard,
    date: dateStr,
    time: timeStr,
    status: 'present',
    method: method || 'fingerprint',
    confidence_score: Number(confidence.toFixed(1)),
    distance: Number((score || 1500).toFixed(0)),
    created_at: new Date().toISOString(),
    photo_url: student.photoUrl || student.fingerprintImage || null,
  };

  if (client) {
    try {
      const { error } = await client.from('attendance').insert([
        {
          student_id: student.id,
          date: dateStr,
          time: timeStr,
          status: 'present',
          method: method || 'fingerprint',
          confidence_score: Number(confidence.toFixed(1)),
        },
      ]);
      if (!error) {
        dbSuccess = true;
      }
    } catch (e) {
      console.warn('[Supabase Attendance Insert Exception]', e.message);
    }
  }

  // Record in Local Attendance Feed
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_CACHE);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({ ...attendanceRecord, id: `ATT-${Date.now()}` });
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE_CACHE, JSON.stringify(list.slice(0, 100)));
  } catch (e) {
    console.warn('[Local Attendance Save Note]', e);
  }

  return { success: true, dbSaved: dbSuccess, record: attendanceRecord };
};

export const fetchAttendanceRecords = async () => {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('attendance')
        .select('*, students(name, suid, standard)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && Array.isArray(data)) {
        return data.map((row) => ({
          id: row.id,
          student_id: row.student_id,
          student_name: row.students?.name || row.student_name || 'Student',
          suid: row.students?.suid || row.suid || 'N/A',
          standard: row.students?.standard || row.standard || 'Std 10',
          date: row.date,
          time: row.time,
          status: row.status,
          method: row.method,
          confidence_score: row.confidence_score,
          distance: row.distance,
          created_at: row.created_at,
        }));
      }
    } catch (e) {
      console.warn('[Supabase Fetch Attendance Error]', e.message);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_CACHE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};
