/**
 * Mantra MFS 100 Fingerprint Scanner Service Driver
 * Communicates with local Mantra MFS100 Client Service via HTTP
 * Standard ports: 8031, 8032, 8003, 8004
 */

const DEFAULT_PORTS = [8031, 8032, 8003, 8004];
let detectedPort = 8031;
let isDeviceOnline = false;

/**
 * Web Audio API based chimes (success, scan, alert) for zero-dependency sound
 */
export const playBiometricSound = (type = 'success') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      // Crisp 2-tone futuristic chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'scan') {
      // Sensor active pulse tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      // Error buzz tone
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(150, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (e) {
    // AudioContext blocked or not supported
  }
};

/**
 * Probes the local Mantra MFS100 Client Service on standard ports
 */
export const checkMfs100Service = async () => {
  for (const port of DEFAULT_PORTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const response = await fetch(`http://127.0.0.1:${port}/mfs100/info`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        detectedPort = port;
        isDeviceOnline = true;
        return {
          online: true,
          port,
          info: data,
          scannerConnected: data.ErrorCode === '0' || !data.ErrorCode || data.Status === true,
        };
      }
    } catch (e) {
      // Continue trying next port
    }
  }

  isDeviceOnline = false;
  return {
    online: false,
    port: null,
    info: null,
    scannerConnected: false,
  };
};

/**
 * Captures live fingerprint from Mantra MFS 100
 * @param {Object} options - { quality: number, timeout: number }
 */
export const captureFingerprintFromDevice = async ({ quality = 60, timeout = 10 } = {}) => {
  const serviceUrl = `http://127.0.0.1:${detectedPort}/mfs100/capture`;

  try {
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Quality: quality,
        TimeOut: timeout,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from MFS100 service`);
    }

    const result = await response.json();

    if (result.ErrorCode === '0' || result.ErrorCode === 0) {
      return {
        success: true,
        quality: result.Quality || 0,
        nfiq: result.Nfiq || 1,
        isoTemplate: result.IsoTemplate || '',
        ansiTemplate: result.AnsiTemplate || '',
        bitmapData: result.BitmapData ? `data:image/bmp;base64,${result.BitmapData}` : null,
        raw: result,
      };
    } else {
      return {
        success: false,
        error: result.ErrorDescription || `Error code ${result.ErrorCode}`,
        code: result.ErrorCode,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: `Could not connect to Mantra MFS100 Client Service on port ${detectedPort}. Ensure service is running.`,
      isNetworkError: true,
    };
  }
};

/**
 * Matches two ISO templates using Mantra MFS 100 local match service
 */
export const matchFingerprintTemplates = async (probeIso, galleryIso) => {
  if (!probeIso || !galleryIso) return { matched: false, score: 0 };

  const serviceUrl = `http://127.0.0.1:${detectedPort}/mfs100/match`;

  try {
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        FingerData: probeIso,
        VerifyFingerData: galleryIso,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      const score = Number(result.Score || 0);
      const isMatched = result.Status === true || score >= 1400;
      return {
        matched: isMatched,
        score,
        status: result.Status,
      };
    }
  } catch (e) {
    // Fallback if match endpoint not reachable
  }

  // Fallback direct match for identical or simulator templates
  if (probeIso === galleryIso) {
    return { matched: true, score: 1800 };
  }

  return { matched: false, score: 0 };
};

/**
 * 1:N Identification: Matches captured template against all enrolled students
 */
export const identifyStudentFromFingerprint = async (probeTemplate, enrolledStudents) => {
  if (!probeTemplate || !Array.isArray(enrolledStudents) || enrolledStudents.length === 0) {
    return { matched: false, student: null, score: 0 };
  }

  let bestMatch = null;
  let highestScore = 0;

  for (const student of enrolledStudents) {
    const studentTemplate = student.fingerprintTemplate || student.fingerprint_template;
    if (!studentTemplate) continue;

    const matchRes = await matchFingerprintTemplates(probeTemplate, studentTemplate);

    if (matchRes.matched && matchRes.score > highestScore) {
      highestScore = matchRes.score;
      bestMatch = student;
    }
  }

  if (bestMatch && (highestScore >= 1400 || highestScore > 0)) {
    return {
      matched: true,
      student: bestMatch,
      score: highestScore,
      confidencePercentage: Math.min(100, Math.round((highestScore / 1800) * 100)),
    };
  }

  return { matched: false, student: null, score: highestScore };
};

/**
 * Generates a mock fingerprint template and preview for test simulation
 */
export const generateSimulatedFingerprint = (student = null) => {
  const simulatedIso = student
    ? (student.fingerprintTemplate || `SIM-ISO-${student.suid || student.id}`)
    : `SIM-ISO-${Date.now()}`;

  return {
    success: true,
    quality: Math.floor(75 + Math.random() * 20),
    nfiq: 1,
    isoTemplate: simulatedIso,
    bitmapData: null,
    isSimulated: true,
  };
};
