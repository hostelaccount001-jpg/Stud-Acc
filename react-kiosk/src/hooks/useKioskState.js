import { useState, useCallback } from 'react';
import { verifyNfcSession } from '../services/api';
import {
  captureFingerprintFromDevice,
  identifyStudentFromFingerprint,
  generateSimulatedFingerprint,
  playBiometricSound,
} from '../services/mantraMfs100';
import { fetchRegisteredStudents } from '../services/supabaseClient';

export const KioskStep = {
  IDLE: 'IDLE',
  SCANNING_FINGERPRINT: 'SCANNING_FINGERPRINT',
  FINGERPRINT_VERIFIED: 'FINGERPRINT_VERIFIED',
  AWAITING_NFC: 'AWAITING_NFC',
  FULLY_VERIFIED: 'FULLY_VERIFIED',
  MISMATCH: 'MISMATCH',
};

export const useKioskState = () => {
  const [step, setStep] = useState(KioskStep.IDLE);
  const [identifiedStudent, setIdentifiedStudent] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [matchPercentage, setMatchPercentage] = useState(0);
  const [scannedNfcCode, setScannedNfcCode] = useState('');
  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [statusMessage, setStatusMessage] = useState(
    'Place finger on Mantra MFS 100 scanner to begin'
  );
  const [errorMessage, setErrorMessage] = useState('');

  const resetKiosk = useCallback(() => {
    setStep(KioskStep.IDLE);
    setIdentifiedStudent(null);
    setSessionId(null);
    setMatchPercentage(0);
    setScannedNfcCode('');
    setVerifiedStudent(null);
    setErrorMessage('');
    setStatusMessage('Kiosk reset. Place finger on Mantra MFS 100 scanner.');
  }, []);

  const triggerFingerprintVerification = useCallback(async () => {
    setStep(KioskStep.SCANNING_FINGERPRINT);
    setStatusMessage('STEP 1: READING MANTRA MFS 100 OPTICAL SENSOR...');
    setErrorMessage('');
    playBiometricSound('scan');

    try {
      const captureResult = await captureFingerprintFromDevice({ quality: 60, timeout: 10 });

      if (!captureResult.success) {
        playBiometricSound('error');
        setStep(KioskStep.MISMATCH);
        setErrorMessage(captureResult.error || 'Scanner timed out or aborted.');
        return;
      }

      setStatusMessage('Matching fingerprint template against enrolled students...');
      const { enrolledStudents } = await fetchRegisteredStudents();
      const identifyResult = await identifyStudentFromFingerprint(
        captureResult.isoTemplate,
        enrolledStudents
      );

      if (identifyResult.matched && identifyResult.student) {
        playBiometricSound('success');
        const student = identifyResult.student;
        setIdentifiedStudent(student);
        setSessionId(`SES-${Date.now()}`);
        setMatchPercentage(identifyResult.confidencePercentage || 98.5);
        setStep(KioskStep.AWAITING_NFC);
        setStatusMessage(
          `STEP 1 PASSED: FINGERPRINT VERIFIED FOR ${student.name} (${student.suid})! NOW TAP NFC CARD...`
        );
      } else {
        playBiometricSound('error');
        setStep(KioskStep.MISMATCH);
        setErrorMessage('Fingerprint not found in registered student database.');
      }
    } catch (err) {
      playBiometricSound('error');
      setStep(KioskStep.MISMATCH);
      setErrorMessage(err.message || 'Mantra fingerprint verification error.');
    }
  }, []);

  const triggerSimulatedFingerprint = useCallback(async (targetStudent = null) => {
    setStep(KioskStep.SCANNING_FINGERPRINT);
    setStatusMessage('SIMULATING MANTRA MFS 100 SCAN...');
    playBiometricSound('scan');

    setTimeout(async () => {
      const { enrolledStudents, allStudents } = await fetchRegisteredStudents();
      const pool = enrolledStudents.length > 0 ? enrolledStudents : allStudents;
      const student = targetStudent || pool[0];

      if (student) {
        playBiometricSound('success');
        setIdentifiedStudent(student);
        setSessionId(`SES-${Date.now()}`);
        setMatchPercentage(99.2);
        setStep(KioskStep.AWAITING_NFC);
        setStatusMessage(
          `STEP 1 PASSED: FINGERPRINT VERIFIED FOR ${student.name} (${student.suid})! NOW TAP NFC CARD...`
        );
      } else {
        playBiometricSound('error');
        setStep(KioskStep.MISMATCH);
        setErrorMessage('No enrolled students available to simulate.');
      }
    }, 700);
  }, []);

  const triggerNfcVerification = useCallback(
    async (nfcCodeInput) => {
      if (!identifiedStudent) {
        setErrorMessage('LOCKED: Complete Step 1 (Fingerprint Scan) before scanning NFC card.');
        return;
      }
      const cleanInput = nfcCodeInput.trim();
      setScannedNfcCode(cleanInput);
      setStatusMessage(`STEP 2: CROSS-VERIFYING CARD ${cleanInput} WITH STUDENT IDENTITY...`);

      try {
        let isMatch = false;
        if (sessionId && !sessionId.startsWith('SES-')) {
          try {
            const res = await verifyNfcSession(sessionId, cleanInput);
            if (res.status === 'SUCCESS') isMatch = true;
          } catch (e) {
            console.warn('[Session Verification Note]', e);
          }
        }

        const expectedClean = (identifiedStudent.nfcCode || '')
          .toUpperCase()
          .replace(/[:-]/g, '');
        const scannedClean = cleanInput.toUpperCase().replace(/[:-]/g, '');
        if (
          scannedClean === expectedClean ||
          (scannedClean && expectedClean.includes(scannedClean)) ||
          !expectedClean // if no NFC registered yet
        ) {
          isMatch = true;
        }

        if (isMatch) {
          playBiometricSound('success');
          setVerifiedStudent(identifiedStudent);
          setStep(KioskStep.FULLY_VERIFIED);
          setStatusMessage(
            `DUAL AUTHENTICATION PASSED: Fingerprint & NFC Matched for ${identifiedStudent.name}! Services Unlocked.`
          );
        } else {
          playBiometricSound('error');
          setStep(KioskStep.MISMATCH);
          setErrorMessage(
            `ACCESS DENIED: Fingerprint verified for ${identifiedStudent.name}, but scanned NFC Card (${cleanInput}) does NOT match registered card (${identifiedStudent.nfcCode})!`
          );
        }
      } catch (err) {
        playBiometricSound('error');
        setStep(KioskStep.MISMATCH);
        setErrorMessage(err.message || 'NFC verification failed.');
      }
    },
    [identifiedStudent, sessionId]
  );

  return {
    step,
    identifiedStudent,
    matchPercentage,
    scannedNfcCode,
    verifiedStudent,
    statusMessage,
    errorMessage,
    resetKiosk,
    triggerFingerprintVerification,
    triggerSimulatedFingerprint,
    triggerNfcVerification,
    // Alias for backward compatibility
    triggerFaceVerification: triggerFingerprintVerification,
  };
};

export default useKioskState;
