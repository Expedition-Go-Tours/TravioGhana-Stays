import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  photoURL?: string;
  photoUrl?: string;
  roles?: string[];
  logoUrl?: string | null;
  createdAt?: string;
  [key: string]: unknown;
};

export type SupplierProfile = {
  status?: string;
  businessName?: string;
  businessInfo?: unknown;
  logoUrl?: string | null;
  createdAt?: string;
  supplierSince?: string;
  [key: string]: unknown;
};

export type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  supplierProfile: SupplierProfile | null;

  login: (user: AuthUser | null, token: string | null, supplierProfile?: SupplierProfile | null) => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  setSupplierProfile: (profile: SupplierProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  setToken: (token: string | null) => void;
  setUnauthenticated: () => void;
  logout: () => Promise<void>;
};

const EMPTY_SESSION = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  supplierProfile: null,
} as const;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,
      supplierProfile: null,

      login: (user, token, supplierProfile = null) => {
        if (token) {
          localStorage.setItem("auth_token", token);
        }
        if (user) {
          const normalizedUser = normalizeAvatar(user);
          localStorage.setItem("auth_user", JSON.stringify(normalizedUser));
          set({ user: normalizedUser, token, isAuthenticated: true, isLoading: false, supplierProfile });
          return;
        }
        set({ user, token, isAuthenticated: true, isLoading: false, supplierProfile });
      },

      updateUser: (userData) => {
        set((state) => {
          const merged = state.user ? { ...state.user, ...userData } : (userData as AuthUser);
          const normalized = normalizeAvatar(merged);
          if (state.user) {
            localStorage.setItem("auth_user", JSON.stringify(normalized));
          }
          return { user: normalized };
        });
      },

      setSupplierProfile: (profile) => set({ supplierProfile: profile }),

      setLoading: (loading) => set({ isLoading: loading }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated, isLoading: false }),

      setToken: (newToken) => {
        if (newToken) {
          localStorage.setItem("auth_token", newToken);
          set({ token: newToken });
        }
      },

      setUnauthenticated: () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("refresh_token");
        set({ ...EMPTY_SESSION });
      },

      logout: async () => {
        try {
          const { default: api } = await import("@/lib/axios");
          await api.post("/auth/logout", {}, { skipAuthGuard: true });
        } catch {
          // Best-effort server logout — local session state is cleared regardless
        }

        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("refresh_token");
        set({ ...EMPTY_SESSION });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        supplierProfile: state.supplierProfile,
      }),
      onRehydrateStorage: () => (state) => {
        const token = localStorage.getItem("auth_token");
        const userJson = localStorage.getItem("auth_user");
        let user: AuthUser | null = null;
        try { user = userJson ? JSON.parse(userJson) : null; } catch { localStorage.removeItem("auth_user"); }

        if (token && user) {
          user = normalizeAvatar(user);
          localStorage.setItem("auth_user", JSON.stringify(user));
          useAuthStore.setState({ user, token, isAuthenticated: true, isLoading: false });
        } else {
          useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }

        if (state?.user) {
          const normalized = normalizeAvatar(state.user);
          if (normalized.avatar !== state.user.avatar) {
            localStorage.setItem("auth_user", JSON.stringify(normalized));
          }
        }

        useAuthStore.getState().setHasHydrated(true);
      },
    }
  )
);

export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token") || null;
}

export function getStoredAuthUser(): AuthUser | null {
  const userJson = localStorage.getItem("auth_user");
  if (userJson) {
    try {
      return JSON.parse(userJson);
    } catch {
      localStorage.removeItem("auth_user");
    }
  }
  return null;
}

function normalizeAvatar(user: AuthUser): AuthUser;
function normalizeAvatar(user: null): null;
function normalizeAvatar(user: AuthUser | null): AuthUser | null {
  if (!user) return user;
  if (user.avatar) return user;
  const url = user.photoURL || user.photoUrl;
  if (url) {
    return { ...user, avatar: url as string };
  }
  return user;
}

export function hasValidAuthSession() {
  return Boolean(getAuthToken() && getStoredAuthUser());
}

export function initAuthFromStorage() {
  const token = getAuthToken();
  const raw = getStoredAuthUser();
  const user = normalizeAvatar(raw);

  if (raw && user?.avatar !== raw?.avatar) {
    localStorage.setItem("auth_user", JSON.stringify(user));
  }

  if (token && user) {
    useAuthStore.setState({ user, token, isAuthenticated: true, isLoading: false });
  } else {
    useAuthStore.getState().setUnauthenticated();
  }

  useAuthStore.getState().setHasHydrated(true);
}

export function isAdminUser() {
  const user = useAuthStore.getState().user;
  return user?.roles?.includes("admin") || false;
}

export function isSupplierUser() {
  const user = useAuthStore.getState().user;
  return user?.roles?.includes("supplier") || false;
}

export const SUPPLIER_DASHBOARD_STATUSES = ["ACTIVE", "APPROVED"];

export function canAccessSupplierDashboard(supplierProfile?: SupplierProfile | null) {
  return SUPPLIER_DASHBOARD_STATUSES.includes(supplierProfile?.status as string);
}

export function canCreateTours(supplierProfile?: SupplierProfile | null) {
  return canAccessSupplierDashboard(supplierProfile);
}

export function isVerifiedSupplier() {
  const { supplierProfile } = useAuthStore.getState();
  return canAccessSupplierDashboard(supplierProfile);
}
