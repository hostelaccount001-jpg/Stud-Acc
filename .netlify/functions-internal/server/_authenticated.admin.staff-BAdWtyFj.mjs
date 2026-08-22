import { i as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime } from "./_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { F as KeyRound, N as LoaderCircle, W as Crown, _ as ShieldCheck, a as UserPlus, h as SlidersHorizontal, i as User, m as SlidersVertical, n as Wrench, q as CircleCheck, r as Users, u as Trash2, v as ShieldAlert, z as FileSpreadsheet } from "./_libs/lucide-react.mjs";
import { t as Button } from "./_ssr/button-BkEeRci-.mjs";
import { a as deleteStaffUserServer, c as updateStaffPermissionsServer, i as defaultSuperAdminPermissions, l as useCurrentUser, n as defaultAdminPermissions, o as listStaffUsersServer, r as defaultStaffPermissions, s as resetStaffPasswordServer, t as createStaffUserServer } from "./_ssr/use-current-user-DaEVBLuH.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "./_libs/tanstack__react-query.mjs";
import { t as Card } from "./_ssr/card-CzXpCsbD.mjs";
import { t as useServerFn } from "./_ssr/useServerFn-CrZF2pjq.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, i as AlertDialogContent, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog } from "./_ssr/alert-dialog-Cyj8fg_M.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { t as Input } from "./_ssr/input-B8Q2ztVi.mjs";
import { t as Label } from "./_ssr/label-DBD1bRRP.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./_ssr/dialog-CwLzEEob.mjs";
import { t as Switch } from "./_ssr/switch-g3PLolhL.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_authenticated.admin.staff-BAdWtyFj.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function StaffPage() {
	const qc = useQueryClient();
	const { isSuperAdmin, email: currentEmail } = useCurrentUser();
	const listUsersFn = useServerFn(listStaffUsersServer);
	const createUserFn = useServerFn(createStaffUserServer);
	const updatePermsFn = useServerFn(updateStaffPermissionsServer);
	const deleteUserFn = useServerFn(deleteStaffUserServer);
	const resetPasswordFn = useServerFn(resetStaffPasswordServer);
	const [showCreateDialog, setShowCreateDialog] = (0, import_react.useState)(false);
	const [createForm, setCreateForm] = (0, import_react.useState)({
		fullName: "",
		email: "",
		password: "",
		role: "staff",
		permissions: { ...defaultStaffPermissions }
	});
	const [editingUser, setEditingUser] = (0, import_react.useState)(null);
	const [editPerms, setEditPerms] = (0, import_react.useState)({ ...defaultStaffPermissions });
	const [resetUserId, setResetUserId] = (0, import_react.useState)(null);
	const [newPassword, setNewPassword] = (0, import_react.useState)("");
	const [deleteUserId, setDeleteUserId] = (0, import_react.useState)(null);
	const staff = useQuery({
		queryKey: ["staff-users"],
		queryFn: async () => {
			return await listUsersFn();
		}
	});
	const createUser = useMutation({
		mutationFn: async () => {
			if (!createForm.fullName.trim()) throw new Error("Please enter full name");
			if (!createForm.email.trim()) throw new Error("Please enter a valid email address");
			if (createForm.password.length < 6) throw new Error("Password must be at least 6 characters");
			return await createUserFn({ data: {
				fullName: createForm.fullName.trim(),
				email: createForm.email.trim(),
				password: createForm.password,
				role: createForm.role,
				permissions: createForm.permissions
			} });
		},
		onSuccess: () => {
			toast.success("New user account created successfully");
			setShowCreateDialog(false);
			setCreateForm({
				fullName: "",
				email: "",
				password: "",
				role: "staff",
				permissions: { ...defaultStaffPermissions }
			});
			qc.invalidateQueries({ queryKey: ["staff-users"] });
		},
		onError: (e) => toast.error(e.message || "Failed to create user")
	});
	const savePermissions = useMutation({
		mutationFn: async () => {
			if (!editingUser) return;
			const isSuper = editPerms.users;
			const isAdmin = isSuper || editPerms.students || editPerms.services || editPerms.settings;
			return await updatePermsFn({ data: {
				userId: editingUser.id,
				role: isSuper ? "super_admin" : isAdmin ? "admin" : "staff",
				permissions: editPerms
			} });
		},
		onSuccess: () => {
			toast.success("Permissions updated successfully");
			setEditingUser(null);
			qc.invalidateQueries({ queryKey: ["staff-users"] });
		},
		onError: (e) => toast.error(e.message || "Failed to update permissions")
	});
	const toggleQuickPerm = useMutation({
		mutationFn: async ({ user, key, value }) => {
			const nextPerms = {
				...user.permissions,
				[key]: value
			};
			const isSuper = nextPerms.users;
			const isAdmin = isSuper || nextPerms.students || nextPerms.services || nextPerms.settings;
			return await updatePermsFn({ data: {
				userId: user.id,
				role: isSuper ? "super_admin" : isAdmin ? "admin" : "staff",
				permissions: nextPerms
			} });
		},
		onSuccess: () => {
			toast.success("Permission updated");
			qc.invalidateQueries({ queryKey: ["staff-users"] });
		},
		onError: (e) => toast.error(e.message || "Failed to toggle permission")
	});
	const resetPassword = useMutation({
		mutationFn: async () => {
			if (!resetUserId || newPassword.length < 6) throw new Error("Password must be at least 6 characters");
			return await resetPasswordFn({ data: {
				userId: resetUserId,
				newPassword
			} });
		},
		onSuccess: () => {
			toast.success("Password updated successfully");
			setResetUserId(null);
			setNewPassword("");
		},
		onError: (e) => toast.error(e.message || "Failed to reset password")
	});
	const deleteUser = useMutation({
		mutationFn: async (userId) => {
			return await deleteUserFn({ data: { userId } });
		},
		onSuccess: () => {
			toast.success("User deleted successfully");
			setDeleteUserId(null);
			qc.invalidateQueries({ queryKey: ["staff-users"] });
		},
		onError: (e) => toast.error(e.message || "Failed to delete user")
	});
	function openEditModal(u) {
		setEditingUser(u);
		setEditPerms({ ...u.permissions });
	}
	function handleCreateRolePreset(role) {
		if (role === "super_admin") setCreateForm({
			...createForm,
			role,
			permissions: { ...defaultSuperAdminPermissions }
		});
		else if (role === "admin") setCreateForm({
			...createForm,
			role,
			permissions: { ...defaultAdminPermissions }
		});
		else setCreateForm({
			...createForm,
			role,
			permissions: { ...defaultStaffPermissions }
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight flex items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-8 text-[#8b2500]" }), " Users & Roles Management"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-[#7c533f] font-medium",
					children: "Super Administrator control panel to manage user accounts and assign granular module permissions."
				})] }), isSuperAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setShowCreateDialog(true),
					className: "btn-luxury-primary px-6 py-2.5 text-xs gap-2 shadow-lg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserPlus, { className: "size-4" }), " Create New User"]
				})]
			}),
			!isSuperAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "card-luxury border-amber-500/40 bg-amber-500/10 p-4 text-xs font-bold flex items-center gap-3 text-amber-900",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "size-5 shrink-0 text-[#8b2500]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Only Super Administrators have permission to create accounts and change module rights." })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "card-luxury p-6 md:p-8 space-y-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-[#e5d8c5] text-left text-xs uppercase tracking-wider text-[#7c533f] font-bold",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4",
									children: "User"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4",
									children: "Role"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 px-2 text-center",
									title: "Students Master Access",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col items-center gap-0.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-4 text-[#8b2500]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] font-bold",
											children: "Students"
										})]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 px-2 text-center",
									title: "Services & Prices Access",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col items-center gap-0.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wrench, { className: "size-4 text-[#8b2500]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] font-bold",
											children: "Services"
										})]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 px-2 text-center",
									title: "Limits & Messages Access",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col items-center gap-0.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, { className: "size-4 text-[#8b2500]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] font-bold",
											children: "Limits"
										})]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 px-2 text-center",
									title: "Reports Access",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col items-center gap-0.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileSpreadsheet, { className: "size-4 text-[#8b2500]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] font-bold",
											children: "Reports"
										})]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 px-2 text-center",
									title: "Users & Roles (Super Admin)",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col items-center gap-0.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "size-4 text-amber-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] font-bold text-amber-800",
											children: "Super Admin"
										})]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pl-4 text-right",
									children: "Actions"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", {
							className: "divide-y divide-[#e5d8c5]/60 text-xs",
							children: [(staff.data ?? []).map((u) => {
								const isMaster = u.email === "anshsangani2007@gmail.com";
								const isSelf = u.email === currentEmail;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "table-row-luxury hover:bg-[#faf4eb]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4 font-medium",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "size-9 rounded-2xl bg-gradient-to-tr from-[#8b2500] to-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-sm",
													children: u.full_name ? u.full_name[0]?.toUpperCase() : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "size-4" })
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "font-bold text-[#4a1c14] text-sm",
													children: u.full_name || "Staff Member"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs font-mono text-[#7c533f]",
													children: u.email
												})] })]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4",
											children: isMaster ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-900 border border-amber-500/30",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "size-3.5 text-amber-600" }), " Super Admin (Owner)"]
											}) : u.permissions.users ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-900 border border-amber-500/30",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "size-3.5 text-amber-600" }), " Super Admin"]
											}) : u.role === "admin" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-900 border border-emerald-500/30",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-3.5" }), " Administrator"]
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#faf6ef] text-[#7c533f] border border-[#d8c5af]",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "size-3.5" }), " Staff"]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 px-2 text-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
												checked: isMaster || u.permissions.students,
												disabled: !isSuperAdmin || isMaster,
												onCheckedChange: (v) => toggleQuickPerm.mutate({
													user: u,
													key: "students",
													value: v
												})
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 px-2 text-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
												checked: isMaster || u.permissions.services,
												disabled: !isSuperAdmin || isMaster,
												onCheckedChange: (v) => toggleQuickPerm.mutate({
													user: u,
													key: "services",
													value: v
												})
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 px-2 text-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
												checked: isMaster || u.permissions.settings,
												disabled: !isSuperAdmin || isMaster,
												onCheckedChange: (v) => toggleQuickPerm.mutate({
													user: u,
													key: "settings",
													value: v
												})
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 px-2 text-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
												checked: isMaster || u.permissions.reports,
												disabled: !isSuperAdmin || isMaster,
												onCheckedChange: (v) => toggleQuickPerm.mutate({
													user: u,
													key: "reports",
													value: v
												})
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 px-2 text-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
												checked: isMaster || u.permissions.users,
												disabled: !isSuperAdmin || isMaster,
												onCheckedChange: (v) => toggleQuickPerm.mutate({
													user: u,
													key: "users",
													value: v
												})
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pl-4 text-right",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-end gap-1.5",
												children: [
													isSuperAdmin && !isMaster && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														title: "Edit Permissions",
														onClick: () => openEditModal(u),
														className: "btn-luxury-secondary px-2.5 py-1 text-xs gap-1",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersVertical, { className: "size-3.5" })
													}),
													isSuperAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														title: "Reset Password",
														onClick: () => {
															setResetUserId(u.id);
															setNewPassword("");
														},
														className: "btn-luxury-secondary px-2.5 py-1 text-xs gap-1",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "size-3.5 text-amber-700" })
													}),
													isSuperAdmin && !isMaster && !isSelf && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														title: "Delete User",
														onClick: () => setDeleteUserId({
															id: u.id,
															email: u.email
														}),
														disabled: deleteUser.isPending,
														className: "btn-luxury-danger px-2.5 py-1 text-xs",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" })
													})
												]
											})
										})
									]
								}, u.id);
							}), (staff.data ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								colSpan: 8,
								className: "py-8 text-center text-muted-foreground",
								children: staff.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin text-primary" }), " Loading users..."]
								}) : "No user accounts found."
							}) })]
						})]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: showCreateDialog,
				onOpenChange: setShowCreateDialog,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "sm:max-w-lg",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
							className: "flex items-center gap-2 text-primary",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserPlus, { className: "size-5" }), " Create New User Account"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Add a new user and configure their individual module permissions." })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4 py-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "create-name",
											children: "Full Name"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "create-name",
											placeholder: "e.g. Ramesh Patel",
											value: createForm.fullName,
											onChange: (e) => setCreateForm({
												...createForm,
												fullName: e.target.value
											})
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "create-email",
											children: "Email Address"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "create-email",
											type: "email",
											placeholder: "e.g. ramesh@gurukul.org",
											value: createForm.email,
											onChange: (e) => setCreateForm({
												...createForm,
												email: e.target.value
											})
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "create-pass",
										children: "Initial Password"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "create-pass",
										type: "password",
										placeholder: "Minimum 6 characters",
										value: createForm.password,
										onChange: (e) => setCreateForm({
											...createForm,
											password: e.target.value
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Quick Role Preset" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-3 gap-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => handleCreateRolePreset("staff"),
												className: `p-2.5 rounded-lg border text-left transition-all ${createForm.role === "staff" ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:bg-muted text-muted-foreground"}`,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs font-bold",
													children: "Staff"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-[10px] opacity-80",
													children: "Reports only"
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => handleCreateRolePreset("admin"),
												className: `p-2.5 rounded-lg border text-left transition-all ${createForm.role === "admin" ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:bg-muted text-muted-foreground"}`,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs font-bold",
													children: "Admin"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-[10px] opacity-80",
													children: "Students & Services"
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => handleCreateRolePreset("super_admin"),
												className: `p-2.5 rounded-lg border text-left transition-all ${createForm.role === "super_admin" ? "border-amber-500 bg-amber-500/10 text-amber-600 font-semibold" : "border-border hover:bg-muted text-muted-foreground"}`,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs font-bold",
													children: "Super Admin"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-[10px] opacity-80",
													children: "Full System Access"
												})]
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2 border rounded-lg p-3 bg-secondary/30",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										className: "text-xs font-semibold text-foreground",
										children: "Custom Module Access:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-2 gap-2 text-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex items-center gap-2 p-1.5 rounded hover:bg-card cursor-pointer",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
													checked: createForm.permissions.students,
													onCheckedChange: (v) => setCreateForm({
														...createForm,
														permissions: {
															...createForm.permissions,
															students: v
														}
													})
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "👥 Students Module" })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex items-center gap-2 p-1.5 rounded hover:bg-card cursor-pointer",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
													checked: createForm.permissions.services,
													onCheckedChange: (v) => setCreateForm({
														...createForm,
														permissions: {
															...createForm.permissions,
															services: v
														}
													})
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "🔧 Services Module" })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex items-center gap-2 p-1.5 rounded hover:bg-card cursor-pointer",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
													checked: createForm.permissions.settings,
													onCheckedChange: (v) => setCreateForm({
														...createForm,
														permissions: {
															...createForm.permissions,
															settings: v
														}
													})
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "🎛️ Limits & Messages" })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex items-center gap-2 p-1.5 rounded hover:bg-card cursor-pointer",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
													checked: createForm.permissions.reports,
													onCheckedChange: (v) => setCreateForm({
														...createForm,
														permissions: {
															...createForm.permissions,
															reports: v
														}
													})
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "📊 Reports & Export" })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex items-center gap-2 p-1.5 rounded hover:bg-card cursor-pointer col-span-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
													checked: createForm.permissions.users,
													onCheckedChange: (v) => setCreateForm({
														...createForm,
														permissions: {
															...createForm.permissions,
															users: v
														}
													})
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-semibold text-amber-600",
													children: "👑 Users & Roles (Super Admin)"
												})]
											})
										]
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							onClick: () => setShowCreateDialog(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: () => createUser.mutate(),
							disabled: createUser.isPending,
							children: [createUser.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin mr-1.5" }) : null, "Create Account"]
						})] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: editingUser !== null,
				onOpenChange: (open) => !open && setEditingUser(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "sm:max-w-md",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
							className: "flex items-center gap-2 text-primary",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersVertical, { className: "size-5" }), " Edit Module Permissions"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [
							"Modify access rights for ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: editingUser?.full_name }),
							" (",
							editingUser?.email,
							")."
						] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-3 py-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2 border rounded-lg p-3 bg-secondary/30 text-xs",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between p-1.5 rounded hover:bg-card",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-medium flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-4 text-primary" }), " Students Master"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: editPerms.students,
											onCheckedChange: (v) => setEditPerms({
												...editPerms,
												students: v
											})
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between p-1.5 rounded hover:bg-card",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-medium flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wrench, { className: "size-4 text-primary" }), " Services & Pricing"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: editPerms.services,
											onCheckedChange: (v) => setEditPerms({
												...editPerms,
												services: v
											})
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between p-1.5 rounded hover:bg-card",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-medium flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, { className: "size-4 text-primary" }), " Limits & Messages"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: editPerms.settings,
											onCheckedChange: (v) => setEditPerms({
												...editPerms,
												settings: v
											})
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between p-1.5 rounded hover:bg-card",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-medium flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileSpreadsheet, { className: "size-4 text-primary" }), " Reports & Analytics"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: editPerms.reports,
											onCheckedChange: (v) => setEditPerms({
												...editPerms,
												reports: v
											})
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between p-1.5 rounded hover:bg-card border-t pt-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-semibold text-amber-600 flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "size-4" }), " Super Admin Access"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: editPerms.users,
											onCheckedChange: (v) => setEditPerms({
												...editPerms,
												users: v
											})
										})]
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							onClick: () => setEditingUser(null),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: () => savePermissions.mutate(),
							disabled: savePermissions.isPending,
							children: [savePermissions.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin mr-1.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "size-4 mr-1.5" }), "Save Permissions"]
						})] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: resetUserId !== null,
				onOpenChange: (open) => !open && setResetUserId(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "sm:max-w-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "size-5 text-primary" }), " Reset User Password"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Set a new login password for this user account." })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "reset-pass",
								children: "New Password"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "reset-pass",
								type: "password",
								placeholder: "Enter new password (min 6 chars)",
								value: newPassword,
								onChange: (e) => setNewPassword(e.target.value)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							onClick: () => setResetUserId(null),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: () => resetPassword.mutate(),
							disabled: resetPassword.isPending,
							children: [resetPassword.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin mr-1.5" }) : null, "Save Password"]
						})] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: deleteUserId !== null,
				onOpenChange: (open) => !open && setDeleteUserId(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogTitle, {
					className: "text-destructive flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-5" }), " Delete User Account?"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
					"Are you sure you want to permanently remove ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: deleteUserId?.email }),
					"? They will no longer be able to log in to the ERP portal."
				] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, {
					disabled: deleteUser.isPending,
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogAction, {
					className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
					disabled: deleteUser.isPending,
					onClick: () => deleteUserId && deleteUser.mutate(deleteUserId.id),
					children: [deleteUser.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin mr-1.5" }) : null, "Delete User"]
				})] })] })
			})
		]
	});
}
//#endregion
export { StaffPage as component };
