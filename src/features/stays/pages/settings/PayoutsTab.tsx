import { useEffect, useState } from "react";

import { CreditCard, Trash2, Plus, Wallet, Landmark, Banknote, Smartphone } from "@/features/stays/icons";
import { toast } from "sonner";

import { motion } from "framer-motion";

import { fetchPayoutMethods, createPayoutMethod, deletePayoutMethod, fetchPayouts, fetchPayoutSettings, fetchFinanceSummary } from "../../settingsApi";

import { cn, formatCurrency } from "@/lib/utils";

import PayoutMethodFormSheet from "../../components/finance/StaysPayoutMethodFormSheet";

import { PayoutScheduleEditor } from "../../components/finance/StaysPayoutScheduleCard";

import { payoutTone, PAYOUT_TONES, FADE_UP, settingsMethodIdentifier } from "./constants";
import { LoadingSkeleton } from "./widgets";
function PayoutsTab() {
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [payoutsSummary, setPayoutsSummary] = useState<any>({});
  const [showMethodForm, setShowMethodForm] = useState(false);
  const [plan, setPlan] = useState(null);
  const [available, setAvailable] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, p, settings, summary] = await Promise.all([
        fetchPayoutMethods(),
        fetchPayouts({ limit: 10 }),
        fetchPayoutSettings().catch(() => null),
        fetchFinanceSummary().catch(() => null),
      ]);
      setMethods(m);
      setPayouts(p?.payouts || []);
      setPayoutsSummary(p?.summary || {});
      setPlan(settings);
      setAvailable(Number(summary?.availableBalance?.amount) || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { Promise.resolve().then(() => loadData()); }, []);

  const handleDeleteMethod = async (id) => {
    try {
      await deletePayoutMethod(id);
      toast.success("Payout method removed");
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove payout method");
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <motion.div variants={FADE_UP} initial="initial" animate="animate" exit="exit" className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-emerald-100/60 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center mb-2.5">
            <Banknote size={16} className="text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-slate-800">
            {formatCurrency(Number(payoutsSummary.totalEarned) || 0, payoutsSummary.currency || "USD")}
          </p>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5">Total Paid Out</p>
        </div>
        <div className="bg-white border border-emerald-100/60 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center mb-2.5">
            <CreditCard size={16} className="text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-slate-800">{methods.length}</p>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5">Payout Methods</p>
        </div>
      </div>

      {/* Automated payout schedule (weekly / twice a month / monthly) */}
      {plan && <PayoutScheduleEditor plan={plan} available={available} onSaved={setPlan} />}

      {/* Payout Methods */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CreditCard size={16} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Payout Methods</h2>
              <p className="text-xs text-slate-500">Manage how you receive payments</p>
            </div>
          </div>
          <button onClick={() => setShowMethodForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm bg-emerald-600 text-white hover:bg-emerald-700">
            <Plus size={14} />
            Add method
          </button>
        </div>

        <div className="px-6 py-4">
          <PayoutMethodFormSheet
            open={showMethodForm}
            onClose={() => setShowMethodForm(false)}
            onSubmit={async (payload) => {
              await createPayoutMethod(payload);
              toast.success("Payout method added — we'll check it before your first payout.");
              setShowMethodForm(false);
              await loadData();
            }}
            title="Add payout method"
            submitLabel="Add payout method"
          />

          {methods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                <CreditCard size={24} className="text-emerald-300" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No payout methods</h3>
              <p className="text-xs text-slate-400 max-w-[220px]">Add a bank account or PayPal to receive payouts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {methods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                      {method.type === "BANK_TRANSFER"
                        ? <Landmark size={18} className="text-slate-600" />
                        : method.type === "MOBILE_MONEY"
                          ? <Smartphone size={18} className="text-slate-600" />
                          : <Wallet size={18} className="text-slate-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">
                        {method.type === "BANK_TRANSFER"
                          ? method.bankName || "Bank Account"
                          : method.type === "MOBILE_MONEY"
                            ? method.mobileProvider || "Mobile Money"
                            : "PayPal"}
                        <span className="font-normal text-slate-400"> · {method.currency || "USD"}</span>
                        {method.isDefault && <span className="ml-2 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-medium">Default</span>}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {method.type === "PAYPAL"
                          ? method.paypalEmail
                          : [method.accountName, settingsMethodIdentifier(method)].filter(Boolean).join(" · ")}
                        <span
                          className={cn(
                            "ml-2 align-middle text-[10px] font-medium",
                            method.verified ? "text-emerald-600" : "text-amber-600"
                          )}
                        >
                          {method.verified ? "Verified" : "Pending"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteMethod(method.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Payouts */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Banknote size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Recent Payouts</h2>
            <p className="text-xs text-slate-500">Your latest payout transactions</p>
          </div>
        </div>
        <div className="px-6 py-4">
          {payouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Banknote size={28} className="text-slate-200 mb-2" />
              <p className="text-sm font-medium text-slate-500">No payouts yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Payouts are processed once bookings are completed.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      PAYOUT_TONES[payoutTone(p.status)].iconBg,
                    )}>
                      <Banknote size={16} className={PAYOUT_TONES[payoutTone(p.status)].icon} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{p.bookingNumber || "Payout"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.tour || ""}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {formatCurrency(Number(p.amount) || 0, p.currency || "USD")}
                      </p>
                      {p.date && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      )}
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg min-w-[68px] justify-center",
                      PAYOUT_TONES[payoutTone(p.status)].chip,
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        PAYOUT_TONES[payoutTone(p.status)].dot,
                      )} />
                      {String(p.status || "").replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default PayoutsTab;
