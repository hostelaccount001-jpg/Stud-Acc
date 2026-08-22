import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
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
      { title: "Users & Roles — Gurukul Kiosk Admin" },
      { name: "description", content: "Super Admin portal to manage users, assign roles and module permissions." },
      { property: "og:title", content: "Users & Roles — Gurukul Kiosk Admin" },
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

  const [showCreateDialog, setShowCreateDialog] = useState(false);
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

  // Delete Dialog
  const [deleteUserId, setDeleteUserId] = useState<{ id: string; email: string } | null>(null);

  // Fetch all staff users
  const staff = useQuery({
    queryKey: ["staff-users"],
    queryFn: async () => {
      return (await listUsersFn()) as StaffMember[];
    },
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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="size-8 text-[#8b2500]" /> Users & Roles Management
          </h1>
          <p className="mt-1 text-sm text-[#7c533f] font-medium">
            Super Administrator control panel to manage user accounts and assign granular module permissions.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="btn-luxury-primary px-6 py-2.5 text-xs gap-2 shadow-lg"
          >
            <UserPlus className="size-4" /> Create New User
          </button>
        )}
      </header>

      {/* Super Admin Notice */}
      {!isSuperAdmin && (
        <Card className="card-luxury border-amber-500/40 bg-amber-500/10 p-4 text-xs font-bold flex items-center gap-3 text-amber-900">
          <ShieldAlert className="size-5 shrink-0 text-[#8b2500]" />
          <span>Only Super Administrators have permission to create accounts and change module rights.</span>
        </Card>
      )}

      {/* Users & Module Permissions Table */}
      <Card className="card-luxury p-6 md:p-8 space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5d8c5] text-left text-xs uppercase tracking-wider text-[#7c533f] font-bold">
                <th className="py-3 pr-4">User</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 px-2 text-center" title="Students Master Access">
                  <div className="flex flex-col items-center gap-0.5">
                    <Users className="size-4 text-[#8b2500]" />
                    <span className="text-[11px] font-bold">Students</span>
                  </div>
                </th>
                <th className="py-3 px-2 text-center" title="Services & Prices Access">
                  <div className="flex flex-col items-center gap-0.5">
                    <Wrench className="size-4 text-[#8b2500]" />
                    <span className="text-[11px] font-bold">Services</span>
                  </div>
                </th>
                <th className="py-3 px-2 text-center" title="Limits & Messages Access">
                  <div className="flex flex-col items-center gap-0.5">
                    <SlidersHorizontal className="size-4 text-[#8b2500]" />
                    <span className="text-[11px] font-bold">Limits</span>
                  </div>
                </th>
                <th className="py-3 px-2 text-center" title="Reports Access">
                  <div className="flex flex-col items-center gap-0.5">
                    <FileSpreadsheet className="size-4 text-[#8b2500]" />
                    <span className="text-[11px] font-bold">Reports</span>
                  </div>
                </th>
                <th className="py-3 px-2 text-center" title="Users & Roles (Super Admin)">
                  <div className="flex flex-col items-center gap-0.5">
                    <Crown className="size-4 text-amber-600" />
                    <span className="text-[11px] font-bold text-amber-800">Super Admin</span>
                  </div>
                </th>
                <th className="py-3 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5d8c5]/60 text-xs">
              {(staff.data ?? []).map((u) => {
                const isMaster = u.email === "anshsangani2007@gmail.com";
                const isSelf = u.email === currentEmail;

                return (
                  <tr key={u.id} className="table-row-luxury hover:bg-[#faf4eb]">
                    {/* User info */}
                    <td className="py-3.5 pr-4 font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-2xl bg-gradient-to-tr from-[#8b2500] to-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {u.full_name ? u.full_name[0]?.toUpperCase() : <User className="size-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-[#4a1c14] text-sm">{u.full_name || "Staff Member"}</p>
                          <p className="text-xs font-mono text-[#7c533f]">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="py-3.5 pr-4">
                      {isMaster ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-900 border border-amber-500/30">
                          <Crown className="size-3.5 text-amber-600" /> Super Admin (Owner)
                        </span>
                      ) : u.permissions.users ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-900 border border-amber-500/30">
                          <Crown className="size-3.5 text-amber-600" /> Super Admin
                        </span>
                      ) : u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-900 border border-emerald-500/30">
                          <ShieldCheck className="size-3.5" /> Administrator
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#faf6ef] text-[#7c533f] border border-[#d8c5af]">
                          <User className="size-3.5" /> Staff
                        </span>
                      )}
                    </td>

                    {/* Students Toggle */}
                    <td className="py-3.5 px-2 text-center">
                      <Switch
                        checked={isMaster || u.permissions.students}
                        disabled={!isSuperAdmin || isMaster}
                        onCheckedChange={(v) => toggleQuickPerm.mutate({ user: u, key: "students", value: v })}
                      />
                    </td>

                    {/* Services Toggle */}
                    <td className="py-3.5 px-2 text-center">
                      <Switch
                        checked={isMaster || u.permissions.services}
                        disabled={!isSuperAdmin || isMaster}
                        onCheckedChange={(v) => toggleQuickPerm.mutate({ user: u, key: "services", value: v })}
                      />
                    </td>

                    {/* Limits & Messages Toggle */}
                    <td className="py-3.5 px-2 text-center">
                      <Switch
                        checked={isMaster || u.permissions.settings}
                        disabled={!isSuperAdmin || isMaster}
                        onCheckedChange={(v) => toggleQuickPerm.mutate({ user: u, key: "settings", value: v })}
                      />
                    </td>

                    {/* Reports Toggle */}
                    <td className="py-3.5 px-2 text-center">
                      <Switch
                        checked={isMaster || u.permissions.reports}
                        disabled={!isSuperAdmin || isMaster}
                        onCheckedChange={(v) => toggleQuickPerm.mutate({ user: u, key: "reports", value: v })}
                      />
                    </td>

                    {/* Super Admin Toggle */}
                    <td className="py-3.5 px-2 text-center">
                      <Switch
                        checked={isMaster || u.permissions.users}
                        disabled={!isSuperAdmin || isMaster}
                        onCheckedChange={(v) => toggleQuickPerm.mutate({ user: u, key: "users", value: v })}
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pl-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {isSuperAdmin && !isMaster && (
                          <button
                            type="button"
                            title="Edit Permissions"
                            onClick={() => openEditModal(u)}
                            className="btn-luxury-secondary px-2.5 py-1 text-xs gap-1"
                          >
                            <Sliders className="size-3.5" />
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
                            className="btn-luxury-secondary px-2.5 py-1 text-xs gap-1"
                          >
                            <KeyRound className="size-3.5 text-amber-700" />
                          </button>
                        )}
                        {isSuperAdmin && !isMaster && !isSelf && (
                          <button
                            type="button"
                            title="Delete User"
                            onClick={() => setDeleteUserId({ id: u.id, email: u.email })}
                            disabled={deleteUser.isPending}
                            className="btn-luxury-danger px-2.5 py-1 text-xs"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {(staff.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    {staff.isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin text-primary" /> Loading users...
                      </span>
                    ) : (
                      "No user accounts found."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Dialog with Granular Module Selection */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <UserPlus className="size-5" /> Create New User Account
            </DialogTitle>
            <DialogDescription>
              Add a new user and configure their individual module permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-name">Full Name</Label>
                <Input
                  id="create-name"
                  placeholder="Enter Full Name"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-email">Email Address</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="Enter Email Address"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-pass">Initial Password</Label>
              <Input
                id="create-pass"
                type="password"
                placeholder="Minimum 6 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>

            {/* Role Preset Selector */}
            <div className="space-y-2">
              <Label>Quick Role Preset</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateRolePreset("staff")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    createForm.role === "staff"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="text-xs font-bold">Staff</p>
                  <p className="text-[10px] opacity-80">Reports only</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateRolePreset("admin")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    createForm.role === "admin"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="text-xs font-bold">Admin</p>
                  <p className="text-[10px] opacity-80">Students & Services</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateRolePreset("super_admin")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    createForm.role === "super_admin"
                      ? "border-amber-500 bg-amber-500/10 text-amber-600 font-semibold"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="text-xs font-bold">Super Admin</p>
                  <p className="text-[10px] opacity-80">Full System Access</p>
                </button>
              </div>
            </div>

            {/* Granular Module Checkboxes */}
            <div className="space-y-2 border rounded-lg p-3 bg-secondary/30">
              <Label className="text-xs font-semibold text-foreground">Custom Module Access:</Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-card cursor-pointer">
                  <Switch
                    checked={createForm.permissions.students}
                    onCheckedChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        permissions: { ...createForm.permissions, students: v },
                      })
                    }
                  />
                  <span>👥 Students Module</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-card cursor-pointer">
                  <Switch
                    checked={createForm.permissions.services}
                    onCheckedChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        permissions: { ...createForm.permissions, services: v },
                      })
                    }
                  />
                  <span>🔧 Services Module</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-card cursor-pointer">
                  <Switch
                    checked={createForm.permissions.settings}
                    onCheckedChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        permissions: { ...createForm.permissions, settings: v },
                      })
                    }
                  />
                  <span>🎛️ Limits & Messages</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-card cursor-pointer">
                  <Switch
                    checked={createForm.permissions.reports}
                    onCheckedChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        permissions: { ...createForm.permissions, reports: v },
                      })
                    }
                  />
                  <span>📊 Reports & Export</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-card cursor-pointer col-span-2">
                  <Switch
                    checked={createForm.permissions.users}
                    onCheckedChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        permissions: { ...createForm.permissions, users: v },
                      })
                    }
                  />
                  <span className="font-semibold text-amber-600">👑 Users & Roles (Super Admin)</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => createUser.mutate()} disabled={createUser.isPending}>
              {createUser.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Permissions Dialog */}
      <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Sliders className="size-5" /> Edit Module Permissions
            </DialogTitle>
            <DialogDescription>
              Modify access rights for <strong>{editingUser?.full_name}</strong> ({editingUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2 border rounded-lg p-3 bg-secondary/30 text-xs">
              <div className="flex items-center justify-between p-1.5 rounded hover:bg-card">
                <span className="font-medium flex items-center gap-2">
                  <Users className="size-4 text-primary" /> Students Master
                </span>
                <Switch
                  checked={editPerms.students}
                  onCheckedChange={(v) => setEditPerms({ ...editPerms, students: v })}
                />
              </div>

              <div className="flex items-center justify-between p-1.5 rounded hover:bg-card">
                <span className="font-medium flex items-center gap-2">
                  <Wrench className="size-4 text-primary" /> Services & Pricing
                </span>
                <Switch
                  checked={editPerms.services}
                  onCheckedChange={(v) => setEditPerms({ ...editPerms, services: v })}
                />
              </div>

              <div className="flex items-center justify-between p-1.5 rounded hover:bg-card">
                <span className="font-medium flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-primary" /> Limits & Messages
                </span>
                <Switch
                  checked={editPerms.settings}
                  onCheckedChange={(v) => setEditPerms({ ...editPerms, settings: v })}
                />
              </div>

              <div className="flex items-center justify-between p-1.5 rounded hover:bg-card">
                <span className="font-medium flex items-center gap-2">
                  <FileSpreadsheet className="size-4 text-primary" /> Reports & Analytics
                </span>
                <Switch
                  checked={editPerms.reports}
                  onCheckedChange={(v) => setEditPerms({ ...editPerms, reports: v })}
                />
              </div>

              <div className="flex items-center justify-between p-1.5 rounded hover:bg-card border-t pt-2">
                <span className="font-semibold text-amber-600 flex items-center gap-2">
                  <Crown className="size-4" /> Super Admin Access
                </span>
                <Switch
                  checked={editPerms.users}
                  onCheckedChange={(v) => setEditPerms({ ...editPerms, users: v })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={() => savePermissions.mutate()} disabled={savePermissions.isPending}>
              {savePermissions.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <CheckCircle2 className="size-4 mr-1.5" />}
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetUserId !== null} onOpenChange={(open) => !open && setResetUserId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" /> Reset User Password
            </DialogTitle>
            <DialogDescription>
              Set a new login password for this user account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="reset-pass">New Password</Label>
            <Input
              id="reset-pass"
              type="password"
              placeholder="Enter new password (min 6 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetUserId(null)}>
              Cancel
            </Button>
            <Button onClick={() => resetPassword.mutate()} disabled={resetPassword.isPending}>
              {resetPassword.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Save Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteUserId !== null} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" /> Delete User Account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently remove <strong>{deleteUserId?.email}</strong>? They will no longer be able to log in to the ERP portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUser.isPending}
              onClick={() => deleteUserId && deleteUser.mutate(deleteUserId.id)}
            >
              {deleteUser.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
