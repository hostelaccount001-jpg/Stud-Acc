import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Trash2,
  KeyRound,
  Loader2,
  Crown,
  User,
  Users,
  Wrench,
  SlidersHorizontal,
  FileSpreadsheet,
  CheckCircle2,
  Sliders,
  Search,
  RotateCw,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Plus,
  Check,
  X,
  Copy,
  Palette,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Layers,
  TableProperties,
  Printer,
  FileText,
  FileDown,
  Edit3,
  AlertTriangle,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { GurukulLoader } from "@/components/GurukulLoader";
import {
  listStaffUsersServer,
  createStaffUserServer,
  updateStaffPermissionsServer,
  deleteStaffUserServer,
  resetStaffPasswordServer,
  listCustomRolesServer,
  saveCustomRoleServer,
  deleteCustomRoleServer,
  type UserPermissions,
  type CustomRole,
  defaultStaffPermissions,
  defaultAdminPermissions,
  defaultSuperAdminPermissions,
  defaultReportViewerPermissions,
  BUILTIN_ROLES,
  normalizePermissions,
} from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  head: () => ({
    meta: [
      { title: "Users & Micro-Roles Management — Gurukul Kiosk ERP" },
      {
        name: "description",
        content:
          "Granular user roles, permissions matrix, and access security management console.",
      },
      { property: "og:title", content: "Users & Micro-Roles Management — Gurukul Kiosk ERP" },
    ],
  }),
  component: StaffPage,
});

type StaffMember = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  role: "super_admin" | "admin" | "staff";
  roleId?: string;
  roleTitle?: string;
  roleColor?: string;
  isSuperAdmin: boolean;
  permissions: UserPermissions;
};

const COLOR_OPTIONS = [
  { id: "emerald", name: "Emerald Green", border: "border-emerald-500", bg: "bg-emerald-500/15", text: "text-emerald-800" },
  { id: "amber", name: "Amber Gold", border: "border-amber-500", bg: "bg-amber-500/15", text: "text-amber-800" },
  { id: "blue", name: "Royal Blue", border: "border-blue-500", bg: "bg-blue-500/15", text: "text-blue-800" },
  { id: "purple", name: "Imperial Purple", border: "border-purple-500", bg: "bg-purple-500/15", text: "text-purple-800" },
  { id: "rose", name: "Rose Crimson", border: "border-rose-500", bg: "bg-rose-500/15", text: "text-rose-800" },
  { id: "cyan", name: "Cyan Teal", border: "border-cyan-500", bg: "bg-cyan-500/15", text: "text-cyan-800" },
  { id: "indigo", name: "Deep Indigo", border: "border-indigo-500", bg: "bg-indigo-500/15", text: "text-indigo-800" },
];

function getRoleBadgeStyle(color?: string) {
  switch (color) {
    case "emerald":
    case "green":
      return "bg-emerald-500/15 text-emerald-800 border-emerald-500/30";
    case "blue":
      return "bg-blue-500/15 text-blue-800 border-blue-500/30";
    case "amber":
    case "orange":
      return "bg-amber-500/15 text-amber-900 border-amber-500/40";
    case "purple":
    case "violet":
      return "bg-purple-500/15 text-purple-900 border-purple-500/30";
    case "rose":
    case "red":
      return "bg-rose-500/15 text-rose-900 border-rose-500/30";
    case "cyan":
    case "teal":
      return "bg-cyan-500/15 text-cyan-900 border-cyan-500/30";
    case "indigo":
      return "bg-indigo-500/15 text-indigo-900 border-indigo-500/30";
    default:
      return "bg-[#faf4eb] text-[#7c533f] border-[#e5d8c5]";
  }
}

function StaffPage() {
  const qc = useQueryClient();
  const { isSuperAdmin, email: currentEmail, userId: currentUserId } = useCurrentUser();

  // Navigation tab: "users" | "roles" | "matrix"
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "matrix">("users");

  // Server functions
  const listUsersFn = useServerFn(listStaffUsersServer);
  const createUserFn = useServerFn(createStaffUserServer);
  const updatePermsFn = useServerFn(updateStaffPermissionsServer);
  const deleteUserFn = useServerFn(deleteStaffUserServer);
  const resetPasswordFn = useServerFn(resetStaffPasswordServer);
  const listRolesFn = useServerFn(listCustomRolesServer);
  const saveRoleFn = useServerFn(saveCustomRoleServer);
  const deleteRoleFn = useServerFn(deleteCustomRoleServer);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Create User Dialog States
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createShowPassword, setCreateShowPassword] = useState(false);
  const [showCustomPermsInCreate, setShowCustomPermsInCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    password: "",
    roleId: "report_viewer",
    roleTitle: "Report Viewer (Strict View & Export Only)",
    role: "staff" as "super_admin" | "admin" | "staff",
    permissions: { ...defaultReportViewerPermissions },
  });

  // Edit Permissions Dialog State
  const [editingUser, setEditingUser] = useState<StaffMember | null>(null);
  const [editPerms, setEditPerms] = useState<UserPermissions>({ ...defaultStaffPermissions });
  const [editRoleId, setEditRoleId] = useState<string>("staff");
  const [editRoleTitle, setEditRoleTitle] = useState<string>("");

  // Reset Password Dialog State
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetUserEmail, setResetUserEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Delete User Dialog State
  const [deleteUserId, setDeleteUserId] = useState<{ id: string; email: string } | null>(null);

  // Custom Role Editor Dialog State
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [roleEditing, setRoleEditing] = useState<CustomRole | null>(null);
  const [roleForm, setRoleForm] = useState<{
    id?: string;
    name: string;
    description: string;
    color: string;
    permissions: UserPermissions;
  }>({
    name: "",
    description: "",
    color: "emerald",
    permissions: { ...defaultReportViewerPermissions },
  });

  // Delete Role Dialog State
  const [deleteRoleId, setDeleteRoleId] = useState<CustomRole | null>(null);

  // Fetch Users
  const staff = useQuery({
    queryKey: ["staff-users"],
    queryFn: async () => {
      return (await listUsersFn()) as StaffMember[];
    },
    staleTime: 10000,
  });

  // Fetch Roles
  const rolesQuery = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      return (await listRolesFn()) as CustomRole[];
    },
    staleTime: 10000,
  });

  const allRoles: CustomRole[] = useMemo(() => {
    return rolesQuery.data && rolesQuery.data.length > 0 ? rolesQuery.data : BUILTIN_ROLES;
  }, [rolesQuery.data]);

  // Create User Mutation
  const createUser = useMutation({
    mutationFn: async () => {
      if (!createForm.fullName.trim()) throw new Error("Please enter full name");
      if (!createForm.email.trim()) throw new Error("Please enter a valid email address");
      if (createForm.password.length < 6) throw new Error("Password must be at least 6 characters");

      return await createUserFn({
        data: {
          fullName: createForm.fullName.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
          role: createForm.role,
          roleId: createForm.roleId,
          roleTitle: createForm.roleTitle,
          permissions: createForm.permissions,
        },
      });
    },
    onSuccess: () => {
      toast.success("New user account created successfully");
      setShowCreateDialog(false);
      setCreateForm({
        fullName: "",
        email: "",
        password: "",
        roleId: "report_viewer",
        roleTitle: "Report Viewer (Strict View & Export Only)",
        role: "staff",
        permissions: { ...defaultReportViewerPermissions },
      });
      setShowCustomPermsInCreate(false);
      qc.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create user"),
  });

  // Update Permissions Mutation
  const savePermissions = useMutation({
    mutationFn: async () => {
      if (!editingUser) return;
      const isSuper = editPerms.users || editPerms.roles_manage;
      const isAdmin =
        isSuper ||
        editPerms.students ||
        editPerms.services ||
        editPerms.settings ||
        editPerms.students_create ||
        editPerms.services_create;

      return await updatePermsFn({
        data: {
          userId: editingUser.id,
          role: isSuper ? "super_admin" : isAdmin ? "admin" : "staff",
          roleId: editRoleId,
          roleTitle: editRoleTitle,
          permissions: editPerms,
        },
      });
    },
    onSuccess: () => {
      toast.success("User role & permissions updated successfully");
      setEditingUser(null);
      qc.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update permissions"),
  });

  // Save Custom Role Mutation
  const saveRole = useMutation({
    mutationFn: async () => {
      if (!roleForm.name.trim()) throw new Error("Please enter role title");
      return await saveRoleFn({
        data: {
          role: {
            id: roleForm.id,
            name: roleForm.name.trim(),
            description: roleForm.description.trim(),
            color: roleForm.color,
            permissions: roleForm.permissions,
          },
        },
      });
    },
    onSuccess: () => {
      toast.success(roleEditing ? "Role updated successfully" : "New role created successfully");
      setShowRoleDialog(false);
      setRoleEditing(null);
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save role"),
  });

  // Delete Custom Role Mutation
  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      return await deleteRoleFn({ data: { roleId } });
    },
    onSuccess: () => {
      toast.success("Role deleted successfully");
      setDeleteRoleId(null);
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete role"),
  });

  // Reset Password Mutation
  const resetPassword = useMutation({
    mutationFn: async () => {
      if (!resetUserId || newPassword.length < 6)
        throw new Error("Password must be at least 6 characters");
      return await resetPasswordFn({
        data: {
          userId: resetUserId,
          email: resetUserEmail ?? undefined,
          newPassword,
        },
      });
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
      setResetUserId(null);
      setResetUserEmail(null);
      setNewPassword("");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to reset password"),
  });

  // Delete User Mutation
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      return await deleteUserFn({ data: { userId } });
    },
    onSuccess: () => {
      toast.success("User deleted successfully");
      setDeleteUserId(null);
      qc.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete user"),
  });

  // Quick Permission Toggle
  const toggleQuickPerm = useMutation({
    mutationFn: async ({
      user,
      key,
      value,
    }: {
      user: StaffMember;
      key: keyof UserPermissions;
      value: boolean;
    }) => {
      const nextPerms = normalizePermissions({ ...user.permissions, [key]: value });
      const isSuper = nextPerms.users || nextPerms.roles_manage;
      const isAdmin = isSuper || nextPerms.students || nextPerms.services || nextPerms.settings;

      return await updatePermsFn({
        data: {
          userId: user.id,
          role: isSuper ? "super_admin" : isAdmin ? "admin" : "staff",
          roleId: user.roleId || user.role,
          roleTitle: user.roleTitle,
          permissions: nextPerms,
        },
      });
    },
    onSuccess: () => {
      toast.success("Permission updated");
      qc.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to toggle permission"),
  });

  // Open Edit Permissions Modal
  function openEditModal(u: StaffMember) {
    setEditingUser(u);
    setEditPerms({ ...normalizePermissions(u.permissions) });
    setEditRoleId(u.roleId || u.role || "staff");
    setEditRoleTitle(u.roleTitle || "");
  }

  // Handle Role Selection in Create Form
  function handleSelectCreateRole(role: CustomRole) {
    const isSuper = role.permissions.users || role.id === "super_admin";
    const isAdmin = isSuper || role.permissions.students || role.permissions.services || role.id === "admin";
    setCreateForm((prev) => ({
      ...prev,
      roleId: role.id,
      roleTitle: role.name,
      role: isSuper ? "super_admin" : isAdmin ? "admin" : "staff",
      permissions: { ...normalizePermissions(role.permissions) },
    }));
  }

  // Handle Role Selection in Edit Form
  function handleSelectEditRole(role: CustomRole) {
    setEditRoleId(role.id);
    setEditRoleTitle(role.name);
    setEditPerms({ ...normalizePermissions(role.permissions) });
  }

  // Open Create / Edit Role Dialog
  function openCreateRoleDialog() {
    setRoleEditing(null);
    setRoleForm({
      name: "",
      description: "",
      color: "emerald",
      permissions: { ...defaultReportViewerPermissions },
    });
    setShowRoleDialog(true);
  }

  function openEditRoleDialog(role: CustomRole) {
    setRoleEditing(role);
    setRoleForm({
      id: role.id,
      name: role.name,
      description: role.description,
      color: role.color || "emerald",
      permissions: { ...normalizePermissions(role.permissions) },
    });
    setShowRoleDialog(true);
  }

  function handleDuplicateRole(role: CustomRole) {
    setRoleEditing(null);
    setRoleForm({
      name: `${role.name} (Copy)`,
      description: role.description,
      color: role.color || "cyan",
      permissions: { ...normalizePermissions(role.permissions) },
    });
    setShowRoleDialog(true);
  }

  // Filtered Users List
  const userList = useMemo(() => staff.data ?? [], [staff.data]);

  const filteredUsers = useMemo(() => {
    return userList.filter((u) => {
      const matchSearch =
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRole =
        roleFilter === "all"
          ? true
          : roleFilter === "super_admin"
            ? u.role === "super_admin" || u.isSuperAdmin || u.roleId === "super_admin"
            : roleFilter === "admin"
              ? u.role === "admin" || u.roleId === "admin"
              : roleFilter === "report_viewer"
                ? u.roleId === "report_viewer" || (u.permissions.reports_view && !u.permissions.reports_edit && !u.permissions.reports_delete)
                : roleFilter === "staff"
                  ? u.role === "staff" || u.roleId === "staff"
                  : u.roleId === roleFilter;

      return matchSearch && matchRole;
    });
  }, [userList, searchTerm, roleFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = userList.length;
    const superAdmins = userList.filter((u) => u.role === "super_admin" || u.isSuperAdmin).length;
    const reportViewers = userList.filter(
      (u) =>
        u.roleId === "report_viewer" ||
        (u.permissions.reports_view && !u.permissions.reports_edit && !u.permissions.reports_delete && !u.permissions.students && !u.permissions.services)
    ).length;
    const customRolesCount = allRoles.filter((r) => !r.isSystem).length;
    return { total, superAdmins, reportViewers, customRolesCount };
  }, [userList, allRoles]);

  return (
    <div className="space-y-6 select-none font-sans pb-16">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 border border-amber-500/40 text-[#8b2500] shadow-sm">
              <ShieldCheck className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#4a1c14] tracking-tight">
                  Users & Micro-Roles
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-500/20 text-[#8b2500] border border-amber-500/30">
                  RBAC Console
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#7c533f] font-medium mt-0.5">
                Manage user logins, build custom roles, and fine-tune granular access rights.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["staff-users"] });
              qc.invalidateQueries({ queryKey: ["custom-roles"] });
              toast.success("Refreshed users and roles");
            }}
            title="Refresh Users & Roles"
            className="p-2.5 rounded-xl border border-[#e5d8c5] bg-white hover:bg-[#faf4eb] text-[#7c533f] hover:text-[#4a1c14] transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <RotateCw
              className={`size-4 ${staff.isFetching || rolesQuery.isFetching ? "animate-spin text-amber-600" : ""}`}
            />
          </button>

          {isSuperAdmin && activeTab === "roles" && (
            <button
              type="button"
              onClick={openCreateRoleDialog}
              className="btn-luxury-primary px-5 py-2.5 text-xs font-bold gap-2 shadow-lg shadow-[#8b2500]/20 flex items-center justify-center flex-1 sm:flex-initial cursor-pointer active:scale-95"
            >
              <Plus className="size-4" />
              <span>Create Custom Role</span>
            </button>
          )}

          {isSuperAdmin && activeTab !== "roles" && (
            <button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className="btn-luxury-primary px-5 py-2.5 text-xs font-bold gap-2 shadow-lg shadow-[#8b2500]/20 flex items-center justify-center flex-1 sm:flex-initial cursor-pointer active:scale-95"
            >
              <UserPlus className="size-4" />
              <span>Create New User</span>
            </button>
          )}
        </div>
      </header>

      {/* Super Admin Notice if not authorized */}
      {!isSuperAdmin && (
        <Card className="card-luxury border-amber-500/40 bg-amber-500/10 p-4 text-xs font-bold flex items-center gap-3 text-amber-900">
          <ShieldAlert className="size-5 shrink-0 text-[#8b2500]" />
          <span>
            Only Super Administrators can create new staff accounts, manage micro-roles, and alter security privileges.
          </span>
        </Card>
      )}

      {/* Metrics Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="card-luxury p-4 flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#8b2500]">
            <Users className="size-5.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7c533f]">
              Total Users
            </p>
            <p className="text-xl font-serif font-extrabold text-[#4a1c14]">{stats.total}</p>
          </div>
        </div>

        <div className="card-luxury p-4 flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-700">
            <FileSpreadsheet className="size-5.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7c533f]">
              Report Viewers
            </p>
            <p className="text-xl font-serif font-extrabold text-[#4a1c14]">{stats.reportViewers}</p>
          </div>
        </div>

        <div className="card-luxury p-4 flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-700">
            <Layers className="size-5.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7c533f]">
              Available Roles
            </p>
            <p className="text-xl font-serif font-extrabold text-[#4a1c14]">
              {allRoles.length} <span className="text-xs font-normal text-[#7c533f]">({stats.customRolesCount} custom)</span>
            </p>
          </div>
        </div>

        <div className="card-luxury p-4 flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
            <Crown className="size-5.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7c533f]">
              Super Admins
            </p>
            <p className="text-xl font-serif font-extrabold text-[#4a1c14]">{stats.superAdmins}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-[#e5d8c5] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "users"
              ? "bg-[#8b2500] text-white shadow-md shadow-[#8b2500]/20"
              : "bg-white hover:bg-[#faf4eb] text-[#7c533f] border border-[#e5d8c5]"
          }`}
        >
          <Users className="size-4" />
          <span>Users Management</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === "users" ? "bg-white/20 text-white" : "bg-[#f2e6d6] text-[#4a1c14]"
            }`}
          >
            {userList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "roles"
              ? "bg-[#8b2500] text-white shadow-md shadow-[#8b2500]/20"
              : "bg-white hover:bg-[#faf4eb] text-[#7c533f] border border-[#e5d8c5]"
          }`}
        >
          <Layers className="size-4" />
          <span>Micro-Roles & Profiles</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === "roles" ? "bg-white/20 text-white" : "bg-[#f2e6d6] text-[#4a1c14]"
            }`}
          >
            {allRoles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "matrix"
              ? "bg-[#8b2500] text-white shadow-md shadow-[#8b2500]/20"
              : "bg-white hover:bg-[#faf4eb] text-[#7c533f] border border-[#e5d8c5]"
          }`}
        >
          <TableProperties className="size-4" />
          <span>Permissions Matrix</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USERS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#e5d8c5] shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="size-4 absolute left-3.5 top-3 text-zinc-400 pointer-events-none" />
              <Input
                placeholder="Search by full name or email address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-luxury pl-10 h-10 text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setRoleFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  roleFilter === "all"
                    ? "bg-[#8b2500] text-white shadow-sm"
                    : "bg-[#faf4eb] hover:bg-[#f2e6d6] text-[#7c533f]"
                }`}
              >
                All Users ({stats.total})
              </button>

              <button
                type="button"
                onClick={() => setRoleFilter("report_viewer")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  roleFilter === "report_viewer"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                Report Viewers ({stats.reportViewers})
              </button>

              <button
                type="button"
                onClick={() => setRoleFilter("super_admin")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  roleFilter === "super_admin"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                Super Admins ({stats.superAdmins})
              </button>
            </div>
          </div>

          {/* Main Users Table */}
          <Card className="card-luxury p-0 overflow-hidden shadow-lg border-[#e5d8c5]">
            {staff.isLoading ? (
              <div className="py-16">
                <GurukulLoader
                  size="md"
                  text="Loading Staff & Security Credentials..."
                  subtext="Syncing user privileges with Gurukul Database..."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#faf4eb]/80 border-b border-[#e5d8c5] text-left text-xs uppercase tracking-wider text-[#7c533f] font-bold">
                      <th className="py-3.5 px-4">User Details</th>
                      <th className="py-3.5 px-4">Assigned Role</th>
                      <th className="py-3.5 px-4">Reports Rights (View / Export / Edit / Delete)</th>
                      <th className="py-3.5 px-2 text-center" title="Students Module">
                        <span className="text-[11px] font-bold">Students</span>
                      </th>
                      <th className="py-3.5 px-2 text-center" title="Services Module">
                        <span className="text-[11px] font-bold">Services</span>
                      </th>
                      <th className="py-3.5 px-2 text-center" title="Can Delete Records">
                        <span className="text-[11px] font-bold text-rose-800">Delete</span>
                      </th>
                      <th className="py-3.5 px-2 text-center" title="Can Print Receipts & Reports">
                        <span className="text-[11px] font-bold text-amber-900">Print</span>
                      </th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5d8c5]/60 text-xs">
                    {filteredUsers.map((u) => {
                      const isMaster = u.email.toLowerCase() === "anshsangani2007@gmail.com";
                      const isSelf = u.email === currentEmail;
                      const roleColorClass = getRoleBadgeStyle(u.roleColor);

                      // Detailed reports rights status
                      const canViewRep = u.permissions.reports_view !== false;
                      const canExpRep = Boolean(u.permissions.reports_export || u.permissions.export_data);
                      const canEditRep = Boolean(u.permissions.reports_edit);
                      const canDelRep = Boolean(u.permissions.reports_delete);

                      return (
                        <tr
                          key={u.id}
                          className="table-row-luxury hover:bg-[#faf4eb]/70 transition-colors"
                        >
                          {/* User Info */}
                          <td className="py-3.5 px-4 font-medium">
                            <div className="flex items-center gap-3">
                              <div className="relative size-10 rounded-2xl bg-gradient-to-tr from-[#8b2500] to-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-amber-500/20">
                                {u.full_name ? u.full_name[0]?.toUpperCase() : <User className="size-5" />}
                                {isMaster && (
                                  <div className="absolute -top-1 -right-1 size-4 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center shadow-xs">
                                    <Crown className="size-2.5" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-[#4a1c14] text-sm">
                                    {u.full_name || "Staff Member"}
                                  </p>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-[#8b2500] text-white">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-mono text-[#7c533f]">{u.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-xs ${roleColorClass}`}
                            >
                              {isMaster ? (
                                <Crown className="size-3.5 text-amber-600" />
                              ) : (
                                <ShieldCheck className="size-3.5" />
                              )}
                              <span>{u.roleTitle || (u.role === "super_admin" ? "Super Admin" : u.role === "admin" ? "Admin" : "General Staff")}</span>
                            </span>
                          </td>

                          {/* Reports Rights Breakdown Pill */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* View Right */}
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                  canViewRep
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-zinc-100 text-zinc-400 border-zinc-200 line-through"
                                }`}
                              >
                                {canViewRep ? <Check className="size-3" /> : <X className="size-3" />}
                                View
                              </span>

                              {/* Export Right */}
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                  canExpRep
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : "bg-zinc-100 text-zinc-400 border-zinc-200 line-through"
                                }`}
                              >
                                {canExpRep ? <FileDown className="size-3" /> : <X className="size-3" />}
                                Export
                              </span>

                              {/* Edit Right */}
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                  canEditRep
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-rose-50/50 text-rose-400 border-rose-100"
                                }`}
                              >
                                {canEditRep ? (
                                  <>
                                    <Edit3 className="size-3 text-amber-700" /> Edit Txn
                                  </>
                                ) : (
                                  <>
                                    <X className="size-3" /> No Edit
                                  </>
                                )}
                              </span>

                              {/* Delete Right */}
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                  canDelRep
                                    ? "bg-rose-100 text-rose-800 border-rose-300 font-extrabold"
                                    : "bg-zinc-50 text-zinc-400 border-zinc-200"
                                }`}
                              >
                                {canDelRep ? (
                                  <>
                                    <Trash2 className="size-3 text-rose-700" /> Delete Txn
                                  </>
                                ) : (
                                  <>
                                    <X className="size-3" /> No Delete
                                  </>
                                )}
                              </span>

                              {/* Print Right */}
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                  Boolean(u.permissions.reports_print_slip)
                                    ? "bg-amber-100 text-amber-900 border-amber-300 font-extrabold"
                                    : "bg-zinc-50 text-zinc-400 border-zinc-200"
                                }`}
                              >
                                <Printer className="size-3" />
                                {Boolean(u.permissions.reports_print_slip) ? "Print OK" : "No Print"}
                              </span>
                            </div>
                          </td>

                          {/* Quick Students Toggle */}
                          <td className="py-3.5 px-2 text-center">
                            <Switch
                              checked={isMaster || u.permissions.students}
                              disabled={!isSuperAdmin || isMaster || toggleQuickPerm.isPending}
                              onCheckedChange={(v) =>
                                toggleQuickPerm.mutate({ user: u, key: "students", value: v })
                              }
                            />
                          </td>

                          {/* Quick Services Toggle */}
                          <td className="py-3.5 px-2 text-center">
                            <Switch
                              checked={isMaster || u.permissions.services}
                              disabled={!isSuperAdmin || isMaster || toggleQuickPerm.isPending}
                              onCheckedChange={(v) =>
                                toggleQuickPerm.mutate({ user: u, key: "services", value: v })
                              }
                            />
                          </td>

                          {/* Quick Delete Toggle */}
                          <td className="py-3.5 px-2 text-center">
                            <Switch
                              checked={
                                isMaster ||
                                Boolean(
                                  u.permissions.delete_students ||
                                  u.permissions.delete_services ||
                                  u.permissions.reports_delete
                                )
                              }
                              disabled={!isSuperAdmin || isMaster || toggleQuickPerm.isPending}
                              onCheckedChange={(v) =>
                                toggleQuickPerm.mutate({ user: u, key: "delete_students", value: v })
                              }
                            />
                          </td>

                          {/* Quick Print Toggle */}
                          <td className="py-3.5 px-2 text-center">
                            <Switch
                              checked={isMaster || Boolean(u.permissions.reports_print_slip)}
                              disabled={!isSuperAdmin || isMaster || toggleQuickPerm.isPending}
                              onCheckedChange={(v) =>
                                toggleQuickPerm.mutate({ user: u, key: "reports_print_slip", value: v })
                              }
                            />
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {isSuperAdmin && !isMaster && (
                                <button
                                  type="button"
                                  title="Edit Permissions & Role"
                                  onClick={() => openEditModal(u)}
                                  className="btn-luxury-secondary px-2.5 py-1 text-xs gap-1 cursor-pointer active:scale-95"
                                >
                                  <Sliders className="size-3.5 text-[#8b2500]" />
                                  <span>Role & Rights</span>
                                </button>
                              )}

                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  title="Reset Password"
                                  onClick={() => {
                                    const effectiveId =
                                      u.email &&
                                      currentEmail &&
                                      u.email.toLowerCase() === currentEmail.toLowerCase() &&
                                      currentUserId
                                        ? currentUserId
                                        : u.id;
                                    setResetUserId(effectiveId);
                                    setResetUserEmail(u.email);
                                    setNewPassword("");
                                  }}
                                  className="btn-luxury-secondary px-2.5 py-1 text-xs gap-1 cursor-pointer active:scale-95"
                                >
                                  <KeyRound className="size-3.5 text-amber-700" />
                                  <span className="hidden md:inline">Key</span>
                                </button>
                              )}

                              {isSuperAdmin && !isMaster && !isSelf && (
                                <button
                                  type="button"
                                  title="Delete User"
                                  onClick={() => setDeleteUserId({ id: u.id, email: u.email })}
                                  className="btn-luxury-secondary px-2.5 py-1 text-xs text-rose-700 hover:text-rose-900 border-rose-200 hover:bg-rose-50 cursor-pointer active:scale-95"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#7c533f]">
                          <div className="max-w-xs mx-auto space-y-2">
                            <ShieldAlert className="size-8 text-amber-600 mx-auto opacity-70" />
                            <p className="font-bold text-[#4a1c14] text-sm">
                              No matching user accounts
                            </p>
                            <p className="text-xs text-[#7c533f]">
                              {searchTerm
                                ? "Try searching with a different name or email."
                                : "No accounts created yet."}
                            </p>
                            {searchTerm && (
                              <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                className="text-xs text-[#8b2500] font-bold underline cursor-pointer"
                              >
                                Clear Search
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MICRO-ROLES & SECURITY PROFILES */}
      {/* ========================================================================= */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-500/30">
            <div>
              <h2 className="text-lg font-serif font-bold text-[#4a1c14] flex items-center gap-2">
                <Sparkles className="size-5 text-amber-700" /> Granular Micro-Roles Console
              </h2>
              <p className="text-xs text-[#7c533f] mt-0.5">
                Build reusable role templates with exact permissions (e.g. <strong>Report Viewer</strong> who can only view and export reports but never edit or delete transactions).
              </p>
            </div>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={openCreateRoleDialog}
                className="btn-luxury-primary px-4 py-2 text-xs font-bold gap-2 cursor-pointer active:scale-95"
              >
                <Plus className="size-4" />
                <span>Create New Role</span>
              </button>
            )}
          </div>

          {/* Roles Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allRoles.map((role) => {
              const roleUsers = userList.filter(
                (u) =>
                  u.roleId === role.id ||
                  (role.id === "super_admin" && (u.role === "super_admin" || u.isSuperAdmin)) ||
                  (role.id === "admin" && u.role === "admin" && !u.roleId)
              );
              const badgeStyle = getRoleBadgeStyle(role.color);

              return (
                <div
                  key={role.id}
                  className="card-luxury p-5 flex flex-col justify-between border-2 hover:border-[#8b2500]/40 transition-all shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${badgeStyle}`}>
                          {role.name}
                        </span>
                      </div>
                      {role.isSystem ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
                          Built-in
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-[#8b2500] border border-amber-500/40">
                          Custom
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#7c533f] min-h-[36px] line-clamp-2">
                      {role.description || "No description provided."}
                    </p>

                    {/* Permission Highlights */}
                    <div className="p-3 rounded-xl bg-[#faf6ef] border border-[#e5d8c5] space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-[#4a1c14]">
                        <span className="flex items-center gap-1.5 font-medium">
                          <FileSpreadsheet className="size-3.5 text-[#8b2500]" /> Reports View & Export:
                        </span>
                        <span className="font-bold">
                          {role.permissions.reports_view && role.permissions.reports_export ? (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <Check className="size-3" /> Enabled
                            </span>
                          ) : role.permissions.reports_view ? (
                            <span className="text-amber-700">View Only</span>
                          ) : (
                            <span className="text-zinc-400">Blocked</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[#4a1c14]">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Edit3 className="size-3.5 text-amber-700" /> Reports Edit Txn:
                        </span>
                        <span className="font-bold">
                          {role.permissions.reports_edit ? (
                            <span className="text-amber-700 flex items-center gap-1">
                              <Check className="size-3" /> Allowed
                            </span>
                          ) : (
                            <span className="text-rose-700 flex items-center gap-1">
                              <X className="size-3" /> Restricted
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[#4a1c14]">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Trash2 className="size-3.5 text-rose-600" /> Reports Delete Txn:
                        </span>
                        <span className="font-bold">
                          {role.permissions.reports_delete ? (
                            <span className="text-rose-700 flex items-center gap-1">
                              <Check className="size-3" /> Allowed
                            </span>
                          ) : (
                            <span className="text-rose-700 flex items-center gap-1">
                              <X className="size-3" /> Restricted
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[#4a1c14]">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Users className="size-3.5 text-blue-700" /> Students Management:
                        </span>
                        <span className="font-bold">
                          {role.permissions.students ? (
                            <span className="text-blue-700">Full</span>
                          ) : role.permissions.students_view ? (
                            <span className="text-blue-600">View</span>
                          ) : (
                            <span className="text-zinc-400">No</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="mt-4 pt-3 border-t border-[#e5d8c5] flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#7c533f]">
                      {roleUsers.length} {roleUsers.length === 1 ? "user" : "users"} assigned
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDuplicateRole(role)}
                        title="Duplicate Role"
                        className="p-1.5 rounded-lg border border-[#e5d8c5] hover:bg-[#faf4eb] text-[#7c533f] cursor-pointer"
                      >
                        <Copy className="size-3.5" />
                      </button>

                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => openEditRoleDialog(role)}
                          title="Edit Role Permissions"
                          className="btn-luxury-secondary px-2.5 py-1 text-xs gap-1 cursor-pointer"
                        >
                          <Sliders className="size-3 text-[#8b2500]" />
                          <span>Edit</span>
                        </button>
                      )}

                      {isSuperAdmin && !role.isSystem && (
                        <button
                          type="button"
                          onClick={() => setDeleteRoleId(role)}
                          title="Delete Role"
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PERMISSIONS MATRIX */}
      {/* ========================================================================= */}
      {activeTab === "matrix" && (
        <Card className="card-luxury p-0 overflow-hidden shadow-lg border-[#e5d8c5]">
          <div className="p-4 bg-[#faf4eb] border-b border-[#e5d8c5]">
            <h2 className="font-serif font-bold text-lg text-[#4a1c14] flex items-center gap-2">
              <TableProperties className="size-5 text-[#8b2500]" /> Granular Permissions Matrix
            </h2>
            <p className="text-xs text-[#7c533f]">
              Cross-comparison of all system and custom roles across each micro-permission right.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white border-b border-[#e5d8c5]">
                  <th className="py-3 px-4 text-left font-bold text-[#7c533f] uppercase tracking-wider sticky left-0 bg-white z-10 w-64 shadow-xs">
                    Module & Granular Right
                  </th>
                  {allRoles.map((role) => (
                    <th key={role.id} className="py-3 px-3 text-center font-bold text-[#4a1c14] min-w-[130px]">
                      <span className={`inline-block px-2.5 py-1 rounded-lg border text-[11px] font-bold ${getRoleBadgeStyle(role.color)}`}>
                        {role.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5d8c5]">
                {/* --- REPORTS GROUP --- */}
                <tr className="bg-[#faf6ef]/70 font-bold text-[#8b2500]">
                  <td colSpan={allRoles.length + 1} className="py-2 px-4 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="size-3.5" /> Reports & Financial Ledgers
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[#4a1c14] sticky left-0 bg-white z-10">
                    View Reports & Ledger
                  </td>
                  {allRoles.map((r) => (
                    <td key={r.id} className="py-2.5 px-3 text-center">
                      {r.permissions.reports_view ? (
                        <Check className="size-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-zinc-300 font-bold">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[#4a1c14] sticky left-0 bg-white z-10">
                    Export Excel & Print Full Reports
                  </td>
                  {allRoles.map((r) => (
                    <td key={r.id} className="py-2.5 px-3 text-center">
                      {r.permissions.reports_export || r.permissions.export_data ? (
                        <Check className="size-4 text-blue-600 mx-auto" />
                      ) : (
                        <span className="text-zinc-300 font-bold">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[#4a1c14] sticky left-0 bg-white z-10">
                    Edit Past Transaction Amounts
                  </td>
                  {allRoles.map((r) => (
                    <td key={r.id} className="py-2.5 px-3 text-center">
                      {r.permissions.reports_edit ? (
                        <Check className="size-4 text-amber-600 mx-auto" />
                      ) : (
                        <span className="text-zinc-300 font-bold">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[#4a1c14] sticky left-0 bg-white z-10">
                    Delete Transactions
                  </td>
                  {allRoles.map((r) => (
                    <td key={r.id} className="py-2.5 px-3 text-center">
                      {r.permissions.reports_delete ? (
                        <Check className="size-4 text-rose-600 mx-auto" />
                      ) : (
                        <span className="text-zinc-300 font-bold">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[#4a1c14] sticky left-0 bg-white z-10">
                    Re-print Transaction Thermal Slip
                  </td>
                  {allRoles.map((r) => (
                    <td key={r.id} className="py-2.5 px-3 text-center">
                      {r.permissions.reports_print_slip ? (
                        <Check className="size-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-zinc-300 font-bold">—</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* --- STUDENTS GROUP --- */}
                <tr className="bg-[#faf6ef]/70 font-bold text-[#8b2500]">
                  <td colSpan={allRoles.length + 1} className="py-2 px-4 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <Users className="size-3.5" /> Students Master & Profiles
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[#4a1c14] sticky left-0 bg-white z-10">
                    View Students & Balances
                  </td>
                  {allRoles.map((r) => (
                    <td key={r.id} className="py-2.5 px-3 text-center">
                      {r.permissions.students || r.permissions.students_view ? (
                        <Check className="size-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-zinc-300 font-bold">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[#4a1c14] sticky left-0 bg-white z-10">
                    Add & Enroll New Students
                  </td>
                  {allRoles.map((r) => (
                    <td key={r.id} className="py-2.5 px-3 text-center">
                      {r.permissions.students || r.permissions.students_create ? (
                        <Check className="size-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-zinc-300 font-bold">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[#4a1c14] sticky left-0 bg-white z-10">
                    Edit Student Details & Room
                  </td>
                  {allRoles.map((r) => (
                    <td key={r.id} className="py-2.5 px-3 text-center">
                      {r.permissions.students || r.permissions.students_edit ? (
                        <Check className="size-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-zinc-300 font-bold">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[#4a1c14] sticky left-0 bg-white z-10">
                    Delete Student Records (Single/Bulk)
                  </td>
                  {allRoles.map((r) => (
                    <td key={r.id} className="py-2.5 px-3 text-center">
                      {r.permissions.students_delete || r.permissions.delete_students ? (
                        <Check className="size-4 text-rose-600 mx-auto" />
                      ) : (
                        <span className="text-zinc-300 font-bold">—</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* --- SERVICES GROUP --- */}
                <tr className="bg-[#faf6ef]/70 font-bold text-[#8b2500]">
                  <td colSpan={allRoles.length + 1} className="py-2 px-4 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <Wrench className="size-3.5" /> Services & Pricing
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[#4a1c14] sticky left-0 bg-white z-10">
                    View Services Catalog
                  </td>
                  {allRoles.map((r) => (
                    <td key={r.id} className="py-2.5 px-3 text-center">
                      {r.permissions.services || r.permissions.services_view ? (
                        <Check className="size-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-zinc-300 font-bold">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[#4a1c14] sticky left-0 bg-white z-10">
                    Create & Edit Services
                  </td>
                  {allRoles.map((r) => (
                    <td key={r.id} className="py-2.5 px-3 text-center">
                      {r.permissions.services || r.permissions.services_edit ? (
                        <Check className="size-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-zinc-300 font-bold">—</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* --- SECURITY & ROLES GROUP --- */}
                <tr className="bg-[#faf6ef]/70 font-bold text-[#8b2500]">
                  <td colSpan={allRoles.length + 1} className="py-2 px-4 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5" /> Users, Roles & Security
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[#4a1c14] sticky left-0 bg-white z-10">
                    Create & Manage User Logins
                  </td>
                  {allRoles.map((r) => (
                    <td key={r.id} className="py-2.5 px-3 text-center">
                      {r.permissions.users || r.permissions.users_create ? (
                        <Check className="size-4 text-amber-600 mx-auto" />
                      ) : (
                        <span className="text-zinc-300 font-bold">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[#4a1c14] sticky left-0 bg-white z-10">
                    Create & Manage Micro-Roles
                  </td>
                  {allRoles.map((r) => (
                    <td key={r.id} className="py-2.5 px-3 text-center">
                      {r.permissions.roles_manage || r.permissions.users ? (
                        <Check className="size-4 text-amber-600 mx-auto" />
                      ) : (
                        <span className="text-zinc-300 font-bold">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: CREATE USER (WITH ROLE SELECTOR & AUTO-PERMS) */}
      {/* ========================================================================= */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="modal-luxury sm:max-w-xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-[#4a1c14] flex items-center gap-2">
              <UserPlus className="size-6 text-[#8b2500]" /> Create New User Account
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7c533f]">
              Add a new user, assign a role preset, and customize granular micro-permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-name" className="text-xs font-bold text-[#7c533f]">
                  Full Name
                </Label>
                <Input
                  id="create-name"
                  placeholder="e.g. Ramesh Patel"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  className="input-luxury h-10 font-semibold text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-email" className="text-xs font-bold text-[#7c533f]">
                  Email Address
                </Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="staff@gurukul.org"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="input-luxury h-10 font-semibold text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-pass" className="text-xs font-bold text-[#7c533f]">
                Initial Password
              </Label>
              <div className="relative">
                <Input
                  id="create-pass"
                  type={createShowPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="input-luxury h-10 pr-10 font-semibold text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setCreateShowPassword(!createShowPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-amber-700 cursor-pointer"
                >
                  {createShowPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Role Selection Dropdown / Grid */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#7c533f] flex items-center justify-between">
                <span>Select Security Role Profile:</span>
                <span className="text-[10px] text-[#8b2500] font-normal">
                  (Auto-configures module rights)
                </span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allRoles.map((role) => {
                  const isSelected = createForm.roleId === role.id;
                  const isViewer = role.id === "report_viewer";

                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleSelectCreateRole(role)}
                      className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? "border-[#8b2500] bg-[#f8ede3] text-[#4a1c14] shadow-xs"
                          : "border-[#e5d8c5] bg-white hover:bg-[#faf4eb] text-[#7c533f]"
                      }`}
                    >
                      {isViewer && (
                        <span className="absolute top-1 right-1 px-1 rounded text-[8px] font-extrabold bg-emerald-600 text-white">
                          AUDIT
                        </span>
                      )}
                      <p className="text-xs font-bold truncate">{role.name}</p>
                      <p className="text-[10px] opacity-75 line-clamp-1 mt-0.5">
                        {role.id === "report_viewer"
                          ? "View & Export Only"
                          : role.id === "super_admin"
                            ? "Unrestricted"
                            : role.id === "admin"
                              ? "Students & Services"
                              : "Standard Staff"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggle Detailed Permissions Customizer */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCustomPermsInCreate(!showCustomPermsInCreate)}
                className="text-xs font-bold text-[#8b2500] flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                {showCustomPermsInCreate ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <span>Customize Fine-Grained Micro-Permissions (Optional)</span>
              </button>
            </div>

            {showCustomPermsInCreate && (
              <div className="p-4 rounded-2xl border-2 border-[#e5d8c5] bg-[#faf6ef] space-y-4 text-xs animate-in fade-in-50">
                {/* Reports Micro Rights Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#8b2500] border-b border-[#e5d8c5] pb-1">
                    <FileSpreadsheet className="size-4" />
                    <span>Reports & Transaction Controls</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5d8c5]">
                      <span className="font-semibold text-[#4a1c14]">View Reports</span>
                      <Switch
                        checked={createForm.permissions.reports_view !== false}
                        onCheckedChange={(v) =>
                          setCreateForm({
                            ...createForm,
                            permissions: { ...createForm.permissions, reports_view: v, reports: v },
                          })
                        }
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5d8c5]">
                      <span className="font-semibold text-[#4a1c14]">Export to Excel</span>
                      <Switch
                        checked={Boolean(createForm.permissions.reports_export || createForm.permissions.export_data)}
                        onCheckedChange={(v) =>
                          setCreateForm({
                            ...createForm,
                            permissions: { ...createForm.permissions, reports_export: v, export_data: v },
                          })
                        }
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-300">
                      <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                        <Printer className="size-3.5 text-[#8b2500]" /> Print Slips & Reports
                      </span>
                      <Switch
                        checked={Boolean(createForm.permissions.reports_print_slip)}
                        onCheckedChange={(v) =>
                          setCreateForm({
                            ...createForm,
                            permissions: { ...createForm.permissions, reports_print_slip: v },
                          })
                        }
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-300">
                      <span className="font-semibold text-amber-900">Edit Past Transactions</span>
                      <Switch
                        checked={Boolean(createForm.permissions.reports_edit)}
                        onCheckedChange={(v) =>
                          setCreateForm({
                            ...createForm,
                            permissions: { ...createForm.permissions, reports_edit: v },
                          })
                        }
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-300">
                      <span className="font-semibold text-rose-900">Delete Transactions</span>
                      <Switch
                        checked={Boolean(createForm.permissions.reports_delete)}
                        onCheckedChange={(v) =>
                          setCreateForm({
                            ...createForm,
                            permissions: { ...createForm.permissions, reports_delete: v },
                          })
                        }
                      />
                    </label>
                  </div>
                </div>

                {/* Modules Overview Switches */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#8b2500] border-b border-[#e5d8c5] pb-1">
                    <Sliders className="size-4" />
                    <span>Other Modules Access</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5d8c5]">
                      <span className="font-semibold text-[#4a1c14]">Students Master</span>
                      <Switch
                        checked={Boolean(createForm.permissions.students)}
                        onCheckedChange={(v) =>
                          setCreateForm({
                            ...createForm,
                            permissions: { ...createForm.permissions, students: v, students_view: v },
                          })
                        }
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5d8c5]">
                      <span className="font-semibold text-[#4a1c14]">Services Catalog</span>
                      <Switch
                        checked={Boolean(createForm.permissions.services)}
                        onCheckedChange={(v) =>
                          setCreateForm({
                            ...createForm,
                            permissions: { ...createForm.permissions, services: v, services_view: v },
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-[#e5d8c5]">
            <button
              type="button"
              onClick={() => setShowCreateDialog(false)}
              className="btn-luxury-secondary px-5 py-2.5 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => createUser.mutate()}
              disabled={createUser.isPending}
              className="btn-luxury-primary px-6 py-2.5 text-xs gap-2 cursor-pointer active:scale-95"
            >
              {createUser.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Create User Account
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: EDIT USER ROLE & MICRO-PERMISSIONS */}
      {/* ========================================================================= */}
      <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="modal-luxury sm:max-w-xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-[#4a1c14] flex items-center gap-2">
              <Sliders className="size-6 text-[#8b2500]" /> Edit Role & Micro-Permissions
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7c533f]">
              Assign a role preset or customize specific granular rights for{" "}
              <strong>{editingUser?.full_name}</strong> ({editingUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Role Preset Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#7c533f]">
                Apply Role Preset Template:
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {allRoles.map((role) => {
                  const isSelected = editRoleId === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleSelectEditRole(role)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#8b2500] bg-[#f8ede3] text-[#4a1c14] font-bold shadow-xs"
                          : "border-[#e5d8c5] bg-white hover:bg-[#faf4eb] text-[#7c533f]"
                      }`}
                    >
                      <p className="truncate text-[11px] font-bold">{role.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Granular Micro-Permissions Accordion / Cards */}
            <div className="space-y-3 border-2 border-[#e5d8c5] rounded-2xl p-4 bg-[#faf6ef]">
              {/* Reports Controls */}
              <div className="space-y-2">
                <p className="font-bold text-[#8b2500] flex items-center gap-1.5 border-b border-[#e5d8c5] pb-1">
                  <FileSpreadsheet className="size-4" /> Reports & Financial Ledgers
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5d8c5]">
                    <span className="font-medium text-[#4a1c14]">View Reports</span>
                    <Switch
                      checked={editPerms.reports_view !== false}
                      onCheckedChange={(v) =>
                        setEditPerms({ ...editPerms, reports_view: v, reports: v })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5d8c5]">
                    <span className="font-medium text-[#4a1c14]">Export to Excel</span>
                    <Switch
                      checked={Boolean(editPerms.reports_export || editPerms.export_data)}
                      onCheckedChange={(v) =>
                        setEditPerms({ ...editPerms, reports_export: v, export_data: v })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-300">
                    <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                      <Printer className="size-3.5 text-[#8b2500]" /> Print Slips & Reports
                    </span>
                    <Switch
                      checked={Boolean(editPerms.reports_print_slip)}
                      onCheckedChange={(v) =>
                        setEditPerms({ ...editPerms, reports_print_slip: v })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-300">
                    <span className="font-semibold text-amber-900">Edit Past Transactions</span>
                    <Switch
                      checked={Boolean(editPerms.reports_edit)}
                      onCheckedChange={(v) =>
                        setEditPerms({ ...editPerms, reports_edit: v })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-300">
                    <span className="font-semibold text-rose-900">Delete Transactions</span>
                    <Switch
                      checked={Boolean(editPerms.reports_delete)}
                      onCheckedChange={(v) =>
                        setEditPerms({ ...editPerms, reports_delete: v })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Students Master Controls */}
              <div className="space-y-2">
                <p className="font-bold text-[#8b2500] flex items-center gap-1.5 border-b border-[#e5d8c5] pb-1">
                  <Users className="size-4" /> Students Master Rights
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5d8c5]">
                    <span className="font-medium text-[#4a1c14]">Students Access</span>
                    <Switch
                      checked={editPerms.students}
                      onCheckedChange={(v) =>
                        setEditPerms({ ...editPerms, students: v, students_view: v })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-200">
                    <span className="font-medium text-rose-800">Delete Students</span>
                    <Switch
                      checked={Boolean(editPerms.delete_students || editPerms.students_delete)}
                      onCheckedChange={(v) =>
                        setEditPerms({
                          ...editPerms,
                          delete_students: v,
                          students_delete: v,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Services & Limits Controls */}
              <div className="space-y-2">
                <p className="font-bold text-[#8b2500] flex items-center gap-1.5 border-b border-[#e5d8c5] pb-1">
                  <Wrench className="size-4" /> Services & System Settings
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5d8c5]">
                    <span className="font-medium text-[#4a1c14]">Services & Pricing</span>
                    <Switch
                      checked={editPerms.services}
                      onCheckedChange={(v) =>
                        setEditPerms({ ...editPerms, services: v, services_view: v })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5d8c5]">
                    <span className="font-medium text-[#4a1c14]">Limits & Headers</span>
                    <Switch
                      checked={editPerms.settings}
                      onCheckedChange={(v) => setEditPerms({ ...editPerms, settings: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-300 sm:col-span-2">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Crown className="size-4 text-amber-600" /> Super Admin Authority (Users & Roles)
                    </span>
                    <Switch
                      checked={editPerms.users}
                      onCheckedChange={(v) =>
                        setEditPerms({ ...editPerms, users: v, roles_manage: v })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-[#e5d8c5]">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="btn-luxury-secondary px-5 py-2.5 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => savePermissions.mutate()}
              disabled={savePermissions.isPending}
              className="btn-luxury-primary px-6 py-2.5 text-xs gap-2 cursor-pointer active:scale-95"
            >
              {savePermissions.isPending ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="size-4 mr-1.5" />
              )}
              Save Permissions
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: CREATE OR EDIT CUSTOM ROLE */}
      {/* ========================================================================= */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="modal-luxury sm:max-w-xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-[#4a1c14] flex items-center gap-2">
              <Layers className="size-6 text-[#8b2500]" />
              {roleEditing ? "Edit Micro-Role Profile" : "Create New Micro-Role"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7c533f]">
              Configure role identity, visual color badge, and granular permissions for this profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="role-name" className="text-xs font-bold text-[#7c533f]">
                Role Title
              </Label>
              <Input
                id="role-name"
                placeholder="e.g. Report Auditor, Accountant, Night Warden"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                className="input-luxury h-10 font-bold text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role-desc" className="text-xs font-bold text-[#7c533f]">
                Role Description
              </Label>
              <Input
                id="role-desc"
                placeholder="e.g. Can view & export reports only, strictly cannot edit or delete."
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                className="input-luxury h-10 font-medium text-xs"
              />
            </div>

            {/* Color Badge Palette Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#7c533f] flex items-center gap-1.5">
                <Palette className="size-3.5" /> Badge Theme Color:
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setRoleForm({ ...roleForm, color: c.id })}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      roleForm.color === c.id
                        ? `${c.bg} ${c.text} ${c.border} ring-2 ring-[#8b2500]/30 shadow-xs`
                        : "bg-white hover:bg-[#faf4eb] text-zinc-600 border-[#e5d8c5]"
                    }`}
                  >
                    <span className={`size-2.5 rounded-full ${c.bg.replace('/15', '')}`} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Micro-Permissions Checkboxes */}
            <div className="p-4 rounded-2xl border-2 border-[#e5d8c5] bg-[#faf6ef] space-y-4">
              {/* Reports Rights */}
              <div className="space-y-2">
                <p className="font-bold text-[#8b2500] flex items-center gap-1.5 border-b border-[#e5d8c5] pb-1">
                  <FileSpreadsheet className="size-4" /> Reports & Ledgers Permissions
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5d8c5]">
                    <span className="font-medium text-[#4a1c14]">View Reports</span>
                    <Switch
                      checked={roleForm.permissions.reports_view !== false}
                      onCheckedChange={(v) =>
                        setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, reports_view: v, reports: v },
                        })
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5d8c5]">
                    <span className="font-medium text-[#4a1c14]">Export to Excel</span>
                    <Switch
                      checked={Boolean(
                        roleForm.permissions.reports_export || roleForm.permissions.export_data
                      )}
                      onCheckedChange={(v) =>
                        setRoleForm({
                          ...roleForm,
                          permissions: {
                            ...roleForm.permissions,
                            reports_export: v,
                            export_data: v,
                          },
                        })
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-300">
                    <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                      <Printer className="size-3.5 text-[#8b2500]" /> Print Slips & Reports
                    </span>
                    <Switch
                      checked={Boolean(roleForm.permissions.reports_print_slip)}
                      onCheckedChange={(v) =>
                        setRoleForm({
                          ...roleForm,
                          permissions: {
                            ...roleForm.permissions,
                            reports_print_slip: v,
                          },
                        })
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-300">
                    <span className="font-semibold text-amber-900">Edit Past Transactions</span>
                    <Switch
                      checked={Boolean(roleForm.permissions.reports_edit)}
                      onCheckedChange={(v) =>
                        setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, reports_edit: v },
                        })
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-300">
                    <span className="font-semibold text-rose-900">Delete Transactions</span>
                    <Switch
                      checked={Boolean(roleForm.permissions.reports_delete)}
                      onCheckedChange={(v) =>
                        setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, reports_delete: v },
                        })
                      }
                    />
                  </label>
                </div>
              </div>

              {/* Students Rights */}
              <div className="space-y-2">
                <p className="font-bold text-[#8b2500] flex items-center gap-1.5 border-b border-[#e5d8c5] pb-1">
                  <Users className="size-4" /> Students Module
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5d8c5]">
                    <span className="font-medium text-[#4a1c14]">Students Master</span>
                    <Switch
                      checked={Boolean(roleForm.permissions.students)}
                      onCheckedChange={(v) =>
                        setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, students: v, students_view: v },
                        })
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-200">
                    <span className="font-medium text-rose-800">Delete Students</span>
                    <Switch
                      checked={Boolean(
                        roleForm.permissions.delete_students || roleForm.permissions.students_delete
                      )}
                      onCheckedChange={(v) =>
                        setRoleForm({
                          ...roleForm,
                          permissions: {
                            ...roleForm.permissions,
                            delete_students: v,
                            students_delete: v,
                          },
                        })
                      }
                    />
                  </label>
                </div>
              </div>

              {/* Services & Admin */}
              <div className="space-y-2">
                <p className="font-bold text-[#8b2500] flex items-center gap-1.5 border-b border-[#e5d8c5] pb-1">
                  <Wrench className="size-4" /> Services & Super Admin Authority
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5d8c5]">
                    <span className="font-medium text-[#4a1c14]">Services & Pricing</span>
                    <Switch
                      checked={Boolean(roleForm.permissions.services)}
                      onCheckedChange={(v) =>
                        setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, services: v, services_view: v },
                        })
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-300">
                    <span className="font-bold text-amber-900">Manage Users & Roles</span>
                    <Switch
                      checked={Boolean(roleForm.permissions.users || roleForm.permissions.roles_manage)}
                      onCheckedChange={(v) =>
                        setRoleForm({
                          ...roleForm,
                          permissions: {
                            ...roleForm.permissions,
                            users: v,
                            roles_manage: v,
                          },
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-[#e5d8c5]">
            <button
              type="button"
              onClick={() => setShowRoleDialog(false)}
              className="btn-luxury-secondary px-5 py-2.5 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveRole.mutate()}
              disabled={saveRole.isPending}
              className="btn-luxury-primary px-6 py-2.5 text-xs gap-2 cursor-pointer active:scale-95"
            >
              {saveRole.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              {roleEditing ? "Update Role Profile" : "Save Custom Role"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: RESET PASSWORD */}
      {/* ========================================================================= */}
      <Dialog open={resetUserId !== null} onOpenChange={(open) => !open && setResetUserId(null)}>
        <DialogContent className="modal-luxury sm:max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-[#4a1c14] flex items-center gap-2">
              <KeyRound className="size-6 text-[#8b2500]" /> Reset Password
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7c533f]">
              Set a new login password for <strong>{resetUserEmail}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <Label htmlFor="new-pass" className="text-xs font-bold text-[#7c533f]">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="new-pass"
                type={showResetPassword ? "text" : "password"}
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-luxury h-10 pr-10 font-semibold text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                tabIndex={-1}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-amber-700 cursor-pointer"
              >
                {showResetPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => {
                setResetUserId(null);
                setResetUserEmail(null);
                setNewPassword("");
              }}
              className="btn-luxury-secondary px-4 py-2 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => resetPassword.mutate()}
              disabled={resetPassword.isPending || newPassword.length < 6}
              className="btn-luxury-primary px-5 py-2 text-xs gap-2 cursor-pointer active:scale-95"
            >
              {resetPassword.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Update Password
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: DELETE USER */}
      {/* ========================================================================= */}
      <AlertDialog
        open={deleteUserId !== null}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
      >
        <AlertDialogContent className="modal-luxury sm:max-w-md p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl font-bold text-[#4a1c14] flex items-center gap-2">
              <Trash2 className="size-5 text-rose-700" /> Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#7c533f]">
              Are you sure you want to permanently delete the user account for{" "}
              <strong>{deleteUserId?.email}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="btn-luxury-secondary px-4 py-2 text-xs cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteUser.mutate(deleteUserId.id)}
              disabled={deleteUser.isPending}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-700 hover:bg-rose-800 text-white shadow-md cursor-pointer active:scale-95"
            >
              {deleteUser.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========================================================================= */}
      {/* DIALOG: DELETE CUSTOM ROLE */}
      {/* ========================================================================= */}
      <AlertDialog
        open={deleteRoleId !== null}
        onOpenChange={(open) => !open && setDeleteRoleId(null)}
      >
        <AlertDialogContent className="modal-luxury sm:max-w-md p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl font-bold text-[#4a1c14] flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-700" /> Delete Custom Role
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#7c533f]">
              Are you sure you want to delete the role{" "}
              <strong>&ldquo;{deleteRoleId?.name}&rdquo;</strong>? Users currently assigned to this
              role will retain their current permissions but the role profile will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="btn-luxury-secondary px-4 py-2 text-xs cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRoleId && deleteRole.mutate(deleteRoleId.id)}
              disabled={deleteRole.isPending}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-700 hover:bg-rose-800 text-white shadow-md cursor-pointer active:scale-95"
            >
              {deleteRole.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
