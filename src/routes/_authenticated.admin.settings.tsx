import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sliders, Save, CheckCircle2, Loader2, Eye, Receipt, SlidersHorizontal } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getSettingsServer, updateSettingsServer } from "@/lib/settings.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Limits & Messages — Gurukul Kiosk ERP" },
      { name: "description", content: "Set cumulative daily spend cap and customize kiosk messages, title and receipt footer." },
    ],
  }),
  component: SettingsPage,
});

const FIELDS: { key: string; label: string; hint: string; multiline?: boolean; placeholder?: string }[] = [
  {
    key: "daily_limit",
    label: "Cumulative Daily Limit (₹)",
    hint: "Max amount a student can spend per day across all services. (0 = Unlimited)",
    placeholder: "500",
  },
  {
    key: "msg_success",
    label: "Success Message",
    hint: "Message shown on kiosk when transaction is approved.",
    multiline: true,
    placeholder: "Thank you! Your receipt has been generated.",
  },
  {
    key: "msg_limit",
    label: "Limit Reached Warning Message",
    hint: "Message shown when a student exceeds their daily spend limit.",
    multiline: true,
    placeholder: "Today's limit is over. Please come tomorrow.",
  },
  {
    key: "msg_blocked",
    label: "Card Blocked Message",
    hint: "Message shown when a blocked card is tapped.",
    multiline: true,
    placeholder: "Your card is temporarily blocked. Please contact the office.",
  },
  {
    key: "kiosk_title",
    label: "Kiosk & Receipt Institution Name",
    hint: "Main institution name displayed at the top of the Kiosk and on the Thermal Receipt.",
    placeholder: "Shree Swaminarayan Gurukul, Rajkot",
  },
  {
    key: "kiosk_subtitle",
    label: "Kiosk Subtitle",
    hint: "Subtitle line displayed beneath the main heading.",
    placeholder: "Cashless Service Kiosk",
  },
  {
    key: "receipt_footer",
    label: "Receipt Footer Blessing / Note",
    hint: "Printed at the very bottom of the thermal receipt slip.",
    placeholder: "Jay Swaminarayan",
  },
];

function SettingsPage() {
  const qc = useQueryClient();
  const { isAdmin } = useCurrentUser();
  const [values, setValues] = useState<Record<string, string>>({});

  const getSettings = useServerFn(getSettingsServer);
  const updateSettings = useServerFn(updateSettingsServer);

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings(),
  });

  useEffect(() => {
    if (settings.data) {
      setValues(settings.data);
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      await updateSettings({
        data: {
          settings: values,
        },
      });
    },
    onSuccess: () => {
      toast.success("Settings and messages saved successfully!");
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["kiosk-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewTitle = values["kiosk_title"] || "Shree Swaminarayan Gurukul, Rajkot";
  const previewSubtitle = values["kiosk_subtitle"] || "Cashless Service Kiosk";
  const previewFooter = values["receipt_footer"] || "Jay Swaminarayan";

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-98 duration-300">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight flex items-center gap-2.5">
            <SlidersHorizontal className="size-8 text-[#8b2500]" /> Limits & Messages Configuration
          </h1>
          <p className="mt-1 text-sm text-[#7c533f] font-medium">
            Configure global spending caps, kiosk display headings, custom error messages, and receipt layout.
          </p>
        </div>

        <button
          type="button"
          disabled={!isAdmin || save.isPending}
          onClick={() => save.mutate()}
          className="btn-luxury-primary px-8 py-3 text-sm gap-2"
        >
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Changes
        </button>
      </header>

      {!isAdmin && (
        <Card className="card-luxury border-amber-500/40 bg-amber-500/10 p-4 text-xs font-bold text-amber-900">
          Only administrators can change these settings. You have read-only access.
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Settings Form */}
        <Card className="card-luxury p-6 md:p-8 lg:col-span-2 space-y-6">
          <div className="border-b border-[#e5d8c5] pb-4">
            <h2 className="text-lg font-serif font-bold text-[#4a1c14]">Kiosk Parameters & Message Templates</h2>
            <p className="text-xs text-[#7c533f]">Customize real-time terminal feedback and receipt texts</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.multiline ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
                <Label htmlFor={f.key} className="text-xs font-bold text-[#7c533f]">
                  {f.label}
                </Label>
                {f.multiline ? (
                  <Textarea
                    id={f.key}
                    rows={2}
                    maxLength={300}
                    disabled={!isAdmin}
                    placeholder={f.placeholder}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    className="input-luxury resize-none text-sm"
                  />
                ) : (
                  <Input
                    id={f.key}
                    type={f.key === "daily_limit" ? "number" : "text"}
                    maxLength={120}
                    disabled={!isAdmin}
                    placeholder={f.placeholder}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    className="input-luxury h-10 text-sm font-semibold"
                  />
                )}
                <p className="text-[11px] text-[#7c533f] font-medium">{f.hint}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#e5d8c5] flex justify-end">
            <button
              type="button"
              disabled={!isAdmin || save.isPending}
              onClick={() => save.mutate()}
              className="btn-luxury-primary px-8 py-3 text-sm gap-2"
            >
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save All Settings
            </button>
          </div>
        </Card>

        {/* Live Thermal Receipt & Heading Preview */}
        <div className="space-y-6">
          <Card className="card-luxury p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-[#7c533f]">
              <Eye className="size-4 text-[#8b2500]" /> Kiosk Header Preview
            </h3>
            <div className="rounded-2xl border-1.5 border-[#e5d8c5] bg-[#faf6ef] p-5 text-center text-[#2c1810] shadow-sm">
              <h4 className="font-serif font-bold text-lg text-[#4a1c14]">{previewTitle}</h4>
              <p className="text-xs font-semibold text-[#7c533f] mt-0.5">{previewSubtitle}</p>
            </div>
          </Card>

          <Card className="card-luxury p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-[#7c533f]">
              <Receipt className="size-4 text-[#8b2500]" /> Thermal Receipt Slip Preview
            </h3>
            <div className="rounded-2xl border-2 border-dashed border-[#d8c5af] bg-white p-5 font-mono text-xs text-zinc-900 leading-tight space-y-1.5 shadow-sm">
              <div className="text-center font-bold uppercase text-[#4a1c14]">{previewTitle}</div>
              <div className="text-center text-[10px] text-zinc-500">Cashless Service Receipt</div>
              <div className="text-center text-zinc-300">--------------------------------</div>
              <div className="flex justify-between">
                <span>Receipt No:</span>
                <span className="font-bold text-[#8b2500]">#1024</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date().toLocaleDateString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span>SUID:</span>
                <span className="font-bold text-[#8b2500]">250392</span>
              </div>
              <div className="flex justify-between">
                <span>Name:</span>
                <span>ZALODIYA DEEP</span>
              </div>
              <div className="text-center text-zinc-300">--------------------------------</div>
              <div className="flex justify-between font-bold text-sm text-[#4a1c14]">
                <span>Store / Service:</span>
                <span className="text-[#8b2500]">Rs. 50.00</span>
              </div>
              <div className="text-center text-zinc-300">--------------------------------</div>
              <div className="text-center font-bold mt-2 text-[#4a1c14]">{previewFooter}</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
