import { cn } from "@/lib/utils";

export type ReceiptData = {
  receiptNo: number;
  suid: string;
  name: string;
  className?: string | null | undefined;
  roomNo?: string | null | undefined;
  service: string;
  amount: number;
  at: string;
};

export function ReceiptSlip({
  title = "SHREE SWAMINARAYAN GURUKUL, RAJKOT",
  receipt,
  footerText = "Jay Swaminarayan",
  preview = false,
}: {
  title: string;
  receipt: ReceiptData;
  footerText?: string;
  preview?: boolean;
}) {
  const at = new Date(receipt.at);
  const formattedNo = String(receipt.receiptNo);
  const dateStr = `${at.getDate()}/${at.getMonth() + 1}/${at.getFullYear()}`;

  return (
    <div
      id="print-receipt"
      className={cn(
        "font-mono text-black text-xs leading-tight w-full max-w-[72mm] mx-auto p-4 bg-white",
        preview
          ? "rounded-2xl border-2 border-dashed border-[#d8c5af] shadow-sm space-y-1"
          : "print:block"
      )}
    >
      {/* Header */}
      <div className="text-center font-bold uppercase text-[13px] text-[#4a1c14] tracking-wide leading-snug">
        {title}
      </div>
      <div className="text-center text-[10px] text-zinc-500 tracking-wider mt-0.5">
        Cashless Service Receipt
      </div>

      {/* Dashed Separator */}
      <div className="text-center text-zinc-400 text-xs my-1 select-none overflow-hidden">
        --------------------------------
      </div>

      {/* Details */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-600">Receipt No:</span>
          <span className="font-bold text-[#8b2500]">#{formattedNo}</span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-600">Date:</span>
          <span className="font-semibold text-zinc-800">{dateStr}</span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-600">SUID:</span>
          <span className="font-bold text-[#8b2500]">{receipt.suid}</span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-600">Name:</span>
          <span className="font-bold uppercase text-zinc-900 text-right truncate max-w-[65%]">
            {receipt.name}
          </span>
        </div>

        {receipt.className && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-600">Class:</span>
            <span className="font-medium text-zinc-800">{receipt.className}</span>
          </div>
        )}

        {receipt.roomNo && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-600">Room:</span>
            <span className="font-medium text-zinc-800">{receipt.roomNo}</span>
          </div>
        )}
      </div>

      {/* Dashed Separator */}
      <div className="text-center text-zinc-400 text-xs my-1 select-none overflow-hidden">
        --------------------------------
      </div>

      {/* Service & Amount */}
      <div className="flex justify-between items-center font-bold text-sm text-[#4a1c14] py-1">
        <span>{receipt.service} / Service:</span>
        <span className="text-[#8b2500]">Rs. {Number(receipt.amount).toFixed(2)}</span>
      </div>

      {/* Dashed Separator */}
      <div className="text-center text-zinc-400 text-xs my-1 select-none overflow-hidden">
        --------------------------------
      </div>

      {/* Footer Blessing */}
      <div className="text-center font-bold mt-2 text-[#4a1c14] text-xs">
        {footerText}
      </div>
    </div>
  );
}
