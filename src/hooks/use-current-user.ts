import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type UserPermissions,
  defaultStaffPermissions,
  defaultSuperAdminPermissions,
  getCurrentUserPermissionsServer,
} from "@/lib/staff.functions";

export type CurrentUserState = {
  email: string | null;
  userId: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  roleId?: string | undefined;
  roleTitle: string;
  permissions: UserPermissions;
  loading: boolean;
};

const defaultLoggedOutState: CurrentUserState = {
  email: null,
  userId: null,
  isAdmin: false,
  isSuperAdmin: false,
  roleTitle: "Guest",
  permissions: { ...defaultStaffPermissions },
  loading: false,
};

const defaultLoadingState: CurrentUserState = {
  email: null,
  userId: null,
  isAdmin: false,
  isSuperAdmin: false,
  roleTitle: "Staff",
  permissions: { ...defaultStaffPermissions },
  loading: true,
};

const SESSION_CACHE_PREFIX = "gurukul_auth_user_v3_";

// In-memory singleton state so all components in the app share the exact same user state instantly
let cachedState: CurrentUserState = defaultLoadingState;
const subscribers = new Set<(state: CurrentUserState) => void>();
let fetchPromise: Promise<CurrentUserState> | null = null;
let authListenerRegistered = false;

function notifySubscribers(state: CurrentUserState) {
  cachedState = state;
  subscribers.forEach((fn) => fn(state));
}

// Function to immediately wipe user session cache when a user logs out
export function clearUserSessionCache() {
  fetchPromise = null;
  cachedState = { ...defaultLoggedOutState };

  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("gurukul_auth_user_cache_v2");
      sessionStorage.removeItem("gurukul_auth_user_cache_v3");
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith("gurukul_") || key.includes("auth_user"))) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {}
  }

  notifySubscribers(cachedState);
}

// Function to refresh permissions for the currently authenticated Supabase user
export async function refreshUserPermissions(force = false): Promise<CurrentUserState> {
  if (fetchPromise && !force) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (sessionError || !user) {
        clearUserSessionCache();
        return defaultLoggedOutState;
      }

      // Check if we have an immediate match in sessionStorage for this specific user ID
      if (typeof window !== "undefined") {
        try {
          const stored = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${user.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.userId === user.id && typeof parsed.permissions === "object") {
              notifySubscribers({ ...parsed, loading: false });
            }
          }
        } catch {}
      }

      const userEmail = user.email ?? null;
      const isMaster = userEmail === "anshsangani2007@gmail.com";

      if (isMaster) {
        const masterState: CurrentUserState = {
          email: userEmail,
          userId: user.id,
          isAdmin: true,
          isSuperAdmin: true,
          roleTitle: "Super Admin",
          permissions: { ...defaultSuperAdminPermissions },
          loading: false,
        };
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(
              `${SESSION_CACHE_PREFIX}${user.id}`,
              JSON.stringify(masterState),
            );
          } catch {}
        }
        notifySubscribers(masterState);
        return masterState;
      }

      try {
        const res = await getCurrentUserPermissionsServer({
          data: { userId: user.id, email: userEmail ?? undefined },
        });

        const nextRoleTitle =
          res.roleTitle ||
          (res.isSuperAdmin
            ? "Super Admin"
            : res.role === "admin"
              ? "Administrator"
              : "Staff");

        const state: CurrentUserState = {
          email: userEmail,
          userId: user.id,
          isAdmin: res.role === "admin" || res.role === "super_admin",
          isSuperAdmin: res.isSuperAdmin,
          roleId: res.roleId,
          roleTitle: nextRoleTitle,
          permissions: res.permissions,
          loading: false,
        };

        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(
              `${SESSION_CACHE_PREFIX}${user.id}`,
              JSON.stringify(state),
            );
          } catch {}
        }

        notifySubscribers(state);
        return state;
      } catch (err) {
        console.warn("Falling back to direct user_roles check:", err);
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const hasAdmin = (roles ?? []).some((r) => r.role === "admin");

        const fallbackState: CurrentUserState = {
          email: userEmail,
          userId: user.id,
          isAdmin: hasAdmin,
          isSuperAdmin: hasAdmin,
          roleTitle: hasAdmin ? "Administrator" : "Staff",
          permissions: hasAdmin
            ? { ...defaultSuperAdminPermissions }
            : { ...defaultStaffPermissions },
          loading: false,
        };

        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(
              `${SESSION_CACHE_PREFIX}${user.id}`,
              JSON.stringify(fallbackState),
            );
          } catch {}
        }

        notifySubscribers(fallbackState);
        return fallbackState;
      }
    } catch (err) {
      console.error("Error refreshing user permissions:", err);
      clearUserSessionCache();
      return defaultLoggedOutState;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

// Kept for backward compatibility
export function invalidateUserSessionCache() {
  clearUserSessionCache();
  void refreshUserPermissions(true);
}

function registerAuthListener() {
  if (authListenerRegistered || typeof window === "undefined") return;
  authListenerRegistered = true;

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      clearUserSessionCache();
    } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
      if (cachedState.userId !== session.user.id) {
        clearUserSessionCache();
        await refreshUserPermissions(true);
      }
    }
  });
}

export function useCurrentUser() {
  const [state, setState] = useState<CurrentUserState>(() => cachedState);

  useEffect(() => {
    registerAuthListener();
    subscribers.add(setState);

    // If still in default loading state or has no userId, trigger refresh
    if (cachedState.loading || !cachedState.userId) {
      void refreshUserPermissions();
    }

    return () => {
      subscribers.delete(setState);
    };
  }, []);

  return state;
}
