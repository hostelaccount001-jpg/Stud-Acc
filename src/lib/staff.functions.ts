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
  const [{ data: profiles }, { data: roles }, { data: permSettings }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, email, full_name, created_at").order("created_at"),
    supabaseAdmin.from("user_roles").select("user_id, role"),
    supabaseAdmin.from("settings").select("key, value").like("key", "perms_%"),
  ]);

  const permMap: Record<string, UserPermissions> = {};
  (permSettings ?? []).forEach((row) => {
    try {
      const userId = row.key.replace("perms_", "");
      permMap[userId] = JSON.parse(row.value) as UserPermissions;
    } catch {
      // ignore
    }
  });

  return (profiles ?? []).map((p) => {
    const userRoles = (roles ?? []).filter((r) => r.user_id === p.id);
    const isMaster = p.email === "anshsangani2007@gmail.com";
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
      email: p.email ?? "",
      full_name: p.full_name ?? "",
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

    // 1. Create user in Supabase Auth
    const { data: newUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });

    if (authErr) throw new Error(authErr.message);
    const userId = newUser.user.id;

    // 2. Upsert profile
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email: data.email,
      full_name: data.fullName,
    });

    // 3. Set Role in user_roles
    if (data.role === "admin" || data.role === "super_admin") {
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
    await supabaseAdmin.auth.admin.deleteUser(data.userId);

    return { success: true };
  });

export const resetStaffPasswordServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ userId: z.string(), newPassword: z.string().min(6) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });
