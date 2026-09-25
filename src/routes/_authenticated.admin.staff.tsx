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
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { GurukulLoader } from "@/components/GurukulLoader";
import {
  listStaffUsersServer,
  createStaffUserServer,
  updateStaffPermissionsServer,
  deleteStaffUserServer,
  resetStaffPasswordServer,
  type UserPermissions,
  defaultStaffPermissions,
  defaultAdminPermissions,
  defaultSuperAdminPermissions,
} from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  head: () => ({
    meta: [
      { title: "Users & Roles Management — Gurukul Kiosk ERP" },
      { name: "description", content: "Super Administrator portal to manage users, assign roles and module permissions." },
      { property: "og:title", content: "Users & Roles Management — Gurukul Kiosk ERP" },
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
  isSuperAdmin: boolean;
  permissions: UserPermissions;
};

function StaffPage() {
  const qc = useQueryClient();
  const { isSuperAdmin, email: currentEmail } = useCurrentUser();

  const listUsersFn = useServerFn(listStaffUsersServer);
  const createUserFn = useServerFn(createStaffUserServer);
  const updatePermsFn = useServerFn(updateStaffPermissionsServer);
  const deleteUserFn = useServerFn(deleteStaffUserServer);
  const resetPasswordFn = useServerFn(resetStaffPasswordServer);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "super_admin" | "admin" | "staff">("all");

  // Dialog States
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createShowPassword, setCreateShowPassword] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "staff" as "super_admin" | "admin" | "staff",
    permissions: { ...defaultStaffPermissions },
  });

  // Edit Permissions Dialog
  const [editingUser, setEditingUser] = useState<StaffMember | null>(null);
  const [editPerms, setEditPerms] = useState<UserPermissions>({ ...defaultStaffPermissions });

  // Reset Password Dialog
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Delete Dialog
  const [deleteUserId, setDeleteUserId] = useState<{ id: string; email: string } | null>(null);

  // Fetch all staff users
  const staff = useQuery({
    queryKey: ["staff-users"],
    queryFn: async () => {
      return (await listUsersFn()) as StaffMember[];
    },
    staleTime: 10000,
  });

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
        role: "staff",
        permissions: { ...defaultStaffPermissions },
      });
      qc.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create user"),
  });

  // Update Permissions Mutation
  const savePermissions = useMutation({
    mutationFn: async () => {
      if (!editingUser) return;
      const isSuper = editPerms.users;
      const isAdmin = isSuper || editPerms.students || editPerms.services || editPerms.settings;

      return await updatePermsFn({
        data: {
          userId: editingUser.id,
          role: isSuper ? "super_admin" : isAdmin ? "admin" : "staff",
          permissions: editPerms,
        },
      });
    },
    onSuccess: () => {
      toast.success("Permissions updated successfully");
      setEditingUser(null);
      qc.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update permissions"),
  });

  // Toggle Single Permission in table directly
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
      const nextPerms = { ...user.permissions, [key]: value };
      const isSuper = nextPerms.users;
      const isAdmin = isSuper || nextPerms.students || nextPerms.services || nextPerms.settings;

      return await updatePermsFn({
        data: {
          userId: user.id,
          role: isSuper ? "super_admin" : isAdmin ? "admin" : "staff",
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

  // Toggle Delete Permission (students & services) in table directly
  const toggleDeletePerm = useMutation({
    mutationFn: async ({
      user,
      value,
    }: {
      user: StaffMember;
      value: boolean;
    }) => {
      const nextPerms = { ...user.permissions, delete_students: value, delete_services: value };
      const isSuper = nextPerms.users;
      const isAdmin = isSuper || nextPerms.students || nextPerms.services || nextPerms.settings;

      return await updatePermsFn({
        data: {
          userId: user.id,
          role: isSuper ? "super_admin" : isAdmin ? "admin" : "staff",
          permissions: nextPerms,
        },
      });
    },
    onSuccess: () => {
      toast.success("Delete rights updated");
      qc.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to toggle delete permission"),
  });

  // Reset Password Mutation
  const resetPassword = useMutation({
    mutationFn: async () => {
      if (!resetUserId || newPassword.length < 6) throw new Error("Password must be at least 6 characters");
      return await resetPasswordFn({
        data: { userId: resetUserId, newPassword },
      });
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
      setResetUserId(null);
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

  function openEditModal(u: StaffMember) {
    setEditingUser(u);
    setEditPerms({ ...u.permissions });
  }

  function handleCreateRolePreset(role: "super_admin" | "admin" | "staff") {
    if (role === "super_admin") {
      setCreateForm({ ...createForm, role, permissions: { ...defaultSuperAdminPermissions } });
    } else if (role === "admin") {
      setCreateForm({ ...createForm, role, permissions: { ...defaultAdminPermissions } });
    } else {
      setCreateForm({ ...createForm, role, permissions: { ...defaultStaffPermissions } });
    }
  }

  // Filtered list
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
          ? u.role === "super_admin" || u.isSuperAdmin
          : u.role === roleFilter;

      return matchSearch && matchRole;
    });
  }, [userList, searchTerm, roleFilter]);

  const stats = useMemo(() => {
    const total = userList.length;
    const superAdmins = userList.filter((u) => u.role === "super_admin" || u.isSuperAdmin).length;
    const admins = userList.filter((u) => u.role === "admin").length;
    const staffMembers = userList.filter((u) => u.role === "staff").length;
    return { total, superAdmins, admins, staffMembers };
  }, [userList]);

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-amber-500/20 to-transparent border border-amber-500/30 text-[#8b2500]">
              <ShieldCheck className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#4a1c14] tracking-tight">
                Users & Roles Management
              </h1>
              <p className="text-xs sm:text-sm text-[#7c533f] font-medium mt-0.5">
                Super Administrator control console for administrative access, role definitions & module security.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => qc.invalidateQueries({ queryKey: ["staff-users"] })}
            title="Refresh Users"
            className="p-2.5 rounded-xl border border-[#e5d8c5] bg-white hover:bg-[#faf4eb] text-[#7c533f] hover:text-[#4a1c14] transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <RotateCw className={`size-4 ${staff.isFetching ? "animate-spin text-amber-600" : ""}`} />
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className="btn-luxury-primary px-5 py-2.5 text-xs font-bold gap-2 shadow-lg shadow-[#8b2500]/20 flex items-center justify-center flex-1 sm:flex-initial"
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
          <span>Only Super Administrators have full permission to create accounts and change module rights.</span>
        </Card>
      )}

      {/* Metrics Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="card-luxury p-4 flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#8b2500]">
            <Users className="size-5.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7c533f]">Total Accounts</p>
            <p className="text-xl font-serif font-extrabold text-[#4a1c14]">{stats.total}</p>
          </div>
        </div>

        <div className="card-luxury p-4 flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
            <Crown className="size-5.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7c533f]">Super Admins</p>
            <p className="text-xl font-serif font-extrabold text-[#4a1c14]">{stats.superAdmins}</p>
          </div>
        </div>

        <div className="card-luxury p-4 flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="size-5.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7c533f]">Admins & Staff</p>
            <p className="text-xl font-serif font-extrabold text-[#4a1c14]">{stats.admins + stats.staffMembers}</p>
          </div>
        </div>

        <div className="card-luxury p-4 flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-700">
            <Lock className="size-5.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7c533f]">Security Level</p>
            <p className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> 100% Enforced
            </p>
          </div>
        </div>
      </div>

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
          {(["all", "super_admin", "admin", "staff"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                roleFilter === r
                  ? "bg-[#8b2500] text-white shadow-sm"
                  : "bg-[#faf4eb] hover:bg-[#f2e6d6] text-[#7c533f]"
              }`}
            >
              {r === "all"
                ? `All (${stats.total})`
                : r === "super_admin"
                ? `Super Admin (${stats.superAdmins})`
                : r === "admin"
                ? `Admin (${stats.admins})`
                : `Staff (${stats.staffMembers})`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Users Card & Table */}
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
                  <th className="py-3.5 px-4">Security Role</th>
                  <th className="py-3.5 px-2 text-center" title="Students Module">
                    <div className="flex flex-col items-center gap-0.5">
                      <Users className="size-4 text-[#8b2500]" />
                      <span className="text-[10px] font-bold">Students</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-2 text-center" title="Services & Prices">
                    <div className="flex flex-col items-center gap-0.5">
                      <Wrench className="size-4 text-[#8b2500]" />
                      <span className="text-[10px] font-bold">Services</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-2 text-center" title="Limits & Headers">
                    <div className="flex flex-col items-center gap-0.5">
                      <SlidersHorizontal className="size-4 text-[#8b2500]" />
                      <span className="text-[10px] font-bold">Limits</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-2 text-center" title="Reports & Export">
                    <div className="flex flex-col items-center gap-0.5">
                      <FileSpreadsheet className="size-4 text-[#8b2500]" />
                      <span className="text-[10px] font-bold">Reports</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-2 text-center" title="Can Delete Records">
                    <div className="flex flex-col items-center gap-0.5">
                      <Trash2 className="size-4 text-rose-600" />
                      <span className="text-[10px] font-bold text-rose-800">Delete</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-2 text-center" title="Super Admin Authority">
                    <div className="flex flex-col items-center gap-0.5">
                      <Crown className="size-4 text-amber-600" />
                      <span className="text-[10px] font-bold text-amber-800">Super Admin</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5d8c5]/60 text-xs">
                {filteredUsers.map((u) => {
                  const isMaster = u.email === "anshsangani2007@gmail.com";
                  const isSelf = u.email === currentEmail;

                  return (
                    <tr key={u.id} className="table-row-luxury hover:bg-[#faf4eb]/70 transition-colors">
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
                              <p className="font-bold text-[#4a1c14] text-sm">{u.full_name || "Staff Member"}</p>
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
                        {isMaster ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-900 border border-amber-500/40 shadow-xs">
                            <Crown className="size-3.5 text-amber-600" /> Super Admin (Owner)
                          </span>
                        ) : u.role === "super_admin" || u.permissions.users ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-900 border border-amber-500/30 shadow-xs">
                            <Crown className="size-3.5 text-amber-600" /> Super Admin
                          </span>
                        ) : u.role === "admin" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-900 border border-emerald-500/30 shadow-xs">
                            <ShieldCheck className="size-3.5 text-emerald-600" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#faf4eb] text-[#7c533f] border border-[#e5d8c5]">
                            <UserCheck className="size-3.5 text-[#8b2500]" /> Staff
                          </span>
                        )}
                      </td>

                      {/* Students Toggle */}
                      <td className="py-3.5 px-2 text-center">
                        <Switch
                          checked={isMaster || u.permissions.students}
                          disabled={!isSuperAdmin || isMaster || toggleQuickPerm.isPending}
                          onCheckedChange={(v) => toggleQuickPerm.mutate({ user: u, key: "students", value: v })}
                        />
                      </td>

                      {/* Services Toggle */}
                      <td className="py-3.5 px-2 text-center">
                        <Switch
                          checked={isMaster || u.permissions.services}
                          disabled={!isSuperAdmin || isMaster || toggleQuickPerm.isPending}
                          onCheckedChange={(v) => toggleQuickPerm.mutate({ user: u, key: "services", value: v })}
                        />
                      </td>

                      {/* Limits Toggle */}
                      <td className="py-3.5 px-2 text-center">
                        <Switch
                          checked={isMaster || u.permissions.settings}
                          disabled={!isSuperAdmin || isMaster || toggleQuickPerm.isPending}
                          onCheckedChange={(v) => toggleQuickPerm.mutate({ user: u, key: "settings", value: v })}
                        />
                      </td>

                      {/* Reports Toggle */}
                      <td className="py-3.5 px-2 text-center">
                        <Switch
                          checked={isMaster || u.permissions.reports}
                          disabled={!isSuperAdmin || isMaster || toggleQuickPerm.isPending}
                          onCheckedChange={(v) => toggleQuickPerm.mutate({ user: u, key: "reports", value: v })}
                        />
                      </td>

                      {/* Delete Rights Toggle */}
                      <td className="py-3.5 px-2 text-center">
                        <Switch
                          checked={isMaster || Boolean(u.permissions.delete_students || u.permissions.delete_services)}
                          disabled={!isSuperAdmin || isMaster || toggleDeletePerm.isPending}
                          onCheckedChange={(v) => toggleDeletePerm.mutate({ user: u, value: v })}
                        />
                      </td>

                      {/* Super Admin Toggle */}
                      <td className="py-3.5 px-2 text-center">
                        <Switch
                          checked={isMaster || u.permissions.users}
                          disabled={!isSuperAdmin || isMaster || toggleQuickPerm.isPending}
                          onCheckedChange={(v) => toggleQuickPerm.mutate({ user: u, key: "users", value: v })}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {isSuperAdmin && !isMaster && (
                            <button
                              type="button"
                              title="Edit Permissions"
                              onClick={() => openEditModal(u)}
                              className="btn-luxury-secondary px-2.5 py-1 text-xs gap-1 cursor-pointer active:scale-95"
                            >
                              <Sliders className="size-3.5" />
                              <span className="hidden md:inline">Rights</span>
                            </button>
                          )}

                          {isSuperAdmin && (
                            <button
                              type="button"
                              title="Reset Password"
                              onClick={() => {
                                setResetUserId(u.id);
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
                    <td colSpan={9} className="py-12 text-center text-[#7c533f]">
                      <div className="max-w-xs mx-auto space-y-2">
                        <ShieldAlert className="size-8 text-amber-600 mx-auto opacity-70" />
                        <p className="font-bold text-[#4a1c14] text-sm">No matching user accounts</p>
                        <p className="text-xs text-[#7c533f]">
                          {searchTerm ? "Try searching with a different name or email." : "No accounts created yet."}
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

      {/* Create User Dialog with Granular Module Selection */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="modal-luxury sm:max-w-lg p-6 md:p-8">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-[#4a1c14] flex items-center gap-2">
              <UserPlus className="size-6 text-[#8b2500]" /> Create New User Account
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7c533f]">
              Add a new staff or administrator and assign their role-based module permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-name" className="text-xs font-bold text-[#7c533f]">Full Name</Label>
                <Input
                  id="create-name"
                  placeholder="e.g. Ramesh Patel"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  className="input-luxury h-10 font-semibold text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-email" className="text-xs font-bold text-[#7c533f]">Email Address</Label>
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
              <Label htmlFor="create-pass" className="text-xs font-bold text-[#7c533f]">Initial Password</Label>
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

            {/* Role Preset Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#7c533f]">Quick Role Preset</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateRolePreset("staff")}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    createForm.role === "staff"
                      ? "border-[#8b2500] bg-[#f8ede3] text-[#4a1c14] font-bold shadow-xs"
                      : "border-[#e5d8c5] bg-white hover:bg-[#faf4eb] text-[#7c533f]"
                  }`}
                >
                  <p className="text-xs font-bold">Staff</p>
                  <p className="text-[10px] opacity-80">Reports only</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateRolePreset("admin")}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    createForm.role === "admin"
                      ? "border-[#8b2500] bg-[#f8ede3] text-[#4a1c14] font-bold shadow-xs"
                      : "border-[#e5d8c5] bg-white hover:bg-[#faf4eb] text-[#7c533f]"
                  }`}
                >
                  <p className="text-xs font-bold">Admin</p>
                  <p className="text-[10px] opacity-80">Students & Services</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateRolePreset("super_admin")}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    createForm.role === "super_admin"
                      ? "border-amber-600 bg-amber-50 text-amber-900 font-bold shadow-xs"
                      : "border-[#e5d8c5] bg-white hover:bg-[#faf4eb] text-[#7c533f]"
                  }`}
                >
                  <p className="text-xs font-bold">Super Admin</p>
                  <p className="text-[10px] opacity-80">Full System Access</p>
                </button>
              </div>
            </div>

            {/* Granular Module Checkboxes */}
            <div className="p-3.5 rounded-2xl border-2 border-[#e5d8c5] bg-[#faf6ef] space-y-2.5">
              <Label className="text-xs font-bold text-[#7c533f]">Module Permissions:</Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#e5d8c5] hover:bg-[#faf4eb] cursor-pointer shadow-xs">
                  <Switch
                    checked={createForm.permissions.students}
                    onCheckedChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        permissions: { ...createForm.permissions, students: v },
                      })
                    }
                  />
                  <span className="font-semibold text-[#4a1c14]">Students Master</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#e5d8c5] hover:bg-[#faf4eb] cursor-pointer shadow-xs">
                  <Switch
                    checked={createForm.permissions.services}
                    onCheckedChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        permissions: { ...createForm.permissions, services: v },
                      })
                    }
                  />
                  <span className="font-semibold text-[#4a1c14]">Services & Prices</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#e5d8c5] hover:bg-[#faf4eb] cursor-pointer shadow-xs">
                  <Switch
                    checked={createForm.permissions.settings}
                    onCheckedChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        permissions: { ...createForm.permissions, settings: v },
                      })
                    }
                  />
                  <span className="font-semibold text-[#4a1c14]">Limits & Headers</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#e5d8c5] hover:bg-[#faf4eb] cursor-pointer shadow-xs">
                  <Switch
                    checked={createForm.permissions.reports}
                    onCheckedChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        permissions: { ...createForm.permissions, reports: v },
                      })
                    }
                  />
                  <span className="font-semibold text-[#4a1c14]">Reports & Analytics</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#e5d8c5] hover:bg-[#faf4eb] cursor-pointer shadow-xs">
                  <Switch
                    checked={createForm.permissions.export_data !== false}
                    onCheckedChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        permissions: { ...createForm.permissions, export_data: v },
                      })
                    }
                  />
                  <span className="font-semibold text-[#4a1c14]">Export Data (Excel)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 cursor-pointer shadow-xs">
                  <Switch
                    checked={Boolean(createForm.permissions.delete_students)}
                    onCheckedChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        permissions: { ...createForm.permissions, delete_students: v },
                      })
                    }
                  />
                  <span className="font-semibold text-rose-800">Delete Students</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 cursor-pointer shadow-xs">
                  <Switch
                    checked={Boolean(createForm.permissions.delete_services)}
                    onCheckedChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        permissions: { ...createForm.permissions, delete_services: v },
                      })
                    }
                  />
                  <span className="font-semibold text-rose-800">Delete Services</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-amber-300 hover:bg-amber-50 cursor-pointer col-span-2 shadow-xs">
                  <Switch
                    checked={createForm.permissions.users}
                    onCheckedChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        permissions: { ...createForm.permissions, users: v },
                      })
                    }
                  />
                  <span className="font-bold text-amber-800">Super Admin (User & Role Control)</span>
                </label>
              </div>
            </div>
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

      {/* Edit User Permissions Dialog */}
      <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="modal-luxury sm:max-w-md p-6 md:p-8">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-[#4a1c14] flex items-center gap-2">
              <Sliders className="size-6 text-[#8b2500]" /> Edit Module Permissions
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7c533f]">
              Modify access rights for <strong>{editingUser?.full_name}</strong> ({editingUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2 border-2 border-[#e5d8c5] rounded-2xl p-3 bg-[#faf6ef] text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#e5d8c5]">
                <span className="font-semibold text-[#4a1c14] flex items-center gap-2">
                  <Users className="size-4 text-[#8b2500]" /> Students Master
                </span>
                <Switch
                  checked={editPerms.students}
                  onCheckedChange={(v) => setEditPerms({ ...editPerms, students: v })}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#e5d8c5]">
                <span className="font-semibold text-[#4a1c14] flex items-center gap-2">
                  <Wrench className="size-4 text-[#8b2500]" /> Services & Pricing
                </span>
                <Switch
                  checked={editPerms.services}
                  onCheckedChange={(v) => setEditPerms({ ...editPerms, services: v })}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#e5d8c5]">
                <span className="font-semibold text-[#4a1c14] flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-[#8b2500]" /> Limits & Messages
                </span>
                <Switch
                  checked={editPerms.settings}
                  onCheckedChange={(v) => setEditPerms({ ...editPerms, settings: v })}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#e5d8c5]">
                <span className="font-semibold text-[#4a1c14] flex items-center gap-2">
                  <FileSpreadsheet className="size-4 text-[#8b2500]" /> Reports & Analytics
                </span>
                <Switch
                  checked={editPerms.reports}
                  onCheckedChange={(v) => setEditPerms({ ...editPerms, reports: v })}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#e5d8c5]">
                <span className="font-semibold text-[#4a1c14] flex items-center gap-2">
                  <FileSpreadsheet className="size-4 text-[#8b2500]" /> Export Data (Excel)
                </span>
                <Switch
                  checked={editPerms.export_data !== false}
                  onCheckedChange={(v) => setEditPerms({ ...editPerms, export_data: v })}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-rose-200">
                <span className="font-semibold text-rose-800 flex items-center gap-2">
                  <Trash2 className="size-4 text-rose-600" /> Delete Students (Single & Bulk)
                </span>
                <Switch
                  checked={Boolean(editPerms.delete_students)}
                  onCheckedChange={(v) => setEditPerms({ ...editPerms, delete_students: v })}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-rose-200">
                <span className="font-semibold text-rose-800 flex items-center gap-2">
                  <Trash2 className="size-4 text-rose-600" /> Delete Services
                </span>
                <Switch
                  checked={Boolean(editPerms.delete_services)}
                  onCheckedChange={(v) => setEditPerms({ ...editPerms, delete_services: v })}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-amber-300">
                <span className="font-bold text-amber-800 flex items-center gap-2">
                  <Crown className="size-4 text-amber-600" /> Super Admin Access
                </span>
                <Switch
                  checked={editPerms.users}
                  onCheckedChange={(v) => setEditPerms({ ...editPerms, users: v })}
                />
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
              {savePermissions.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <CheckCircle2 className="size-4 mr-1.5" />}
              Save Permissions
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetUserId !== null} onOpenChange={(open) => !open && setResetUserId(null)}>
        <DialogContent className="modal-luxury sm:max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-[#4a1c14] flex items-center gap-2">
              <KeyRound className="size-6 text-[#8b2500]" /> Reset Password
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7c533f]">
              Set a new login password for this user account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <Label htmlFor="new-pass" className="text-xs font-bold text-[#7c533f]">New Password</Label>
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

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteUserId !== null} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent className="modal-luxury sm:max-w-md p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl font-bold text-[#4a1c14] flex items-center gap-2">
              <Trash2 className="size-5 text-rose-700" /> Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#7c533f]">
              Are you sure you want to permanently delete the user account for <strong>{deleteUserId?.email}</strong>?
              This action cannot be undone.
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
    </div>
  );
}
