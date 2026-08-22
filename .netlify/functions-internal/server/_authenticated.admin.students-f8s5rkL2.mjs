import { i as __toESM } from "./_runtime.mjs";
import { t as supabase } from "./_ssr/client-Cy02cvZt.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime } from "./_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { D as Pencil, E as Plus, N as LoaderCircle, R as FingerprintPattern, V as Download, a as UserPlus, b as Search, c as TriangleAlert, r as Users, s as Upload, t as X, u as Trash2 } from "./_libs/lucide-react.mjs";
import { i as createServerFn } from "./_ssr/server-DxD86aHG.mjs";
import { t as createSsrRpc } from "./_ssr/createSsrRpc-humr6_nj.mjs";
import { a as literalType, l as stringType, n as arrayType, r as booleanType, s as objectType, t as anyType } from "./_libs/zod.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "./_libs/tanstack__react-query.mjs";
import { t as Card } from "./_ssr/card-CzXpCsbD.mjs";
import { t as useServerFn } from "./_ssr/useServerFn-CrZF2pjq.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, i as AlertDialogContent, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog } from "./_ssr/alert-dialog-Cyj8fg_M.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { t as Input } from "./_ssr/input-B8Q2ztVi.mjs";
import { t as Label } from "./_ssr/label-DBD1bRRP.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./_ssr/dialog-CwLzEEob.mjs";
import { n as utils, r as writeFileSync, t as readSync } from "./_libs/xlsx.mjs";
import { t as Switch } from "./_ssr/switch-g3PLolhL.mjs";
import { n as toFingerRecords, r as useMantraDevice, t as captureFinger } from "./_ssr/mantra-DG5I9wM5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_authenticated.admin.students-f8s5rkL2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var studentInputSchema = objectType({
	suid: stringType().trim().min(1).max(40),
	name: stringType().trim().min(1).max(120),
	nfc_no: stringType().trim().min(1).max(64),
	class_name: stringType().trim().max(60).optional().nullable(),
	room_no: stringType().trim().max(60).optional().nullable(),
	fingerprints: arrayType(anyType()).optional()
});
var deleteStudentServer = createServerFn({ method: "POST" }).validator((input) => objectType({ id: stringType() }).parse(input)).handler(createSsrRpc("c98dbd8dd257e5e970a37dd70a011216ffc84110bc9eab7543596c8318b136c2"));
var deleteAllStudentsServer = createServerFn({ method: "POST" }).handler(createSsrRpc("ad6d966fa32b3b992045599285ba09d680ee6e0e99dca5f50ef713574ae11c4f"));
var addStudentServer = createServerFn({ method: "POST" }).validator((input) => studentInputSchema.parse(input)).handler(createSsrRpc("3a78f93b1696d6c5d0a40ef9812845d9b87afeef64dc2f1bb9508e32867ed14b"));
var updateStudentServer = createServerFn({ method: "POST" }).validator((input) => objectType({
	id: stringType(),
	data: studentInputSchema
}).parse(input)).handler(createSsrRpc("a0c3294270055ec8a81f6c31a4125e626bb3d7038ece8ce111ae320ac6513fae"));
var toggleBlockServer = createServerFn({ method: "POST" }).validator((input) => objectType({
	id: stringType(),
	blocked: booleanType()
}).parse(input)).handler(createSsrRpc("e89aaa718b07b11cddf44329c22e32ea9d070a674f2d34760bbf01aaf38408ad"));
var bulkUploadStudentsServer = createServerFn({ method: "POST" }).validator((input) => arrayType(studentInputSchema).parse(input)).handler(createSsrRpc("d12b36d4ddaa4621c2647c70d80e73d01b07dbadbe47efd84145aec1640e266a"));
var studentSchema = objectType({
	suid: stringType().trim().min(1).max(40),
	name: stringType().trim().min(1).max(120),
	nfc_no: stringType().trim().min(1).max(64),
	class_name: stringType().trim().max(60).optional().or(literalType("")),
	room_no: stringType().trim().max(60).optional().or(literalType(""))
});
var emptyForm = {
	suid: "",
	name: "",
	nfc_no: "",
	class_name: "",
	room_no: ""
};
function StudentsPage() {
	const qc = useQueryClient();
	const deleteStudentFn = useServerFn(deleteStudentServer);
	const deleteAllStudentsFn = useServerFn(deleteAllStudentsServer);
	const addStudentFn = useServerFn(addStudentServer);
	const updateStudentFn = useServerFn(updateStudentServer);
	const toggleBlockFn = useServerFn(toggleBlockServer);
	const bulkUploadFn = useServerFn(bulkUploadStudentsServer);
	const [search, setSearch] = (0, import_react.useState)("");
	const [form, setForm] = (0, import_react.useState)(emptyForm);
	const [newFingers, setNewFingers] = (0, import_react.useState)([]);
	const [editId, setEditId] = (0, import_react.useState)(null);
	const [editForm, setEditForm] = (0, import_react.useState)(emptyForm);
	const [editFingers, setEditFingers] = (0, import_react.useState)([]);
	const [deleteId, setDeleteId] = (0, import_react.useState)(null);
	const [showDeleteAllDialog, setShowDeleteAllDialog] = (0, import_react.useState)(false);
	const fileRef = (0, import_react.useRef)(null);
	const students = useQuery({
		queryKey: ["students", search],
		queryFn: async () => {
			let q = supabase.from("students").select("*").order("suid").limit(500);
			if (search.trim()) q = q.or(`suid.ilike.%${search.trim()}%,name.ilike.%${search.trim()}%,nfc_no.ilike.%${search.trim()}%`);
			const { data, error } = await q;
			if (error) throw error;
			return data;
		}
	});
	const addStudent = useMutation({
		mutationFn: async (values) => {
			const parsed = studentSchema.parse(values);
			try {
				await addStudentFn({ data: {
					suid: parsed.suid,
					name: parsed.name,
					nfc_no: parsed.nfc_no,
					class_name: parsed.class_name || null,
					room_no: parsed.room_no || null,
					fingerprints: newFingers
				} });
			} catch (err) {
				console.warn("Server insert failed, fallback client:", err);
				const { error } = await supabase.from("students").insert({
					suid: parsed.suid,
					name: parsed.name,
					nfc_no: parsed.nfc_no,
					class_name: parsed.class_name || null,
					room_no: parsed.room_no || null,
					fingerprints: newFingers
				});
				if (error) throw error;
			}
		},
		onSuccess: () => {
			toast.success("Student enrolled successfully!");
			setForm(emptyForm);
			setNewFingers([]);
			qc.invalidateQueries({ queryKey: ["students"] });
		},
		onError: (e) => toast.error(e.message || "Failed to add student")
	});
	const updateStudent = useMutation({
		mutationFn: async () => {
			if (!editId) return;
			const parsed = studentSchema.parse(editForm);
			try {
				await updateStudentFn({ data: {
					id: editId,
					data: {
						suid: parsed.suid,
						name: parsed.name,
						nfc_no: parsed.nfc_no,
						class_name: parsed.class_name || null,
						room_no: parsed.room_no || null,
						fingerprints: editFingers
					}
				} });
			} catch (err) {
				console.warn("Server update failed, fallback client:", err);
				const { error } = await supabase.from("students").update({
					suid: parsed.suid,
					name: parsed.name,
					nfc_no: parsed.nfc_no,
					class_name: parsed.class_name || null,
					room_no: parsed.room_no || null,
					fingerprints: editFingers,
					updated_at: (/* @__PURE__ */ new Date()).toISOString()
				}).eq("id", editId);
				if (error) throw error;
			}
		},
		onSuccess: () => {
			toast.success("Student updated successfully!");
			setEditId(null);
			qc.invalidateQueries({ queryKey: ["students"] });
		},
		onError: (e) => toast.error(e.message || "Failed to update student")
	});
	const deleteStudent = useMutation({
		mutationFn: async (id) => {
			try {
				await deleteStudentFn({ data: { id } });
			} catch (err) {
				console.warn("Server delete failed, fallback client:", err);
				const { error } = await supabase.from("students").delete().eq("id", id);
				if (error) throw error;
			}
		},
		onSuccess: () => {
			toast.success("Student removed successfully");
			setDeleteId(null);
			qc.invalidateQueries({ queryKey: ["students"] });
		},
		onError: (e) => toast.error(e.message || "Failed to delete student")
	});
	const deleteAllStudents = useMutation({
		mutationFn: async () => {
			try {
				return await deleteAllStudentsFn();
			} catch (err) {
				console.warn("Server delete-all failed, fallback client:", err);
				const { error } = await supabase.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
				if (error) throw error;
				return { count: studentList.length };
			}
		},
		onSuccess: (res) => {
			toast.success(`All ${res?.count ?? ""} students deleted successfully`);
			setShowDeleteAllDialog(false);
			qc.invalidateQueries({ queryKey: ["students"] });
		},
		onError: (e) => toast.error(e.message || "Failed to delete all students")
	});
	const toggleBlock = useMutation({
		mutationFn: async ({ id, blocked }) => {
			try {
				await toggleBlockFn({ data: {
					id,
					blocked
				} });
			} catch (err) {
				console.warn("Server toggle-block failed, fallback client:", err);
				const { error } = await supabase.from("students").update({ blocked }).eq("id", id);
				if (error) throw error;
			}
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
		onError: (e) => toast.error(e.message || "Failed to toggle block status")
	});
	function downloadSample() {
		const ws = utils.json_to_sheet([{
			SUID: "250392",
			NAME: "ZALODIYA DEEP SURESHBHAI",
			NFCNO: "3667085316",
			CLASS: "GM 10 (Hostel)",
			ROOM: "309"
		}, {
			SUID: "250623",
			NAME: "TARAPARA ANSH PARESHBHAI",
			NFCNO: "3664528900",
			CLASS: "GM 10 (Hostel)",
			ROOM: "406"
		}]);
		const wb = utils.book_new();
		utils.book_append_sheet(wb, ws, "Students");
		writeFileSync(wb, "Gurukul-Students-Sample.xlsx");
		toast.success("Sample Excel downloaded!");
	}
	async function handleUpload(file) {
		try {
			const buf = await file.arrayBuffer();
			const wb = readSync(buf, { type: "array" });
			const sheetName = wb.SheetNames[0];
			if (!sheetName) throw new Error("Excel file has no sheets");
			const rows = utils.sheet_to_json(wb.Sheets[sheetName]);
			if (rows.length === 0) throw new Error("Excel file is empty");
			function getVal(r, aliases) {
				for (const a of aliases) for (const k of Object.keys(r)) if (k.trim().toLowerCase().replace(/[^a-z0-9]/g, "") === a.trim().toLowerCase().replace(/[^a-z0-9]/g, "")) {
					const val = r[k];
					if (val !== void 0 && val !== null && String(val).trim() !== "") return String(val).trim();
				}
				return "";
			}
			const payload = rows.map((r, index) => {
				const suid = getVal(r, [
					"suid",
					"grno",
					"gr_no",
					"gr",
					"rollno",
					"roll_no",
					"id",
					"enrollment",
					"student_id"
				]) || `SUID${String(index + 1).padStart(3, "0")}`;
				return {
					suid,
					name: getVal(r, [
						"name",
						"student_name",
						"fullname",
						"student"
					]) || `Student ${suid}`,
					nfc_no: getVal(r, [
						"nfc_no",
						"nfcno",
						"nfc",
						"card_no",
						"cardno",
						"card",
						"rfid",
						"smartcard"
					]) || `NFC-${suid}`,
					class_name: getVal(r, [
						"class_name",
						"classname",
						"class",
						"std",
						"standard",
						"grade"
					]) || null,
					room_no: getVal(r, [
						"room_no",
						"roomno",
						"room",
						"hostel_room",
						"room_number"
					]) || null
				};
			}).filter((p) => p.suid.length > 0 && p.name.length > 0);
			if (payload.length === 0) throw new Error("No valid student rows found in file");
			try {
				const res = await bulkUploadFn({ data: payload });
				toast.success(`${res.count} students imported successfully`);
			} catch (err) {
				console.warn("Server bulk upload failed, fallback client:", err);
				const { error } = await supabase.from("students").upsert(payload.map((p) => ({
					suid: p.suid,
					name: p.name,
					nfc_no: p.nfc_no,
					class_name: p.class_name,
					room_no: p.room_no
				})), { onConflict: "suid" });
				if (error) throw error;
				toast.success(`${payload.length} students imported successfully`);
			}
			qc.invalidateQueries({ queryKey: ["students"] });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Import failed");
		} finally {
			if (fileRef.current) fileRef.current.value = "";
		}
	}
	function openEdit(s) {
		setEditId(s.id);
		setEditForm({
			suid: s.suid,
			name: s.name,
			nfc_no: s.nfc_no,
			class_name: s.class_name ?? "",
			room_no: s.room_no ?? ""
		});
		setEditFingers(toFingerRecords(s.fingerprints));
	}
	const studentList = students.data ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8 animate-in fade-in zoom-in-98 duration-300",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight flex items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-8 text-[#8b2500]" }), " Students & Biometrics"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm text-[#7c533f] font-medium",
					children: [
						"SUID and NFC card mapping, up to ",
						6,
						" fingerprints on Mantra MFS110, plus temporary card blocking."
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: downloadSample,
							className: "btn-luxury-secondary px-4 py-2.5 text-xs gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4 text-[#8b2500]" }), " Sample Excel"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => fileRef.current?.click(),
							className: "btn-luxury-primary px-4 py-2.5 text-xs gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "size-4" }), " Bulk Upload (.xlsx)"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setShowDeleteAllDialog(true),
							disabled: deleteAllStudents.isPending || studentList.length === 0,
							className: "btn-luxury-danger px-4 py-2.5 text-xs gap-2 disabled:opacity-50",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" }),
								" Delete All (",
								studentList.length,
								")"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							ref: fileRef,
							type: "file",
							accept: ".xlsx,.xls,.csv",
							className: "hidden",
							onChange: (e) => {
								const f = e.target.files?.[0];
								if (f) handleUpload(f);
							}
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "card-luxury p-6 md:p-8 space-y-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 border-b border-[#e5d8c5] pb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "size-9 rounded-2xl bg-gradient-to-tr from-[#8b2500] to-amber-600 flex items-center justify-center text-white shadow-md",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserPlus, { className: "size-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-serif font-bold text-[#4a1c14]",
						children: "Add New Student Record"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-[#7c533f]",
						children: "Register student profile with Smart NFC card and live biometrics"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "space-y-6",
					onSubmit: (e) => {
						e.preventDefault();
						addStudent.mutate(form);
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-4 sm:grid-cols-2 md:grid-cols-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "suid",
										className: "text-xs font-bold text-[#7c533f]",
										children: "SUID / GR No *"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "suid",
										required: true,
										placeholder: "e.g. 250392",
										value: form.suid,
										onChange: (e) => setForm({
											...form,
											suid: e.target.value
										}),
										className: "input-luxury h-10 px-3 font-mono text-sm font-semibold"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5 md:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "name",
										className: "text-xs font-bold text-[#7c533f]",
										children: "Full Student Name *"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "name",
										required: true,
										placeholder: "e.g. ZALODIYA DEEP SURESHBHAI",
										value: form.name,
										onChange: (e) => setForm({
											...form,
											name: e.target.value
										}),
										className: "input-luxury h-10 px-3 text-sm font-semibold uppercase"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "nfc_no",
										className: "text-xs font-bold text-[#7c533f]",
										children: "NFC Card UID *"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "nfc_no",
										required: true,
										placeholder: "e.g. 3667085316",
										value: form.nfc_no,
										onChange: (e) => setForm({
											...form,
											nfc_no: e.target.value
										}),
										className: "input-luxury h-10 px-3 font-mono text-sm font-semibold"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "class_name",
										className: "text-xs font-bold text-[#7c533f]",
										children: "Class / Std"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "class_name",
										placeholder: "e.g. GM 10 (Hostel)",
										value: form.class_name,
										onChange: (e) => setForm({
											...form,
											class_name: e.target.value
										}),
										className: "input-luxury h-10 px-3 text-sm"
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FingerprintEnroller, {
							fingers: newFingers,
							onChange: setNewFingers,
							nfcNo: form.nfc_no,
							suid: form.suid
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex justify-end pt-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "submit",
								disabled: addStudent.isPending,
								className: "btn-luxury-primary px-8 py-3 text-sm gap-2",
								children: [addStudent.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin mr-1.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "Save & Enrol Student"]
							})
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "card-luxury p-6 md:p-8 space-y-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-3 max-w-md w-full",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative w-full",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-4.5 absolute left-3.5 top-3 text-[#7c533f]/50" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								placeholder: "Search by SUID, Name, or NFC Card...",
								value: search,
								onChange: (e) => setSearch(e.target.value),
								className: "input-luxury pl-10 h-10 text-sm w-full"
							})]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#faf6ef] text-[#4a1c14] border border-[#d8c5af]",
						children: [
							"Total: ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "font-mono text-[#8b2500]",
								children: studentList.length
							}),
							" Students Enrolled"
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-[#e5d8c5] text-left text-xs uppercase tracking-wider text-[#7c533f] font-bold",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4",
									children: "SUID"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4",
									children: "Student Name"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4",
									children: "NFC Card"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4",
									children: "Class"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4",
									children: "Room"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4",
									children: "Biometrics"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4",
									children: "Card Active"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4 text-right",
									children: "Actions"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", {
							className: "divide-y divide-[#e5d8c5]/60 text-xs font-mono",
							children: [studentList.map((s) => {
								const fingerCount = toFingerRecords(s.fingerprints).length;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "table-row-luxury hover:bg-[#faf4eb]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4 font-bold text-[#8b2500]",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "px-2.5 py-1 rounded-lg bg-[#faf6ef] border border-[#d8c5af]",
												children: s.suid
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4 font-sans font-bold text-sm text-[#2c1810]",
											children: s.name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4 text-[#7c533f]",
											children: s.nfc_no
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4 font-sans text-[#4a1c14]",
											children: s.class_name ?? "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4 font-sans text-[#7c533f]",
											children: s.room_no ?? "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${fingerCount > 0 ? "bg-emerald-500/15 text-emerald-800 border border-emerald-500/30" : "bg-amber-500/15 text-amber-800 border border-amber-500/30"}`,
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FingerprintPattern, { className: "size-3.5" }),
													fingerCount,
													"/",
													6,
													" Enrolled"
												]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
													checked: !s.blocked,
													onCheckedChange: (active) => toggleBlock.mutate({
														id: s.id,
														blocked: !active
													})
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `text-[10px] font-sans font-extrabold px-2.5 py-0.5 rounded-full border shadow-sm ${!s.blocked ? "bg-emerald-500/20 text-emerald-900 border-emerald-500/40" : "bg-rose-500/20 text-rose-900 border-rose-500/40"}`,
													children: !s.blocked ? "ACTIVE" : "BLOCKED"
												})]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4 text-right",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-end gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => openEdit(s),
													className: "btn-luxury-secondary px-3 py-1.5 text-xs gap-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "size-3.5 text-amber-700" }), " Edit"]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => setDeleteId(s.id),
													disabled: deleteStudent.isPending,
													className: "btn-luxury-danger px-3 py-1.5 text-xs gap-1",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" })
												})]
											})
										})
									]
								}, s.id);
							}), studentList.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								colSpan: 8,
								className: "py-12 text-center text-sm font-sans text-[#7c533f]",
								children: "No student records found. Add a student above or import an Excel file."
							}) })]
						})]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: editId !== null,
				onOpenChange: (open) => !open && setEditId(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-2xl bg-white border border-[#e5d8c5] shadow-2xl rounded-3xl p-6 md:p-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
						className: "text-2xl font-serif font-bold text-[#4a1c14] flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "size-6 text-[#8b2500]" }), " Edit Student Record"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
						className: "text-xs text-[#7c533f]",
						children: "Update SUID, name, smart card mapping, and enrolled fingerprints."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "space-y-5 py-3",
						onSubmit: (e) => {
							e.preventDefault();
							updateStudent.mutate();
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-4 sm:grid-cols-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "edit-suid",
											className: "text-xs font-bold text-[#7c533f]",
											children: "SUID *"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "edit-suid",
											required: true,
											value: editForm.suid,
											onChange: (e) => setEditForm({
												...editForm,
												suid: e.target.value
											}),
											className: "input-luxury h-10 font-mono text-sm font-semibold"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "edit-name",
											className: "text-xs font-bold text-[#7c533f]",
											children: "Student Name *"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "edit-name",
											required: true,
											value: editForm.name,
											onChange: (e) => setEditForm({
												...editForm,
												name: e.target.value
											}),
											className: "input-luxury h-10 text-sm font-semibold uppercase"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "edit-nfc",
											className: "text-xs font-bold text-[#7c533f]",
											children: "NFC Card UID *"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "edit-nfc",
											required: true,
											value: editForm.nfc_no,
											onChange: (e) => setEditForm({
												...editForm,
												nfc_no: e.target.value
											}),
											className: "input-luxury h-10 font-mono text-sm font-semibold"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "edit-class",
											className: "text-xs font-bold text-[#7c533f]",
											children: "Class"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "edit-class",
											value: editForm.class_name,
											onChange: (e) => setEditForm({
												...editForm,
												class_name: e.target.value
											}),
											className: "input-luxury h-10 text-sm"
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FingerprintEnroller, {
								fingers: editFingers,
								onChange: setEditFingers,
								nfcNo: editForm.nfc_no,
								suid: editForm.suid
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
								className: "gap-2 pt-4 border-t border-[#e5d8c5]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setEditId(null),
									className: "btn-luxury-secondary px-5 py-2.5 text-xs",
									children: "Cancel"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "submit",
									disabled: updateStudent.isPending,
									className: "btn-luxury-primary px-6 py-2.5 text-xs gap-2",
									children: [updateStudent.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : null, "Save Changes"]
								})]
							})
						]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: deleteId !== null,
				onOpenChange: (open) => !open && setDeleteId(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, {
					className: "bg-white border border-[#e5d8c5] shadow-2xl rounded-3xl p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogTitle, {
						className: "text-xl font-serif font-bold text-rose-700 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-5" }), " Delete Student Record?"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, {
						className: "text-sm text-[#7c533f]",
						children: "The student profile, card mapping and enrolled fingerprints will be permanently removed from the active database. Past transaction logs are preserved in reports."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, {
						className: "gap-2 pt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, {
							className: "btn-luxury-secondary px-4 py-2 text-xs",
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
							className: "btn-luxury-danger px-4 py-2 text-xs",
							onClick: () => deleteId && deleteStudent.mutate(deleteId),
							children: "Confirm Delete"
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: showDeleteAllDialog,
				onOpenChange: setShowDeleteAllDialog,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, {
					className: "bg-white border border-[#e5d8c5] shadow-2xl rounded-3xl p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogTitle, {
						className: "text-xl font-serif font-bold text-rose-700 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "size-6 text-rose-600" }), " Format All Students?"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, {
						className: "text-sm text-[#7c533f]",
						children: [
							"This will permanently delete all (",
							studentList.length,
							") student records, smart cards and enrolled fingerprints.",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-rose-700 font-bold",
								children: "Caution: This action cannot be reversed."
							})
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, {
						className: "gap-2 pt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, {
							className: "btn-luxury-secondary px-4 py-2 text-xs",
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
							className: "btn-luxury-danger px-4 py-2 text-xs",
							onClick: () => deleteAllStudents.mutate(),
							children: "Yes, Delete All"
						})]
					})]
				})
			})
		]
	});
}
function FingerprintEnroller({ fingers, onChange, nfcNo, suid }) {
	const [scanning, setScanning] = (0, import_react.useState)(false);
	const { device, checking, isConnected } = useMantraDevice(3e3);
	const full = fingers.length >= 6;
	async function handleStartScan() {
		if (!isConnected) {
			toast.error("Mantra MFS110 scanner is not connected. Please connect USB cable.");
			return;
		}
		if (full) {
			toast.error(`Maximum limit of 6 fingerprints reached.`);
			return;
		}
		setScanning(true);
		try {
			const res = await captureFinger(60, 10);
			if (!res.ok) {
				toast.error(res.error);
				return;
			}
			if (fingers.some((f) => f.template === res.template)) {
				toast.error("This fingerprint is already enrolled for this student.");
				return;
			}
			const fingerLabel = `Finger ${fingers.length + 1}`;
			onChange([...fingers, {
				finger: fingerLabel,
				template: res.template,
				quality: res.quality,
				serial: res.serial,
				nfc_no: nfcNo,
				suid,
				enrolled_at: (/* @__PURE__ */ new Date()).toISOString()
			}]);
			toast.success(`${fingerLabel} captured successfully (Quality: ${res.quality}%)`);
		} finally {
			setScanning(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border-1.5 border-[#e5d8c5] bg-[#faf6ef] p-4 space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "flex items-center gap-2 text-xs font-bold text-[#4a1c14]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FingerprintPattern, { className: "size-4 text-[#8b2500]" }), " Biometric Enrollment (Mantra MFS110)"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3 text-xs",
				children: [checking && device === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[#7c533f] font-medium border border-[#d8c5af]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-3 animate-spin" }), " Checking scanner..."]
				}) : isConnected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 font-bold text-emerald-800 text-[11px]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2 rounded-full bg-emerald-500 animate-pulse" }),
						"Connected (Mantra ",
						device?.model ?? "MFS110",
						device?.serial ? ` · S/N: ${device.serial}` : "",
						")"
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 font-bold text-rose-800 text-[11px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2 rounded-full bg-rose-500" }), "Scanner Offline (Mantra MFS110)"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "font-bold text-[#7c533f] text-xs",
					children: [
						fingers.length,
						" of ",
						6,
						" Enrolled"
					]
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-2.5 pt-1",
			children: [
				fingers.map((f, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-[#8b2500] shadow-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FingerprintPattern, { className: "size-4 text-[#8b2500] shrink-0" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: f.finger || `Finger ${idx + 1}` }),
						f.quality > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[10px] opacity-75 font-mono",
							children: [
								"Q:",
								f.quality,
								"%"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": `Remove ${f.finger}`,
							onClick: () => onChange(fingers.filter((_, i) => i !== idx)),
							className: "ml-1 text-[#8b2500]/60 transition-colors hover:text-rose-600 hover:scale-125",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-3.5" })
						})
					]
				}, idx)),
				!full && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: handleStartScan,
					disabled: scanning || !isConnected,
					className: "btn-luxury-primary px-4 py-2 text-xs gap-2 shadow-sm",
					children: scanning ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin text-amber-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Place Finger on Mantra Scanner..." })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FingerprintPattern, { className: "size-4" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Add Finger" })
					] })
				}),
				fingers.length === 0 && !scanning && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-[#7c533f] italic py-1 pl-1",
					children: "Click \"+ Add Finger\" to scan and enrol student fingerprint."
				})
			]
		})]
	});
}
//#endregion
export { StudentsPage as component };
