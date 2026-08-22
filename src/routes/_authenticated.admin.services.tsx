import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Wrench, Plus, Calculator, Coins, Printer, CheckCircle2, ShoppingBag, ShieldCheck } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/admin/services")({
  head: () => ({
    meta: [
      { title: "Services & Pricing — Gurukul Kiosk ERP" },
      { name: "description", content: "Configure kiosk services with fixed prices, custom amount touchscreen keypads, receipt printing and daily caps." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const qc = useQueryClient();
  const { isAdmin } = useCurrentUser();
  const [form, setForm] = useState({
    name: "",
    isCustomAmount: false,
    price: "50",
    print_receipt: true,
    daily_limit: "",
  });

  const services = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      const price = form.isCustomAmount ? 0 : Number(form.price);
      if (!name) throw new Error("Please enter service name");
      if (!form.isCustomAmount && (!Number.isFinite(price) || price <= 0)) {
        throw new Error("Enter a valid fixed price greater than 0, or turn ON Custom Amount switch");
      }

      const { error } = await supabase.from("services").insert({
        name,
        price,
        print_receipt: form.print_receipt,
        daily_limit: form.daily_limit ? Number(form.daily_limit) : null,
        active: true,
        sort_order: (services.data?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service created successfully!");
      setForm({ name: "", isCustomAmount: false, price: "50", print_receipt: true, daily_limit: "" });
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { price?: number; daily_limit?: number | null; print_receipt?: boolean; active?: boolean };
    }) => {
      const { error } = await supabase.from("services").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service settings updated");
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["kiosk-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service deleted");
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["kiosk-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All services removed completely");
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["kiosk-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restoreDefaults = useMutation({
    mutationFn: async () => {
      await supabase.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const defaultServices = [
        { name: "Store", price: 0, print_receipt: true, active: true, sort_order: 1 },
        { name: "Haircut", price: 50, print_receipt: true, active: true, sort_order: 2 },
        { name: "Laundry", price: 20, print_receipt: false, active: true, sort_order: 3 },
      ];
      const { error } = await supabase.from("services").insert(defaultServices);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Default services (Store, Haircut, Laundry) restored!");
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["kiosk-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-98 duration-300">
      {/* Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="size-8 text-[#8b2500]" /> Services & Pricing Controls
          </h1>
          <p className="mt-1 text-sm text-[#7c533f] font-medium">
            Manage Gurukul store, haircut, laundry and other services. Toggle custom keypad entry or fixed price boxes.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => restoreDefaults.mutate()}
              disabled={restoreDefaults.isPending}
              className="btn-luxury-secondary px-4 py-2.5 text-xs gap-1.5"
            >
              Restore Defaults
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to delete ALL services from the database?")) {
                  removeAll.mutate();
                }
              }}
              disabled={removeAll.isPending || (services.data ?? []).length === 0}
              className="btn-luxury-danger px-4 py-2.5 text-xs gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="size-4" /> Delete All ({(services.data ?? []).length})
            </button>
          </div>
        )}
      </header>

      {/* Add Service Card */}
      {isAdmin && (
        <Card className="card-luxury p-6 md:p-8 space-y-6">
          <div className="border-b border-[#e5d8c5] pb-4">
            <h2 className="text-lg font-serif font-bold text-[#4a1c14] flex items-center gap-2">
              <Plus className="size-5 text-[#8b2500]" /> Add New Service
            </h2>
            <p className="text-xs text-[#7c533f]">
              Configure service name, custom keypad input or fixed amount, and print controls.
            </p>
          </div>

          <form
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="sname" className="text-xs font-bold text-[#7c533f]">Service Name *</Label>
              <Input
                id="sname"
                placeholder="e.g. Store, Haircut"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="input-luxury h-10 text-sm font-semibold"
              />
            </div>

            {/* Custom Amount Switch & Price Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="scustom-toggle" className="text-xs font-bold text-[#7c533f] flex items-center gap-1">
                  <Calculator className="size-3.5 text-amber-700" /> Custom Keypad
                </Label>
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="scustom-toggle"
                    checked={form.isCustomAmount}
                    onCheckedChange={(v) => setForm({ ...form, isCustomAmount: v })}
                  />
                </div>
              </div>

              {form.isCustomAmount ? (
                <div className="h-10 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <Calculator className="size-3.5 shrink-0" /> Student Touch Keypad
                </div>
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-[#7c533f]">₹</span>
                  <Input
                    id="sprice"
                    type="number"
                    min={1}
                    step="1"
                    placeholder="50"
                    className="input-luxury pl-7 h-10 font-bold font-mono text-sm"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required={!form.isCustomAmount}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slimit" className="text-xs font-bold text-[#7c533f]">Daily Cap (₹ optional)</Label>
              <Input
                id="slimit"
                type="number"
                min={0}
                placeholder="Unlimited"
                value={form.daily_limit}
                onChange={(e) => setForm({ ...form, daily_limit: e.target.value })}
                className="input-luxury h-10 font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#7c533f]">Print Thermal Receipt</Label>
              <div className="flex items-center justify-between h-10 px-3 rounded-xl border border-[#d8c5af] bg-white">
                <span className="text-xs font-bold text-[#4a1c14]">
                  {form.print_receipt ? "Print Receipt" : "Digital Only"}
                </span>
                <Switch
                  id="sprint"
                  checked={form.print_receipt}
                  onCheckedChange={(v) => setForm({ ...form, print_receipt: v })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={add.isPending}
              className="btn-luxury-primary h-10 w-full text-xs gap-1.5"
            >
              <Plus className="size-4" /> Add Service
            </button>
          </form>
        </Card>
      )}

      {/* Services Table */}
      <Card className="card-luxury p-6 md:p-8 space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5d8c5] text-left text-xs uppercase tracking-wider text-[#7c533f] font-bold">
                <th className="py-3 pr-4">Service</th>
                <th className="py-3 pr-4 text-center">Custom Amount (Keypad)</th>
                <th className="py-3 pr-4">Fixed Price (₹)</th>
                <th className="py-3 pr-4">Daily Cap</th>
                <th className="py-3 pr-4 text-center">Print Receipt</th>
                <th className="py-3 pr-4 text-center">Active in Kiosk</th>
                <th className="py-3 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5d8c5]/60 text-xs">
              {(services.data ?? []).map((s) => {
                const isCustom = Number(s.price) === 0;

                return (
                  <tr key={s.id} className="table-row-luxury hover:bg-[#faf4eb]">
                    <td className="py-4 pr-4 font-bold text-sm text-[#2c1810]">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-[#8b2500]" />
                        {s.name}
                      </span>
                    </td>

                    {/* Custom Amount ON / OFF Switch */}
                    <td className="py-4 pr-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <Switch
                          checked={isCustom}
                          disabled={!isAdmin}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              update.mutate({ id: s.id, patch: { price: 0 } });
                            } else {
                              update.mutate({ id: s.id, patch: { price: 50 } });
                            }
                          }}
                        />
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isCustom
                            ? "bg-amber-500/15 text-amber-900 border border-amber-500/30"
                            : "bg-[#faf6ef] text-[#7c533f] border border-[#d8c5af]"
                        }`}>
                          {isCustom ? "KEYPAD ON" : "FIXED PRICE"}
                        </span>
                      </div>
                    </td>

                    {/* Fixed Price Edit Box */}
                    <td className="py-4 pr-4 font-mono font-bold text-[#8b2500]">
                      {isCustom ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-800 border border-amber-500/30 font-sans text-xs font-semibold">
                          <Calculator className="size-3" /> Student Enters Amount
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 max-w-[130px]">
                          <span className="text-xs font-bold text-[#7c533f]">₹</span>
                          <Input
                            type="number"
                            min={1}
                            step="1"
                            disabled={!isAdmin}
                            defaultValue={s.price}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (val > 0 && val !== s.price) {
                                update.mutate({ id: s.id, patch: { price: val } });
                              }
                            }}
                            className="input-luxury h-8 text-xs font-mono font-bold"
                          />
                        </div>
                      )}
                    </td>

                    {/* Daily Cap */}
                    <td className="py-4 pr-4 font-mono">
                      <div className="max-w-[120px]">
                        <Input
                          type="number"
                          min={0}
                          disabled={!isAdmin}
                          defaultValue={s.daily_limit ?? ""}
                          placeholder="Unlimited"
                          onBlur={(e) => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            if (val !== s.daily_limit) {
                              update.mutate({ id: s.id, patch: { daily_limit: val } });
                            }
                          }}
                          className="input-luxury h-8 text-xs font-mono"
                        />
                      </div>
                    </td>

                    {/* Print Slip Switch */}
                    <td className="py-4 pr-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <Switch
                          checked={s.print_receipt ?? true}
                          disabled={!isAdmin}
                          onCheckedChange={(print_receipt) => update.mutate({ id: s.id, patch: { print_receipt } })}
                        />
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-sm ${
                          s.print_receipt !== false
                            ? "bg-emerald-500/20 text-emerald-900 border-emerald-500/40"
                            : "bg-zinc-200 text-zinc-700 border-zinc-300"
                        }`}>
                          {s.print_receipt !== false ? "PRINT ON" : "NO PRINT"}
                        </span>
                      </div>
                    </td>

                    {/* Active in Kiosk Switch */}
                    <td className="py-4 pr-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <Switch
                          checked={s.active}
                          disabled={!isAdmin}
                          onCheckedChange={(active) => update.mutate({ id: s.id, patch: { active } })}
                        />
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-sm ${
                          s.active
                            ? "bg-emerald-500/20 text-emerald-900 border-emerald-500/40"
                            : "bg-rose-500/20 text-rose-900 border-rose-500/40"
                        }`}>
                          {s.active ? "ACTIVE" : "HIDDEN"}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 pl-4 text-right">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => remove.mutate(s.id)}
                          className="btn-luxury-danger px-3 py-1.5 text-xs gap-1"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
