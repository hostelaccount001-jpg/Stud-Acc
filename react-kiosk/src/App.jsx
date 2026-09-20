import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FingerprintAttendanceScanner } from './components/FingerprintAttendanceScanner';
import { FingerprintRegistrationModal } from './components/FingerprintRegistrationModal';
import { StudentRosterTab } from './components/StudentRosterTab';
import { SupabaseSettingsModal } from './components/SupabaseSettingsModal';
import { FingerprintVerificationCard } from './components/FingerprintVerificationCard';
import { NfcVerificationCard } from './components/NfcVerificationCard';
import { ServiceOptionsGrid } from './components/ServiceOptionsGrid';
import { ReceiptModal } from './components/ReceiptModal';
import { useKioskState, KioskStep } from './hooks/useKioskState';
import { triggerThermalPrintJob } from './services/api';
import { fetchRegisteredStudents } from './services/supabaseClient';
import { AlertCircle } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'kiosk', 'students'
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState(null);
  const [existingStudents, setExistingStudents] = useState([]);

  // Kiosk workflow hooks
  const {
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
  } = useKioskState();

  const [receiptModalData, setReceiptModalData] = useState(null);

  // Load students for registration dropdown and cache
  const loadStudents = async () => {
    const { allStudents } = await fetchRegisteredStudents();
    setExistingStudents(allStudents);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleOpenRegisterFingerprint = (studentId = null) => {
    setTargetStudentId(studentId);
    setIsRegisterModalOpen(true);
  };

  const handleStudentSaved = (savedStudent) => {
    loadStudents();
  };

  const handleExecutePayment = async (paymentData) => {
    try {
      await triggerThermalPrintJob({
        transaction_id: `TXN-${Date.now().toString().slice(-6)}`,
        student_name: paymentData.student.name,
        suid: paymentData.student.suid,
        standard: paymentData.student.standard || 'Std 10-A',
        service_description: paymentData.serviceName,
        amount: paymentData.amount,
      });
    } catch (e) {
      console.warn('[Thermal Printer Note]', e);
    }
    setReceiptModalData(paymentData);
  };

  const handleResetAll = () => {
    resetKiosk();
    setReceiptModalData(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-3 md:p-4 flex flex-col gap-4 font-sans max-w-[1600px] mx-auto">
      {/* Top Header Bar */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenRegisterFace={() => handleOpenRegisterFingerprint()}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        step={step}
        onReset={handleResetAll}
      />

      {/* Dynamic View based on Active Tab */}
      {activeTab === 'attendance' && (
        <div className="flex-1 flex flex-col">
          <FingerprintAttendanceScanner
            onOpenRegisterModal={() => handleOpenRegisterFingerprint()}
          />
        </div>
      )}

      {activeTab === 'students' && (
        <div className="flex-1 flex flex-col">
          <StudentRosterTab
            onOpenRegisterFace={(id) => handleOpenRegisterFingerprint(id)}
          />
        </div>
      )}

      {activeTab === 'kiosk' && (
        <div className="flex-1 flex flex-col gap-4">
          {/* Interactive Telemetry Notification */}
          <div className="cyber-card p-3 flex items-center justify-between text-xs font-mono border-slate-800 bg-slate-950">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-cyan-400 font-bold tracking-wider">{statusMessage}</span>
            </div>
            {errorMessage && (
              <div className="flex items-center gap-1.5 text-red-400 font-bold bg-red-950/60 px-3 py-1 rounded border border-red-500/50">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Main Kiosk Grid Layout */}
          <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Step 1: Mantra MFS 100 Biometric Scan (5 Cols) */}
            <section className="lg:col-span-5 h-[540px]">
              <FingerprintVerificationCard
                step={step}
                identifiedStudent={identifiedStudent}
                matchPercentage={matchPercentage}
                onScanFingerprint={triggerFingerprintVerification}
                onSimulateFingerprint={triggerSimulatedFingerprint}
              />
            </section>

            {/* Right Section: Step 2 & Step 3 (7 Cols) */}
            <section className="lg:col-span-7 flex flex-col gap-4">
              {/* Step 2: NFC Verification Card */}
              <div className="h-[210px]">
                <NfcVerificationCard
                  step={step}
                  identifiedStudent={identifiedStudent}
                  scannedNfcCode={scannedNfcCode}
                  onVerifyNfc={triggerNfcVerification}
                />
              </div>

              {/* Step 3: Unlocked Service Options */}
              <div className="flex-1 min-h-[310px]">
                <ServiceOptionsGrid
                  step={step}
                  verifiedStudent={verifiedStudent}
                  onExecutePayment={handleExecutePayment}
                />
              </div>
            </section>
          </main>
        </div>
      )}

      {/* Module A: Fingerprint Registration / Enrollment Modal */}
      <FingerprintRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => {
          setIsRegisterModalOpen(false);
          setTargetStudentId(null);
        }}
        existingStudents={existingStudents}
        onStudentSaved={handleStudentSaved}
      />

      {/* Database Settings Modal */}
      <SupabaseSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onConfigUpdated={loadStudents}
      />

      {/* Receipt Modal for Kiosk Services */}
      <ReceiptModal
        receiptData={receiptModalData}
        onClose={handleResetAll}
      />
    </div>
  );
}

export default App;
