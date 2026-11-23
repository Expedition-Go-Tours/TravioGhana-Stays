import { StatusBadge as Status } from "@/components/ui/badge";

type StatusBadgeProps = {
  /** An uppercase supplier-API status (CONFIRMED, PAID, PENDING_APPROVAL, …). */
  status: string;
  label?: string;
  size?: "sm" | "md";
};

/**
 * Badge for the shared supplier API's uppercase statuses. Tones and labels
 * live in `lib/statusTones` (domain "bookingApi").
 */
export default function StatusBadge({ status, label, size = "sm" }: StatusBadgeProps) {
  return <Status domain="bookingApi" status={status} label={label} size={size} />;
}
