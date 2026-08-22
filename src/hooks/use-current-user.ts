import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type UserPermissions,
  defaultStaffPermissions,
  defaultSuperAdminPermissions,
  getCurrentUserPermissionsServer,
} from "@/lib/staff.functions";

export function useCurrentUser() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>(defaultSuperAdminPermissions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      const user = data.user;
      const userEmail = user?.email ?? null;
      setEmail(userEmail);
      setUserId(user?.id ?? null);

      if (user) {
        const isMaster = userEmail === "anshsangani2007@gmail.com";
        if (isMaster) {
          if (active) {
            setIsAdmin(true);
            setIsSuperAdmin(true);
            setPermissions(defaultSuperAdminPermissions);
            setLoading(false);
          }
          return;
        }

        try {
          const res = await getCurrentUserPermissionsServer({
            data: { userId: user.id, email: userEmail ?? undefined },
          });
          if (active) {
            setIsAdmin(res.role === "admin" || res.role === "super_admin");
            setIsSuperAdmin(res.isSuperAdmin);
            setPermissions(res.permissions);
          }
        } catch {
          // Fallback to direct role check
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          const hasAdmin = (roles ?? []).some((r) => r.role === "admin");
          if (active) {
            setIsAdmin(hasAdmin);
            setIsSuperAdmin(hasAdmin);
            setPermissions(hasAdmin ? defaultSuperAdminPermissions : defaultStaffPermissions);
          }
        }
      }
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const roleTitle = isSuperAdmin ? "Super Admin" : isAdmin ? "Administrator" : "Staff";

  return { email, userId, isAdmin, isSuperAdmin, roleTitle, permissions, loading };
}
