import { useEffect, useState } from "react";

import { Users, Loader2, X, Plus, AlertTriangle, RefreshCw } from "@/features/stays/icons";
import { toast } from "sonner";

import { motion, AnimatePresence } from "framer-motion";

import { fetchTeamMembers, inviteTeamMember, removeTeamMember, updateTeamMemberRole, directAddTeamMember, resendInvite, revokeTeamInvite } from "../../settingsApi";

import { cn } from "@/lib/utils";

import { TEAM_ROLE_LABELS, TEAM_ROLE_COLORS, MAX_TEAM_ROLES, sortTeamRoles } from "@/config/teamRoles";
import TeamRolePicker from "@/features/settings/components/TeamRolePicker";

import { STAYS_ROLE_SUMMARIES, FADE_UP } from "./constants";
function ResendButton({ email }: any) {
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      const { emailSent } = await resendInvite(email);
      if (emailSent) toast.success("Invitation resent to " + email);
      else toast.warning("A new link was created for " + email + ", but the email could not be sent.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resend invitation");
    } finally {
      setResending(false);
    }
  };

  return (
    <button onClick={handleResend} disabled={resending}
      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all disabled:opacity-50" title="Resend invitation">
      {resending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
    </button>
  );
}

function memberRoles(member) {
  const roles = sortTeamRoles(member?.roles);
  return roles.length ? roles : sortTeamRoles(member?.role);
}

/**
 * One column template for the team list, shared by the header and every row.
 *
 * This was a flex row whose columns were hand-matched per element — the header
 * said `w-24` where the row said `w-56`, so the labels never lined up with their
 * columns, and on a phone the row overflowed its card. The avatar was a fixed
 * 32px flex item with the default `flex-shrink: 1`, so it absorbed that overflow
 * and got squeezed narrower than it was tall; `rounded-full` then drew a sliver
 * instead of a circle. A grid track is not compressed by its content, so the
 * avatar is now pinned to a fixed 2rem track, and sharing a single template
 * string means the header and the rows cannot drift apart again.
 *
 * Below `sm` the row becomes two lines — email above, roles + status below —
 * because 32 + 176 + 88 + 64px of fixed columns plus gaps does not fit a phone.
 */
const TEAM_LIST_COLS =
  "grid-cols-[2rem_minmax(0,1fr)_auto] sm:grid-cols-[2rem_minmax(0,1fr)_9rem_5.5rem_3.5rem]";
const TEAM_LIST_ROW = "items-center gap-x-3 gap-y-1.5";

function TeamTab() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: "", roles: ["editor"] });
  const [sending, setSending] = useState(false);
  const [directAdd, setDirectAdd] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);

  useEffect(() => {
    fetchTeamMembers()
      .then((rows) => setMembers(rows.map((row) => ({ ...row, roles: memberRoles(row) }))))
      .catch(() => toast.error("Failed to load team members"))
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      if (form.roles.length === 0) {
        toast.error("Select at least one role");
        return;
      }
      // `role` mirrors roles[0] so an older API deploy still understands the request.
      const payload = { email: form.email, roles: form.roles, role: form.roles[0] };
      if (directAdd) {
        const member = await directAddTeamMember(payload);
        setMembers((prev) => [...prev, member]);
        toast.success(form.email + " added as a team member");
      } else {
        const { member, emailSent } = await inviteTeamMember(payload);
        setMembers((prev) => [...prev, member]);
        if (emailSent) {
          toast.success("Invitation sent to " + form.email);
        } else {
          toast.warning("Invitation created for " + form.email + ", but the email could not be sent — use Resend to try again.");
        }
      }
      setForm({ email: "", roles: ["editor"] });
      setShowInvite(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const handleRoleChange = async (memberId, nextRoles) => {
    const roles = sortTeamRoles(nextRoles);
    if (roles.length === 0) {
      toast.error("A team member needs at least one role");
      return;
    }
    try {
      await updateTeamMemberRole(memberId, roles);
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: roles[0], roles } : m));
      setEditingRole(null);
      toast.success("Roles updated successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update role");
    }
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;
    const isPending = memberToRemove.status === "PENDING";
    try {
      if (isPending) {
        // Pending invitations are cancelled (row kept, invitee emailed) so the
        // link dies immediately instead of silently working until it expires.
        await revokeTeamInvite(memberToRemove.id);
        setMembers((prev) => prev.map((m) => m.id === memberToRemove.id ? { ...m, status: "REVOKED" } : m));
        toast.success("Invitation to " + memberToRemove.email + " cancelled");
      } else {
        await removeTeamMember(memberToRemove.id);
        setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
        toast.success("Removed " + memberToRemove.email);
      }
      setMemberToRemove(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || (isPending ? "Failed to cancel invitation" : "Failed to remove member"));
    }
  };

  return (
    <motion.div variants={FADE_UP} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users size={16} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Team Members</h2>
              <p className="text-xs text-slate-500">Invite team members to manage your properties</p>
            </div>
          </div>
          <button onClick={() => setShowInvite((v) => !v)}
            className="flex items-center gap-1.5 shrink-0 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all shadow-sm">
            <Plus size={14} /> Invite Member
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4">
          <AnimatePresence>
            {showInvite && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleInvite}
                className="mb-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 overflow-hidden"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input type="email" value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="colleague@example.com"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Roles <span className="font-normal text-slate-400">(up to 2)</span>
                  </label>
                  <TeamRolePicker
                    value={form.roles}
                    onChange={(roles) => setForm((p) => ({ ...p, roles }))}
                    summaries={STAYS_ROLE_SUMMARIES}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                    <div className="relative shrink-0">
                      <input type="checkbox" checked={directAdd} onChange={(e) => setDirectAdd(e.target.checked)}
                        className="sr-only peer" />
                      <div className="w-8 h-4 bg-slate-200 rounded-full peer-checked:bg-emerald-500 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
                    </div>
                    Add directly (no email)
                  </label>
                  <div className="hidden flex-1 sm:block" />
                  <button type="button" onClick={() => setShowInvite(false)}
                    className="px-3 py-2 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-100 transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={sending}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50">
                    {sending ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                    {directAdd ? "Add Member" : "Send Invitation"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-emerald-500" />
            </div>
          ) : members.length === 0 && !showInvite ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                <Users size={24} className="text-emerald-300" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No team members yet</h3>
              <p className="text-xs text-slate-400 max-w-[240px]">Invite colleagues to help manage your properties, bookings, and customer communications.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className={cn("hidden sm:grid", TEAM_LIST_COLS, TEAM_LIST_ROW, "px-3 py-2.5 text-xs font-semibold text-slate-400 border-b border-slate-100")}>
                <span className="col-start-2">Member</span>
                <span className="col-start-3">Role</span>
                <span className="col-start-4">Status</span>
                <span className="col-start-5" />
              </div>
              {members.map((m) => {
                const roles = memberRoles(m);
                const isPending = m.status === "PENDING";
                const isRevoked = m.status === "REVOKED";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-lg transition-colors",
                      editingRole === m.id ? "bg-slate-50" : "hover:bg-slate-50",
                    )}
                  >
                    <div className={cn("grid", TEAM_LIST_COLS, TEAM_LIST_ROW, "px-3 py-3")}>
                      <div className="col-start-1 row-start-1 row-span-2 sm:row-span-1 w-8 h-8 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center select-none">
                        <span className="text-xs font-bold text-emerald-700">{m.email.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="col-start-2 row-start-1 min-w-0 truncate text-sm text-slate-700" title={m.email}>
                        {m.email}
                      </span>
                      {/* Phones: roles and status share one wrapped line under the
                          email. From sm up this wrapper becomes display:contents, so
                          each child is placed in its own column and lines up with the
                          header above. */}
                      <div className="col-start-2 row-start-2 flex flex-wrap items-center gap-1.5 sm:contents">
                        <div className="min-w-0 sm:col-start-3 sm:row-start-1">
                          <button
                            onClick={() => setEditingRole(m.id)}
                            className="flex flex-wrap items-center gap-1 text-left min-w-0"
                            title="Change roles"
                            aria-label={`Change roles for ${m.email}`}
                          >
                            {roles.length > 0 ? roles.map((role) => (
                              <span
                                key={role}
                                className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-opacity hover:opacity-80", TEAM_ROLE_COLORS[role] || "bg-slate-100 text-slate-600")}
                              >
                                {TEAM_ROLE_LABELS[role] || role}
                              </span>
                            )) : (
                              <span className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                                Set role
                              </span>
                            )}
                          </button>
                        </div>
                        <div className="sm:col-start-4 sm:row-start-1">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                            isPending && "bg-amber-50 text-amber-700",
                            isRevoked && "bg-slate-100 text-slate-500",
                            !isPending && !isRevoked && "bg-emerald-50 text-emerald-700",
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 shrink-0 rounded-full",
                              isPending ? "bg-amber-500" : isRevoked ? "bg-slate-400" : "bg-emerald-500",
                            )} />
                            {isPending ? "Pending" : isRevoked ? "Cancelled" : "Active"}
                          </span>
                        </div>
                      </div>
                      {/* justify-end pins the remove button to the same spot whether
                          or not a pending member also shows the resend button. */}
                      <div className="col-start-3 row-start-1 sm:col-start-5 flex items-center justify-end gap-0.5 shrink-0">
                        {isPending && <ResendButton email={m.email} />}
                        <button
                          onClick={() => setMemberToRemove(m)}
                          aria-label={isPending ? `Cancel invitation to ${m.email}` : `Remove ${m.email}`}
                          className="p-1.5 shrink-0 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    {/* The editor gets its own full-width panel instead of living in
                        the 9rem role column, where it used to force the column wider
                        and shove the row out of the card. */}
                    {editingRole === m.id && (
                      <div className="px-3 pb-3 sm:pl-11">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <TeamRolePicker
                            compact
                            value={roles}
                            onChange={(next) => handleRoleChange(m.id, next)}
                            summaries={STAYS_ROLE_SUMMARIES}
                          />
                          <div className="mt-2.5 flex items-center justify-between gap-3">
                            <p className="text-[10px] text-slate-400">Up to {MAX_TEAM_ROLES} roles per member.</p>
                            <button
                              onClick={() => setEditingRole(null)}
                              className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {memberToRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setMemberToRemove(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {memberToRemove.status === "PENDING" ? "Cancel Invitation" : "Remove Team Member"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {memberToRemove.status === "PENDING" ? "Their invite link stops working immediately" : "This action cannot be undone"}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-6">
                {memberToRemove.status === "PENDING"
                  ? <>Cancel the invitation sent to <span className="font-medium">{memberToRemove.email}</span>?</>
                  : <>Are you sure you want to remove <span className="font-medium">{memberToRemove.email}</span> from your team?</>}
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button onClick={() => setMemberToRemove(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Keep
                </button>
                <button onClick={handleRemove}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
                  {memberToRemove.status === "PENDING" ? "Cancel Invitation" : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default TeamTab;
