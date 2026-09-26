import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type UserPermissions = {
  // Modules
  dashboard: boolean;
  students: boolean;
  services: boolean;
  settings: boolean;
  reports: boolean;
  users: boolean;

  // Reports Micro-Rights (Requested by User)
  reports_view?: boolean | undefined;
  reports_export?: boolean | undefined;
  reports_edit?: boolean | undefined;
  reports_delete?: boolean | undefined;
  reports_print_slip?: boolean | undefined;

  // Students Micro-Rights
  students_view?: boolean | undefined;
  students_create?: boolean | undefined;
  students_edit?: boolean | undefined;
  students_delete?: boolean | undefined;
  students_export?: boolean | undefined;

  // Services Micro-Rights
  services_view?: boolean | undefined;
  services_create?: boolean | undefined;
  services_edit?: boolean | undefined;
  services_delete?: boolean | undefined;

  // Staff & Roles Micro-Rights
  users_view?: boolean | undefined;
  users_create?: boolean | undefined;
  users_edit?: boolean | undefined;
  users_delete?: boolean | undefined;
  roles_manage?: boolean | undefined;

  // System & Maintenance
  maintenance?: boolean | undefined;

  // Compatibility fields
  delete_students?: boolean | undefined;
  delete_services?: boolean | undefined;
  export_data?: boolean | undefined;

  // Role Metadata
  _roleId?: string | undefined;
  _roleTitle?: string | undefined;
};

export function normalizePermissions(raw?: Partial<UserPermissions>): UserPermissions {
  const p = raw || {};
  const hasReports = p.reports ?? p.reports_view ?? true;
  const hasStudents = p.students ?? p.students_view ?? false;
  const hasServices = p.services ?? p.services_view ?? false;
  const hasUsers = p.users ?? p.users_view ?? false;
  const hasSettings = p.settings ?? false;

  const exportData = p.export_data ?? p.reports_export ?? p.students_export ?? false;
  const deleteStudents = p.delete_students ?? p.students_delete ?? false;
  const deleteServices = p.delete_services ?? p.services_delete ?? false;

  return {
    dashboard: p.dashboard ?? true,
    students: hasStudents,
    services: hasServices,
    settings: hasSettings,
    reports: hasReports,
    users: hasUsers,

    reports_view: p.reports_view ?? hasReports,
    reports_export: p.reports_export ?? exportData,
    reports_edit: p.reports_edit ?? false,
    reports_delete: p.reports_delete ?? false,
    reports_print_slip: p.reports_print_slip ?? false,

    students_view: p.students_view ?? hasStudents,
    students_create: p.students_create ?? (hasStudents && (p.students_create ?? false)),
    students_edit: p.students_edit ?? (hasStudents && (p.students_edit ?? false)),
    students_delete: deleteStudents,
    students_export: p.students_export ?? exportData,

    services_view: p.services_view ?? hasServices,
    services_create: p.services_create ?? (hasServices && (p.services_create ?? false)),
    services_edit: p.services_edit ?? (hasServices && (p.services_edit ?? false)),
    services_delete: deleteServices,

    users_view: p.users_view ?? hasUsers,
    users_create: p.users_create ?? (hasUsers && (p.users_create ?? false)),
    users_edit: p.users_edit ?? (hasUsers && (p.users_edit ?? false)),
    users_delete: p.users_delete ?? (hasUsers && (p.users_delete ?? false)),
    roles_manage: p.roles_manage ?? (hasUsers && (p.roles_manage ?? false)),

    maintenance: p.maintenance ?? hasSettings,

    delete_students: deleteStudents,
    delete_services: deleteServices,
    export_data: exportData,

    _roleId: p._roleId,
    _roleTitle: p._roleTitle,
  };
}

export type CustomRole = {
  id: string;
  name: string;
  description: string;
  color: string; // e.g. "emerald", "amber", "blue", "purple", "rose", "cyan", "indigo"
  isSystem?: boolean | undefined;
  permissions: UserPermissions;
  created_at?: string | undefined;
};

export const defaultSuperAdminPermissions: UserPermissions = {
  dashboard: true,
  students: true,
  services: true,
  settings: true,
  reports: true,
  users: true,

  reports_view: true,
  reports_export: true,
  reports_edit: true,
  reports_delete: true,
  reports_print_slip: true,

  students_view: true,
  students_create: true,
  students_edit: true,
  students_delete: true,
  students_export: true,

  services_view: true,
  services_create: true,
  services_edit: true,
  services_delete: true,

  users_view: true,
  users_create: true,
  users_edit: true,
  users_delete: true,
  roles_manage: true,

  maintenance: true,

  delete_students: true,
  delete_services: true,
  export_data: true,
};

export const defaultAdminPermissions: UserPermissions = {
  dashboard: true,
  students: true,
  services: true,
  settings: true,
  reports: true,
  users: false,

  reports_view: true,
  reports_export: true,
  reports_edit: true,
  reports_delete: false,
  reports_print_slip: true,

  students_view: true,
  students_create: true,
  students_edit: true,
  students_delete: false,
  students_export: true,

  services_view: true,
  services_create: true,
  services_edit: true,
  services_delete: false,

  users_view: false,
  users_create: false,
  users_edit: false,
  users_delete: false,
  roles_manage: false,

  maintenance: false,

  delete_students: false,
  delete_services: false,
  export_data: true,
};

export const defaultReportViewerPermissions: UserPermissions = {
  dashboard: true,
  students: false,
  services: false,
  settings: false,
  reports: true,
  users: false,

  reports_view: true,
  reports_export: true,
  reports_edit: false,
  reports_delete: false,
  reports_print_slip: false,

  students_view: false,
  students_create: false,
  students_edit: false,
  students_delete: false,
  students_export: false,

  services_view: false,
  services_create: false,
  services_edit: false,
  services_delete: false,

  users_view: false,
  users_create: false,
  users_edit: false,
  users_delete: false,
  roles_manage: false,

  maintenance: false,

  delete_students: false,
  delete_services: false,
  export_data: true,
};

export const defaultStaffPermissions: UserPermissions = {
  dashboard: true,
  students: false,
  services: false,
  settings: false,
  reports: true,
  users: false,

  reports_view: true,
  reports_export: false,
  reports_edit: false,
  reports_delete: false,
  reports_print_slip: false,

  students_view: false,
  students_create: false,
  students_edit: false,
  students_delete: false,
  students_export: false,

  services_view: false,
  services_create: false,
  services_edit: false,
  services_delete: false,

  users_view: false,
  users_create: false,
  users_edit: false,
  users_delete: false,
  roles_manage: false,

  maintenance: false,

  delete_students: false,
  delete_services: false,
  export_data: false,
};

export const BUILTIN_ROLES: CustomRole[] = [
  {
    id: "super_admin",
    name: "Super Administrator",
    description: "Complete unrestricted access to all modules, transactions, and security rights.",
    color: "amber",
    isSystem: true,
    permissions: defaultSuperAdminPermissions,
  },
  {
    id: "admin",
    name: "Administrator",
    description: "Full management of students, services, and reports with export and print rights.",
    color: "blue",
    isSystem: true,
    permissions: defaultAdminPermissions,
  },
  {
    id: "report_viewer",
    name: "Report Viewer (Strict View & Export Only)",
    description:
      "Can view and export reports to Excel only. Strictly blocked from printing slips, editing, or deleting transactions.",
    color: "emerald",
    isSystem: true,
    permissions: defaultReportViewerPermissions,
  },
  {
    id: "staff",
    name: "General Staff",
    description: "Standard staff member with read-only dashboard overview and transaction lookups.",
    color: "purple",
    isSystem: true,
    permissions: defaultStaffPermissions,
  },
];

export const listCustomRolesServer = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: setting } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "custom_roles")
    .maybeSingle();

  let storedRoles: CustomRole[] = [];
  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed)) {
        storedRoles = parsed.map((r) => ({
          ...r,
          permissions: normalizePermissions(r.permissions),
        }));
      }
    } catch {}
  }

  const roleMap = new Map<string, CustomRole>();
  BUILTIN_ROLES.forEach((b) => roleMap.set(b.id, { ...b }));
  storedRoles.forEach((r) => {
    if (roleMap.has(r.id)) {
      roleMap.set(r.id, { ...roleMap.get(r.id)!, ...r, isSystem: true });
    } else {
      roleMap.set(r.id, r);
    }
  });

  return Array.from(roleMap.values());
});

export const saveCustomRoleServer = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        role: z.object({
          id: z.string().optional(),
          name: z.string().min(1, "Role name is required"),
          description: z.string().default(""),
          color: z.string().default("emerald"),
          permissions: z.record(z.any()),
        }),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: setting } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "custom_roles")
      .maybeSingle();

    let customRoles: CustomRole[] = [];
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed)) customRoles = parsed;
      } catch {}
    }

    const roleId =
      data.role.id || `custom_role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const normalizedPerms = normalizePermissions(data.role.permissions);
    const isSystemRole = BUILTIN_ROLES.some((b) => b.id === roleId);

    const newRole: CustomRole = {
      id: roleId,
      name: data.role.name.trim(),
      description: data.role.description.trim(),
      color: data.role.color || "emerald",
      isSystem: isSystemRole,
      permissions: normalizedPerms,
      created_at: new Date().toISOString(),
    };

    const existingIdx = customRoles.findIndex((r) => r.id === roleId);
    if (existingIdx >= 0) {
      customRoles[existingIdx] = newRole;
    } else {
      customRoles.push(newRole);
    }

    await supabaseAdmin.from("settings").upsert({
      key: "custom_roles",
      value: JSON.stringify(customRoles),
    });

    return { success: true, role: newRole };
  });

export const deleteCustomRoleServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ roleId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (BUILTIN_ROLES.some((b) => b.id === data.roleId)) {
      throw new Error("System default roles cannot be deleted.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: setting } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "custom_roles")
      .maybeSingle();

    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((r: CustomRole) => r.id !== data.roleId);
          await supabaseAdmin.from("settings").upsert({
            key: "custom_roles",
            value: JSON.stringify(filtered),
          });
        }
      } catch {}
    }

    return { success: true };
  });

export const createStaffSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().trim().min(1, "Full name is required"),
  role: z.string().default("staff"),
  roleId: z.string().optional(),
  roleTitle: z.string().optional(),
  permissions: z.record(z.any()).optional(),
});

export const listStaffUsersServer = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Fetch profiles, roles, and perms
  const [{ data: profiles }, { data: roles }, { data: permSettings }, { data: roleSetting }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name, created_at").order("created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("settings").select("key, value").like("key", "perms_%"),
      supabaseAdmin.from("settings").select("value").eq("key", "custom_roles").maybeSingle(),
    ]);

  let allRoles: CustomRole[] = [...BUILTIN_ROLES];
  if (roleSetting?.value) {
    try {
      const parsed = JSON.parse(roleSetting.value);
      if (Array.isArray(parsed)) {
        allRoles = [...BUILTIN_ROLES, ...parsed];
      }
    } catch {}
  }

  // 2. Fetch auth users (admin API)
  let authUsersList: Array<{
    id: string;
    email?: string;
    user_metadata?: { full_name?: string };
    created_at: string;
  }> = [];
  try {
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    if (authData?.users) {
      authUsersList = authData.users;
    }
  } catch {}

  const permMap: Record<string, any> = {};
  (permSettings ?? []).forEach((row) => {
    try {
      const userId = row.key.replace("perms_", "");
      permMap[userId] = JSON.parse(row.value);
    } catch {}
  });

  // Map to hold consolidated users keyed by lowercase email
  const userMap = new Map<
    string,
    { id: string; email: string; full_name: string; created_at: string }
  >();

  // Insert from auth list first
  authUsersList.forEach((au) => {
    if (au.email) {
      userMap.set(au.email.toLowerCase(), {
        id: au.id,
        email: au.email,
        full_name:
          (au.user_metadata?.full_name as string | undefined) || au.email.split("@")[0] || au.email,
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
        full_name: p.full_name || existing?.full_name || p.email.split("@")[0] || p.email,
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
    let permissions: UserPermissions;
    let assignedRoleId = savedPerms?._roleId;

    if (isMaster) {
      permissions = { ...defaultSuperAdminPermissions };
      assignedRoleId = "super_admin";
    } else if (savedPerms) {
      permissions = normalizePermissions(savedPerms);
    } else if (hasAdmin) {
      permissions = { ...defaultAdminPermissions };
      assignedRoleId = "admin";
    } else {
      permissions = { ...defaultStaffPermissions };
      assignedRoleId = "staff";
    }

    const matchedRole = allRoles.find((r) => r.id === assignedRoleId);
    const roleTitle =
      savedPerms?._roleTitle ||
      matchedRole?.name ||
      (isMaster ? "Super Administrator" : hasAdmin ? "Administrator" : "General Staff");
    const roleColor = matchedRole?.color || (isMaster ? "amber" : hasAdmin ? "blue" : "purple");

    const isSuper = isMaster || (permissions.users && hasAdmin);

    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      created_at: p.created_at,
      role: isSuper ? ("super_admin" as const) : hasAdmin ? ("admin" as const) : ("staff" as const),
      roleId: assignedRoleId || "staff",
      roleTitle,
      roleColor,
      isSuperAdmin: isMaster,
      permissions,
    };
  });
});

export const getCurrentUserPermissionsServer = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ userId: z.string(), email: z.string().optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.email === "anshsangani2007@gmail.com") {
      return {
        role: "super_admin" as const,
        roleId: "super_admin",
        roleTitle: "Super Administrator",
        isSuperAdmin: true,
        permissions: defaultSuperAdminPermissions,
      };
    }

    const [{ data: roles }, { data: permSetting }, { data: roleSetting }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId),
      supabaseAdmin
        .from("settings")
        .select("value")
        .eq("key", `perms_${data.userId}`)
        .maybeSingle(),
      supabaseAdmin.from("settings").select("value").eq("key", "custom_roles").maybeSingle(),
    ]);

    let allRoles: CustomRole[] = [...BUILTIN_ROLES];
    if (roleSetting?.value) {
      try {
        const parsed = JSON.parse(roleSetting.value);
        if (Array.isArray(parsed)) allRoles = [...BUILTIN_ROLES, ...parsed];
      } catch {}
    }

    const hasAdmin = (roles ?? []).some((r) => r.role === "admin");
    let permissions = { ...(hasAdmin ? defaultAdminPermissions : defaultStaffPermissions) };
    let assignedRoleId = hasAdmin ? "admin" : "staff";
    let customTitle = "";

    if (permSetting?.value) {
      try {
        const parsed = JSON.parse(permSetting.value);
        permissions = normalizePermissions(parsed);
        if (parsed._roleId) assignedRoleId = parsed._roleId;
        if (parsed._roleTitle) customTitle = parsed._roleTitle;
      } catch {}
    }

    const isSuper = permissions.users && hasAdmin;
    const matchedRole = allRoles.find((r) => r.id === assignedRoleId);
    const roleTitle =
      customTitle ||
      matchedRole?.name ||
      (isSuper ? "Super Administrator" : hasAdmin ? "Administrator" : "General Staff");

    return {
      role: isSuper ? ("super_admin" as const) : hasAdmin ? ("admin" as const) : ("staff" as const),
      roleId: assignedRoleId,
      roleTitle,
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

    // Strategy 1: Standard Supabase Auth signUp
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
        if (
          msg.includes("already registered") ||
          msg.includes("already exists") ||
          msg.includes("user already exists")
        ) {
          throw new Error(`A user with email "${data.email}" is already registered.`);
        }
        lastError = signErr.message;
      }
    } catch (e: any) {
      if (e?.message?.toLowerCase().includes("already")) throw e;
      lastError = e?.message;
    }

    // Strategy 2: Call secure database RPC
    if (!userId) {
      try {
        const { data: rpcId, error: rpcErr } = await (supabaseAdmin as any).rpc(
          "admin_create_staff_user",
          {
            p_email: data.email.trim(),
            p_password: data.password,
            p_full_name: data.fullName.trim(),
          },
        );
        if (!rpcErr && rpcId) {
          userId = rpcId;
        } else if (
          rpcErr &&
          !rpcErr.message?.includes("function") &&
          !rpcErr.message?.includes("not found")
        ) {
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

    // Strategy 3: Supabase Auth Admin createUser
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

    try {
      await (supabaseAdmin as any).rpc("admin_repair_auth_identities");
    } catch {}

    // 2. Upsert profile
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email: data.email.trim().toLowerCase(),
      full_name: data.fullName.trim(),
    });

    // 3. Set Role in user_roles
    const normalizedPerms = normalizePermissions(data.permissions);
    const hasAdminAccess =
      data.role === "admin" ||
      data.role === "super_admin" ||
      data.roleId === "admin" ||
      data.roleId === "super_admin" ||
      normalizedPerms.students ||
      normalizedPerms.services;

    if (hasAdminAccess) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    }

    // 4. Save Granular Permissions + Role metadata
    const finalPerms = {
      ...normalizedPerms,
      _roleId: data.roleId || data.role,
      _roleTitle: data.roleTitle || "",
    };

    await supabaseAdmin.from("settings").upsert({
      key: `perms_${userId}`,
      value: JSON.stringify(finalPerms),
    });

    return { success: true, userId };
  });

export const updateStaffPermissionsServer = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        userId: z.string(),
        role: z.string(),
        roleId: z.string().optional(),
        roleTitle: z.string().optional(),
        permissions: z.record(z.any()),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Don't modify master super admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
    if (profile?.email === "anshsangani2007@gmail.com") {
      return { success: true };
    }

    const normalizedPerms = normalizePermissions(data.permissions);

    // 1. Update user_roles
    const hasAdminAccess =
      data.role === "admin" ||
      data.role === "super_admin" ||
      data.roleId === "admin" ||
      data.roleId === "super_admin" ||
      normalizedPerms.students ||
      normalizedPerms.services;

    if (hasAdminAccess) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
    }

    // 2. Update permissions JSON in settings with _roleId and _roleTitle
    const permRecord = {
      ...normalizedPerms,
      _roleId: data.roleId || data.role,
      _roleTitle: data.roleTitle || "",
    };

    await supabaseAdmin.from("settings").upsert({
      key: `perms_${data.userId}`,
      value: JSON.stringify(permRecord),
    });

    return { success: true };
  });

export const deleteStaffUserServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ userId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const resetStaffPasswordServer = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        userId: z.string(),
        email: z.string().optional(),
        newPassword: z.string().min(6),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let validUserId: string | null = UUID_REGEX.test(data.userId.trim())
      ? data.userId.trim()
      : null;
    const emailToSearch = (
      data.email ||
      (data.userId.includes("@") ? data.userId : null) ||
      (data.userId === "master-admin-anshsangani" ? "anshsangani2007@gmail.com" : null)
    )
      ?.trim()
      .toLowerCase();

    // 1. If not a valid UUID, attempt to resolve from profiles table by email
    if (!validUserId && emailToSearch) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("email", emailToSearch)
        .maybeSingle();

      if (prof?.id && UUID_REGEX.test(prof.id)) {
        validUserId = prof.id;
      }
    }

    // 2. Strategy 1: RPC reset password by UUID (if valid UUID)
    if (validUserId) {
      try {
        const { error: rpcErr } = await (supabaseAdmin as any).rpc("admin_reset_user_password", {
          p_user_id: validUserId,
          p_new_password: data.newPassword,
        });
        if (!rpcErr) return { success: true };
      } catch {
        // RPC might fail or take text parameter, try next
      }
    }

    // 3. Strategy 2: RPC reset password by text identifier or email
    const identifier = validUserId || emailToSearch || data.userId;
    try {
      const { error: rpcErr } = await (supabaseAdmin as any).rpc("admin_reset_user_password", {
        p_user_id: identifier,
        p_new_password: data.newPassword,
      });
      if (!rpcErr) return { success: true };
    } catch {
      // Continue
    }

    // 4. Strategy 3: Admin API updateUserById (ONLY call if valid UUID to avoid @supabase/auth-js parameter exception)
    if (validUserId) {
      try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(validUserId, {
          password: data.newPassword,
        });
        if (error) throw new Error(error.message);
        return { success: true };
      } catch (e: any) {
        if (e?.message && !e.message.includes("UUID")) {
          throw new Error(e.message);
        }
      }
    }

    // If still unresolved
    if (!validUserId) {
      throw new Error(
        `User ID (${data.userId}) is not a valid UUID. Please run the SQL setup query in Supabase SQL Editor to link profiles.`,
      );
    }

    throw new Error(
      "Failed to reset password. Please run the provided SQL script in Supabase SQL Editor.",
    );
  });
