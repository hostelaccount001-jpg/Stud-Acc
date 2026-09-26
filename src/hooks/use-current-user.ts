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

// In-memory singleton state so all components in the app share the exact same user state instantly
let cachedState: CurrentUserState | null = null;
const subscribers = new Set<(state: CurrentUserState) => void>();
let fetchPromise: Promise<void> | null = null;

function getStoredCache(): CurrentUserState | null {
  if (cachedState) return cachedState;
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem("gurukul_auth_user_cache_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.permissions === "object") {
          cachedState = {
            ...parsed,
            loading: false,
          };
          return cachedState;
        }
      }
    } catch {}
  }
  return null;
}

function getSafeInitialState(): CurrentUserState {
  const fromCache = getStoredCache();
  if (fromCache) return fromCache;

  return {
    email: null,
    userId: null,
    isAdmin: false,
    isSuperAdmin: false,
    roleTitle: "Staff",
    // CRITICAL: Safe default permissions (delete_students: false, delete_services: false, users: false)
    permissions: { ...defaultStaffPermissions },
    loading: true,
  };
}

async function refreshUserPermissions(force = false) {
  if (fetchPromise && !force) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const userEmail = user?.email ?? null;

      if (!user) {
        cachedState = {
          email: null,
          userId: null,
          isAdmin: false,
          isSuperAdmin: false,
          roleTitle: "Guest",
          permissions: { ...defaultStaffPermissions },
          loading: false,
        };
        try {
          sessionStorage.removeItem("gurukul_auth_user_cache_v2");
        } catch {}
        subscribers.forEach((fn) => fn(cachedState!));
        return;
      }

      const isMaster = userEmail === "anshsangani2007@gmail.com";
      if (isMaster) {
        cachedState = {
          email: userEmail,
          userId: user.id,
          isAdmin: true,
          isSuperAdmin: true,
          roleTitle: "Super Admin",
          permissions: { ...defaultSuperAdminPermissions },
          loading: false,
        };
        try {
          sessionStorage.setItem("gurukul_auth_user_cache_v2", JSON.stringify(cachedState));
        } catch {}
        subscribers.forEach((fn) => fn(cachedState!));
        return;
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
        cachedState = {
          email: userEmail,
          userId: user.id,
          isAdmin: res.role === "admin" || res.role === "super_admin",
          isSuperAdmin: res.isSuperAdmin,
          roleId: res.roleId,
          roleTitle: nextRoleTitle,
          permissions: res.permissions,
          loading: false,
        };
      } catch {
        // Fallback to direct user_roles check
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const hasAdmin = (roles ?? []).some((r) => r.role === "admin");

        cachedState = {
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
      }

      try {
        sessionStorage.setItem("gurukul_auth_user_cache_v2", JSON.stringify(cachedState));
      } catch {}
      subscribers.forEach((fn) => fn(cachedState!));
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function useCurrentUser() {
  const [state, setState] = useState<CurrentUserState>(getSafeInitialState);

  useEffect(() => {
    subscribers.add(setState);

    // If no cache, fetch immediately
    if (!cachedState) {
      void refreshUserPermissions();
    }

    return () => {
      subscribers.delete(setState);
    };
  }, []);

  return state;
}

// Function to immediately invalidate auth cache when user logs in or out
export function invalidateUserSessionCache() {
  cachedState = null;
  fetchPromise = null;
  try {
    sessionStorage.removeItem("gurukul_auth_user_cache_v2");
  } catch {}
  void refreshUserPermissions(true);
}
