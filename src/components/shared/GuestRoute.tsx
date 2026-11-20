// @ts-nocheck
// Migration marker: ported from JavaScript; props/data shapes are not annotated yet.
// Remove this directive once the file is typed — `npm run typecheck` then enforces it.
import { Navigate } from "react-router-dom";
import { useAuthStore, canAccessSupplierDashboard } from "@/stores/authStore";
import { getPostLoginPath } from "@/features/auth/hooks/useSupplierLogin";

/**
 * Redirects authenticated APPROVED/ACTIVE suppliers away from public auth pages.
 */
export default function GuestRoute({ children }: any) {
  const { isAuthenticated, user, supplierProfile } = useAuthStore();

  if (isAuthenticated && user && canAccessSupplierDashboard(supplierProfile)) {
    return <Navigate to={getPostLoginPath(supplierProfile)} replace />;
  }

  return children;
}
