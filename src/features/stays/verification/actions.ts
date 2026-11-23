/**
 * How many verification documents need the supplier's attention: uploads that
 * were rejected, flagged for replacement or have expired, plus enforced
 * up-front requirements with nothing on file. Same rule as the Verification
 * page's "action needed" count; advisory ("later") documents never count.
 */
export const NEEDS_REUPLOAD = ["REJECTED", "REPLACEMENT_REQUESTED", "EXPIRED"] as const;

type VerificationDocument = { type?: string; status?: string; ownerType?: string };
type VerificationRequirement = { type?: string; timing?: string; enforced?: boolean };

export type VerificationPayload = {
  profile?: { documents?: VerificationDocument[] | null } | null;
  requirements?: { documents?: VerificationRequirement[] | null } | null;
} | null | undefined;

export function verificationActionCount(payload: VerificationPayload): number {
  const documents = payload?.profile?.documents ?? [];
  const requirements = payload?.requirements?.documents ?? [];

  const reupload = documents.filter((doc) => (NEEDS_REUPLOAD as readonly string[]).includes(doc.status ?? "")).length;
  const missing = requirements.filter(
    (requirement) =>
      requirement.timing === "upfront" &&
      requirement.enforced &&
      !documents.some((doc) => doc.ownerType === "SUPPLIER" && doc.type === requirement.type),
  ).length;

  return reupload + missing;
}
