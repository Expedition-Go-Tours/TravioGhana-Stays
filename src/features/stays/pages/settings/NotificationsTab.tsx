import { useEffect, useState } from "react";

import { Bell, Shield, Users, Loader2, Trash2, Plus, Wallet, Save, AlertTriangle, RefreshCw } from "@/features/stays/icons";
import { toast } from "sonner";

import { motion } from "framer-motion";

import { fetchNotificationPreferences, updateNotificationPreferences, fetchNotificationRecipients, addNotificationRecipient, updateNotificationRecipient, resendNotificationRecipient, removeNotificationRecipient } from "../../settingsApi";

import { FADE_UP } from "./constants";
import { Switch } from "@/components/ui/switch";
import { LoadingSkeleton } from "./widgets";
import { SaveBar } from "./SaveBar";
function NotificationsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialPrefs, setInitialPrefs] = useState(null);
  const [prefs, setPrefs] = useState({
    emailNotifications: { bookings: true, reviews: true, payments: true, systemAlerts: true },
    pushNotifications: { bookings: true, reviews: true, payments: true, systemAlerts: true },
  });

  useEffect(() => {
    fetchNotificationPreferences()
      .then((data) => {
        if (data) {
          setPrefs(data);
          setInitialPrefs(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (channel, category) => {
    setPrefs((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], [category]: !prev[channel][category] },
    }));
  };

  const hasChanges = Boolean(initialPrefs) && JSON.stringify(prefs) !== JSON.stringify(initialPrefs);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await updateNotificationPreferences({
        emailNotifications: prefs.emailNotifications,
        pushNotifications: prefs.pushNotifications,
      });
      if (data) setPrefs(data);
      toast.success("Notification preferences updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update preferences");
    } finally { setSaving(false); }
  };

  const categories = [
    { key: "bookings", label: "New Bookings", desc: "When a customer makes a booking" },
    { key: "reviews", label: "Reviews & Ratings", desc: "When you receive a new review" },
    { key: "payments", label: "Payments & Payouts", desc: "Payment received, payout approved or released" },
    { key: "systemAlerts", label: "System Alerts", desc: "Important updates and announcements" },
  ];

  if (loading) return <LoadingSkeleton />;

  return (
    <motion.div variants={FADE_UP} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Bell size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Notification Preferences</h2>
            <p className="text-xs text-slate-500">Choose which notifications you want to receive and how</p>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 pr-4 text-xs font-semibold text-slate-500">Notification Type</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500">Email</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500">Push</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.key} className="border-b border-slate-50 last:border-0">
                    <td className="py-4 pr-4">
                      <p className="text-sm font-medium text-slate-700">{cat.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{cat.desc}</p>
                    </td>
                    <td className="text-center px-4">
                      <Switch
                        checked={prefs.emailNotifications[cat.key]}
                        onCheckedChange={() => toggle("emailNotifications", cat.key)}
                      />
                    </td>
                    <td className="text-center px-4">
                      <Switch
                        checked={prefs.pushNotifications[cat.key]}
                        onCheckedChange={() => toggle("pushNotifications", cat.key)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">Push notifications are delivered via the mobile app and browser</p>
          <button onClick={handleSave} disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Preferences
          </button>
        </div>
      </div>

      <NotificationEmailsCard />

      <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Bell size={16} className="text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Email Notifications</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Review-related emails are sent to your registered email address.
              Payment and booking notifications include important transaction details.
            </p>
          </div>
        </div>
      </div>
      <SaveBar visible={hasChanges} saving={saving} onSave={handleSave} label="Save preferences" />
    </motion.div>
  );
}

const NOTIFICATION_EMAIL_TYPES = [
  { key: "bookings", label: "Bookings & operations", description: "New bookings, changes, cancellations and check-in updates", Icon: Users },
  { key: "reviews", label: "Reviews & ratings", description: "New reviews and replies to your reviews", Icon: Bell },
  { key: "payments", label: "Payments & payouts", description: "Payments received, payouts approved or sent", Icon: Wallet },
  { key: "systemAlerts", label: "Account & system alerts", description: "Property reviews, document expiry and account updates", Icon: Shield },
];

const RECIPIENT_STATUS = {
  VERIFIED: { label: "Confirmed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING: { label: "Pending confirmation", className: "bg-amber-50 text-amber-700 border-amber-200" },
  DISABLED: { label: "Disabled", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

function NotificationEmailsCard() {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [newTypes, setNewTypes] = useState({ bookings: true, reviews: true, payments: true, systemAlerts: true });

  const enabledCount = (recipient) =>
    NOTIFICATION_EMAIL_TYPES.filter((t) => recipient.preferences?.[t.key] !== false).length;

  useEffect(() => {
    fetchNotificationRecipients()
      .then(setRecipients)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      const created = await addNotificationRecipient({ email: email.trim(), name: name.trim(), preferences: newTypes });
      if (created) setRecipients((prev) => [...prev, created]);
      setEmail("");
      setName("");
      setNewTypes({ bookings: true, reviews: true, payments: true, systemAlerts: true });
      toast.success("Confirmation email sent");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add that email");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id) => {
    setBusyId(id);
    try {
      await removeNotificationRecipient(id);
      setRecipients((prev) => prev.filter((r) => r.id !== id));
      toast.success("Email removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not remove that email");
    } finally {
      setBusyId(null);
    }
  };

  const handleResend = async (id) => {
    setBusyId(id);
    try {
      const updated = await resendNotificationRecipient(id);
      if (updated) setRecipients((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success("Confirmation email resent");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not resend");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleCategory = async (recipient, category) => {
    const current = recipient.preferences?.[category] !== false;
    const next = { ...(recipient.preferences || {}), [category]: !current };
    setRecipients((prev) => prev.map((r) => (r.id === recipient.id ? { ...r, preferences: next } : r)));
    setBusyId(recipient.id);
    try {
      const updated = await updateNotificationRecipient(recipient.id, { preferences: { [category]: !current } });
      if (updated) setRecipients((prev) => prev.map((r) => (r.id === recipient.id ? updated : r)));
    } catch (err) {
      setRecipients((prev) => prev.map((r) => (r.id === recipient.id ? recipient : r)));
      toast.error(err.response?.data?.message || "Could not update that email");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <Bell size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Additional notification emails</h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Invite another inbox to receive your notifications, and choose exactly which types of emails each address gets.
              Every address must be confirmed before we send anything to it.
            </p>
          </div>
        </div>
        {recipients.length > 0 && (
          <span className="shrink-0 text-[11px] font-medium text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
            {recipients.length} of 5
          </span>
        )}
      </div>

      <div className="px-6 py-5 space-y-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
            <Loader2 size={14} className="animate-spin" /> Loading email addresses…
          </div>
        ) : recipients.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <Bell size={18} className="text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-slate-700">No additional emails yet</p>
            <p className="text-xs text-slate-400 mt-1">Add a colleague below so they stay in the loop.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recipients.map((r) => {
              const status = RECIPIENT_STATUS[r.status] || RECIPIENT_STATUS.PENDING;
              const busy = busyId === r.id;
              return (
                <div key={r.id} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/70">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-semibold shrink-0">
                        {(r.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800 truncate">{r.email}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {r.name ? `${r.name} · ` : ""}Receives {enabledCount(r)} of {NOTIFICATION_EMAIL_TYPES.length} email types
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {r.status !== "VERIFIED" && (
                        <button
                          onClick={() => handleResend(r.id)}
                          disabled={busy}
                          type="button"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-white disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Resend
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(r.id)}
                        disabled={busy}
                        type="button"
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        aria-label={`Remove ${r.email}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="px-4 py-3">
                    {r.status !== "VERIFIED" && (
                      <p className="flex items-center gap-1.5 text-xs text-amber-600 mb-3">
                        <AlertTriangle size={12} />
                        This address starts receiving emails only after it is confirmed.
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {NOTIFICATION_EMAIL_TYPES.map(({ key, label, description, Icon }) => {
                        const on = r.preferences?.[key] !== false;
                        return (
                          <label
                            key={key}
                            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                              on ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white hover:border-slate-300"
                            } ${busy ? "opacity-60 pointer-events-none" : ""}`}
                          >
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${on ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                              <Icon size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-700">{label}</p>
                              <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{description}</p>
                            </div>
                            <Switch checked={on} onCheckedChange={() => handleToggleCategory(r, key)} />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleAdd} className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-700">Add an email address</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="h-10 sm:w-44 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={adding || !email.trim()}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Send confirmation
            </button>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">Emails this address should receive</p>
            <div className="flex flex-wrap gap-2">
              {NOTIFICATION_EMAIL_TYPES.map(({ key, label }) => {
                const on = newTypes[key] !== false;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNewTypes((prev) => ({ ...prev, [key]: !on }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      on
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NotificationsTab;
