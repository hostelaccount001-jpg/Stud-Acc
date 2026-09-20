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
}: {
  title: string;
  receipt: ReceiptData;
  footerText?: string;
}) {
  const at = new Date(receipt.at);
  const formattedNo = String(receipt.receiptNo);
  const dateStr = `${at.getDate()}/${at.getMonth() + 1}/${at.getFullYear()}`;

  return (
    <div id="print-receipt" className="hidden print:block text-black font-mono text-[12px] leading-relaxed mx-auto max-w-[72mm] p-2 bg-white">
      {/* Title & Subtitle */}
      <div style={{ textAlign: "center", fontWeight: 800, fontSize: "13px", textTransform: "uppercase", lineHeight: 1.2, marginBottom: "3px" }}>
        {title}
      </div>
      <div style={{ textAlign: "center", fontSize: "10px", color: "#444", letterSpacing: "0.5px", marginBottom: "6px" }}>
        Cashless Service Receipt
      </div>

      {/* Dashed Line */}
      <div style={{ textAlign: "center", color: "#666", fontSize: "11px", margin: "2px 0" }}>
        ----------------------------------------
      </div>

      {/* Meta Fields */}
      <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
        <span style={{ color: "#222" }}>Receipt No:</span>
        <span style={{ fontWeight: 800 }}>#{formattedNo}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
        <span style={{ color: "#222" }}>Date:</span>
        <span style={{ fontWeight: 600 }}>{dateStr}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
        <span style={{ color: "#222" }}>SUID:</span>
        <span style={{ fontWeight: 800 }}>{receipt.suid}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
        <span style={{ color: "#222" }}>Name:</span>
        <span style={{ fontWeight: 800, textTransform: "uppercase", textAlign: "right", maxWidth: "65%" }}>
          {receipt.name}
        </span>
      </div>

      {/* Dashed Line */}
      <div style={{ textAlign: "center", color: "#666", fontSize: "11px", margin: "4px 0" }}>
        ----------------------------------------
      </div>

      {/* Service & Price */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 800, margin: "6px 0" }}>
        <span>{receipt.service} / Service:</span>
        <span>Rs. {receipt.amount.toFixed(2)}</span>
      </div>

      {/* Dashed Line */}
      <div style={{ textAlign: "center", color: "#666", fontSize: "11px", margin: "4px 0" }}>
        ----------------------------------------
      </div>

      {/* Centered Blessing / Footer */}
      <div style={{ textAlign: "center", fontWeight: 800, fontSize: "12px", marginTop: "8px", marginBottom: "4px" }}>
        {footerText}
      </div>
    </div>
  );
}
