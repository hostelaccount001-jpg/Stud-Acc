import React from 'react';
import { Printer, CheckCircle2, X } from 'lucide-react';

export const ReceiptModal = ({ receiptData, onClose }) => {
  if (!receiptData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="cyber-card max-w-md w-full p-6 border-2 border-emerald-500 cyber-glow-green space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-emerald-400 font-orbitron font-bold text-sm">
            <Printer className="w-5 h-5" />
            <span>THERMAL RECEIPT PRINTED</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Slip Display */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
          {`========================================
       STUDENT KIOSK ERP SYSTEM        
         OFFICIAL PAYMENT SLIP         
========================================
DATE/TIME: ${new Date().toLocaleString()}
RECEIPT NO: TXN-${Date.now().toString().slice(-6)}
----------------------------------------
STUDENT NAME : ${receiptData.student?.name?.toUpperCase()}
SUID / ID    : ${receiptData.student?.suid}
----------------------------------------
SERVICE      : ${receiptData.serviceName}
TOTAL PAID   : INR ${receiptData.amount.toFixed(2)}
STATUS       : CLEARED / SUCCESS
----------------------------------------
AUTHENTICATION MODE:
[X] FACE BIOMETRIC (PASSED)
[X] NFC HARDWARE CARD (PASSED)
========================================
     THANK YOU! KEEP THIS RECEIPT.      
========================================`}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-orbitron font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>CLOSE & RESET KIOSK</span>
        </button>
      </div>
    </div>
  );
};
