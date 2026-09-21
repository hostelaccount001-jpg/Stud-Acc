import { createFileRoute } from "@tanstack/react-router";
import WalletPage from "./_authenticated.admin.wallet";

export const Route = createFileRoute("/_authenticated/admin/daily-ledger")({
  head: () => ({
    meta: [
      { title: "Student Wallet & Ledger — Gurukul Kiosk ERP" },
      {
        name: "description",
        content: "Manage student wallets and upload daily Excel transaction reports.",
      },
    ],
  }),
  component: WalletPage,
});
