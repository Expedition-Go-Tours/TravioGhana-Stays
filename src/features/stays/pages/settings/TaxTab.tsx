import { useEffect, useState } from "react";

import { FileText, Loader2, Save } from "@/features/stays/icons";
import { toast } from "sonner";

import { motion } from "framer-motion";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

import { fetchTaxInfo, updateTaxInfo } from "../../settingsApi";

import { FADE_UP } from "./constants";
import { LoadingSkeleton } from "./widgets";
function TaxTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialForm, setInitialForm] = useState(null);
  const [form, setForm] = useState({
    taxId: "", taxCountry: "", legalBusinessName: "", businessType: "individual",
  });

  useEffect(() => {
    fetchTaxInfo()
      .then((data) => {
        if (data?.taxInfo) {
          const loaded = {
            taxId: data.taxInfo.taxId || "", taxCountry: data.taxInfo.taxCountry || "",
            legalBusinessName: data.taxInfo.legalBusinessName || "",
            businessType: data.taxInfo.businessType || "individual",
          };
          setForm(loaded);
          setInitialForm(loaded);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTaxInfo(form);
      toast.success("Tax information updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update tax info");
    } finally { setSaving(false); }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <motion.div variants={FADE_UP} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <FileText size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Tax Information</h2>
            <p className="text-xs text-slate-500">Your tax details for payment processing and reporting</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Legal Business Name</label>
            <input type="text" value={form.legalBusinessName}
              onChange={(e) => setForm((p) => ({ ...p, legalBusinessName: e.target.value }))}
              placeholder="Your registered business name"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Type</label>
            <Select value={form.businessType} onValueChange={(v) => setForm((p) => ({ ...p, businessType: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual / Sole Proprietor</SelectItem>
                <SelectItem value="company">Registered Company</SelectItem>
                <SelectItem value="non_profit">Non-Profit Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tax ID / VAT Number</label>
              <input type="text" value={form.taxId}
                onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
                placeholder="e.g. 123-45-6789"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tax Country</label>
              <input type="text" value={form.taxCountry}
                onChange={(e) => setForm((p) => ({ ...p, taxCountry: e.target.value }))}
                placeholder="e.g. US, GH, UK"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
            </div>
          </div>
          <div className="pt-2">
            <button onClick={handleSave} disabled={saving || (initialForm && JSON.stringify(form) === JSON.stringify(initialForm))}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Tax Information
            </button>
          </div>
        </div>
      </div>

      <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FileText size={16} className="text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Why we need this</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Your tax information is required for payment processing and regulatory compliance.
              This information is kept secure and only shared with our payment partners when necessary.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default TaxTab;
