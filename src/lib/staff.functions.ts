import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type UserPermissions = {
  dashboard: boolean;
  students: boolean;
  services: boolean;
  settings: boolean;
  reports: boolean;
  users: boolean;
};

export const defaultStaffPermissions: UserPermissions = {
  dashboard: true,
  students: false,
  services: false,
  settings: false,
  reports: true,
  users: false,
};

export const defaultAdminPermissions: UserPermissions = {
  dashboard: true,
  students: true,
  services: true,
  settings: true,
  reports: true,
  users: false,
};

export const defaultSuperAdminPermissions: UserPermissions = {
  dashboard: true,
  students: true,
  services: true,
  settings: true,
  reports: true,
  users: true,
};

export const createStaffSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().trim().min(1, "Full name is required"),
  role: z.enum(["super_admin", "admin", "staff"]).default("staff"),
  permissions: z
    .object({
      dashboard: z.boolean().default(true),
      students: z.boolean().default(false),
      services: z.boolean().default(false),
      settings: z.boolean().default(false),
      reports: z.boolean().default(true),
      users: z.boolean().default(false),
    })
    .optional(),
});

export const listStaffUsersServer = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  // 1. Fetch profiles, roles, and perms
  const [{ data: profiles }, { data: roles }, { data: permSettings }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, email, full_name, created_at").order("created_at"),
    supabaseAdmin.from("user_roles").select("user_id, role"),
    supabaseAdmin.from("settings").select("key, value").like("key", "perms_%"),
  ]);

  // 2. Fetch auth users (admin API)
  let authUsersList: Array<{ id: string; email?: string; user_metadata?: { full_name?: string }; created_at: string }> = [];
  try {
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    if (authData?.users) {
      authUsersList = authData.users;
    }
  } catch {
    // ignore if admin API is not permitted
  }

  const permMap: Record<string, UserPermissions> = {};
  (permSettings ?? []).forEach((row) => {
    try {
      const userId = row.key.replace("perms_", "");
      permMap[userId] = JSON.parse(row.value) as UserPermissions;
    } catch {
      // ignore
    }
  });

  // Map to hold consolidated users keyed by lowercase email
  const userMap = new Map<string, { id: string; email: string; full_name: string; created_at: string }>();

  // Insert from auth list first
  authUsersList.forEach((au) => {
    if (au.email) {
      userMap.set(au.email.toLowerCase(), {
        id: au.id,
        email: au.email,
        full_name: au.user_metadata?.full_name || au.email.split("@")[0],
        created_at: au.created_at,
      });
    }
  });

  // Merge/override from profiles
  (profiles ?? []).forEach((p) => {
    if (p.email) {
      const key = p.email.toLowerCase();
      const existing = userMap.get(key);
      userMap.set(key, {
        id: p.id,
        email: p.email,
        full_name: p.full_name || existing?.full_name || p.email.split("@")[0],
        created_at: p.created_at || existing?.created_at || new Date().toISOString(),
      });
    }
  });

  // Guarantee that master owner is always included even if database tables were freshly initialized
  const masterEmail = "anshsangani2007@gmail.com";
  if (!userMap.has(masterEmail)) {
    userMap.set(masterEmail, {
      id: "master-admin-anshsangani",
      email: masterEmail,
      full_name: "Ansh Sangani (Super Admin)",
      created_at: new Date().toISOString(),
    });
  }

  return Array.from(userMap.values()).map((p) => {
    const userRoles = (roles ?? []).filter((r) => r.user_id === p.id);
    const isMaster = p.email.toLowerCase() === masterEmail;
    const hasAdmin = userRoles.some((r) => r.role === "admin");

    const savedPerms = permMap[p.id];
    let permissions: UserPermissions = defaultStaffPermissions;

    if (isMaster) {
      permissions = defaultSuperAdminPermissions;
    } else if (savedPerms) {
      permissions = savedPerms;
    } else if (hasAdmin) {
      permissions = defaultAdminPermissions;
    }

    const isSuper = isMaster || (permissions.users && hasAdmin);

    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      created_at: p.created_at,
      role: isSuper ? ("super_admin" as const) : hasAdmin ? ("admin" as const) : ("staff" as const),
      isSuperAdmin: isMaster,
      permissions,
    };
  });
});

export const getCurrentUserPermissionsServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ userId: z.string(), email: z.string().optional() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.email === "anshsangani2007@gmail.com") {
      return {
        role: "super_admin" as const,
        isSuperAdmin: true,
        permissions: defaultSuperAdminPermissions,
      };
    }

    const [{ data: roles }, { data: permSetting }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId),
      supabaseAdmin.from("settings").select("value").eq("key", `perms_${data.userId}`).maybeSingle(),
    ]);

    const hasAdmin = (roles ?? []).some((r) => r.role === "admin");
    let permissions = hasAdmin ? defaultAdminPermissions : defaultStaffPermissions;

    if (permSetting?.value) {
      try {
        permissions = { ...permissions, ...JSON.parse(permSetting.value) };
      } catch {
        // ignore
      }
    }

    const isSuper = permissions.users && hasAdmin;

    return {
      role: isSuper ? ("super_admin" as const) : hasAdmin ? ("admin" as const) : ("staff" as const),
      isSuperAdmin: isSuper,
      permissions,
    };
  });

export const createStaffUserServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => createStaffSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string | null = null;
    let lastError: string | null = null;

    // Strategy 1: Standard Supabase Auth signUp (GoTrue natively handles password hashing, auth.users AND auth.identities)
    try {
      const { data: signUpData, error: signErr } = await supabaseAdmin.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: { full_name: data.fullName.trim() },
        },
      });

      if (!signErr && signUpData?.user?.id) {
        userId = signUpData.user.id;
      } else if (signErr) {
        const msg = signErr.message?.toLowerCase() || "";
        if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already exists")) {
          throw new Error(`A user with email "${data.email}" is already registered.`);
        }
        lastError = signErr.message;
      }
    } catch (e: any) {
      if (e?.message?.toLowerCase().includes("already")) throw e;
      lastError = e?.message;
    }

    // Strategy 2: Call secure database RPC (with complete auth.identities support)
    if (!userId) {
      try {
        const { data: rpcId, error: rpcErr } = await (supabaseAdmin as any).rpc("admin_create_staff_user", {
          p_email: data.email.trim(),
          p_password: data.password,
          p_full_name: data.fullName.trim(),
        });
        if (!rpcErr && rpcId) {
          userId = rpcId;
        } else if (rpcErr && !rpcErr.message?.includes("function") && !rpcErr.message?.includes("not found")) {
          if (rpcErr.message?.toLowerCase().includes("already exists")) {
            throw new Error(`A user with email "${data.email}" already exists.`);
          }
          lastError = rpcErr.message;
        }
      } catch (e: any) {
        if (e?.message?.toLowerCase().includes("already")) throw e;
        lastError = e?.message;
      }
    }

    // Strategy 3: Supabase Auth Admin createUser (if service_role key is valid)
    if (!userId) {
      try {
        const { data: newUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: data.email.trim(),
          password: data.password,
          email_confirm: true,
          user_metadata: { full_name: data.fullName.trim() },
        });

        if (!authErr && newUser?.user?.id) {
          userId = newUser.user.id;
        } else if (authErr) {
          lastError = authErr.message;
        }
      } catch (e: any) {
        lastError = e?.message;
      }
    }

    if (!userId) {
      throw new Error(lastError || "Failed to create user account.");
    }

    // Attempt to invoke repair RPC in background to keep all users in auth.identities consistent
    try {
      await (supabaseAdmin as any).rpc("admin_repair_auth_identities");
    } catch {
      // Ignore if function not yet applied
    }

    // 2. Upsert profile
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email: data.email.trim().toLowerCase(),
      full_name: data.fullName.trim(),
    });

    // 3. Set Role in user_roles
    if (data.role === "admin" || data.role === "super_admin" || data.permissions?.students || data.permissions?.services) {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role" },
      );
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    }

    // 4. Save Granular Permissions
    const permissions: UserPermissions = data.permissions ||
      (data.role === "super_admin"
        ? defaultSuperAdminPermissions
        : data.role === "admin"
          ? defaultAdminPermissions
          : defaultStaffPermissions);

    await supabaseAdmin.from("settings").upsert({
      key: `perms_${userId}`,
      value: JSON.stringify(permissions),
    });

    return { success: true, userId };
  });

export const updateStaffPermissionsServer = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        userId: z.string(),
        role: z.enum(["super_admin", "admin", "staff"]),
        permissions: z.object({
          dashboard: z.boolean(),
          students: z.boolean(),
          services: z.boolean(),
          settings: z.boolean(),
          reports: z.boolean(),
          users: z.boolean(),
        }),
      })
      .parse,
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Don't modify master super admin
    const { data: profile } = await supabaseAdmin.from("profiles").select("email").eq("id", data.userId).maybeSingle();
    if (profile?.email === "anshsangani2007@gmail.com") {
      return { success: true };
    }

    // 1. Update user_roles
    if (data.role === "admin" || data.role === "super_admin" || data.permissions.students || data.permissions.services) {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: data.userId, role: "admin" },
        { onConflict: "user_id,role" },
      );
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    }

    // 2. Update permissions JSON in settings
    await supabaseAdmin.from("settings").upsert({
      key: `perms_${data.userId}`,
      value: JSON.stringify(data.permissions),
    });

    return { success: true };
  });

export const deleteStaffUserServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ userId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin.from("profiles").select("email").eq("id", data.userId).maybeSingle();
    if (profile?.email === "anshsangani2007@gmail.com") {
      throw new Error("Cannot delete Master Super Admin account.");
    }

    await supabaseAdmin.from("settings").delete().eq("key", `perms_${data.userId}`);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);

    // Strategy 1: RPC delete
    try {
      await (supabaseAdmin as any).rpc("admin_delete_staff_user", { p_user_id: data.userId });
      return { success: true };
    } catch {
      // RPC might not exist, proceed to Admin API
    }

    // Strategy 2: Admin API deleteUser (ignore if service_role bearer token is missing since tables are cleaned)
    try {
      await supabaseAdmin.auth.admin.deleteUser(data.userId);
    } catch {
      // User removed from all application tables
    }

    return { success: true };
  });

export const resetStaffPasswordServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ userId: z.string(), newPassword: z.string().min(6) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Strategy 1: RPC reset password
    try {
      const { error: rpcErr } = await (supabaseAdmin as any).rpc("admin_reset_user_password", {
        p_user_id: data.userId,
        p_new_password: data.newPassword,
      });
      if (!rpcErr) return { success: true };
    } catch {
      // RPC might not exist, try Admin API
    }

    // Strategy 2: Admin API
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        password: data.newPassword,
      });
      if (error) throw new Error(error.message);
      return { success: true };
    } catch (e: any) {
      throw new Error(e?.message || "Failed to reset password. Please run the provided SQL script in Supabase.");
    }
  });
