import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client.js";
import { useAuth } from "../../components/AuthContext.jsx";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkClassId, setBulkClassId] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", fullName: "", role: "student", classId: "" });

  const studentIds = useMemo(() => users.filter((item) => item.role === "student").map((item) => item.id), [users]);

  async function load() {
    const [userData, classData] = await Promise.all([api("/api/admin/users"), api("/api/admin/classes")]);
    setUsers(userData);
    setClasses(classData);
    setForm((current) => ({ ...current, classId: current.classId || classData[0]?.id || "" }));
    setBulkClassId((current) => current || classData[0]?.id || "");
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event) {
    event.preventDefault();
    await api("/api/admin/users", { method: "POST", body: JSON.stringify(form) });
    setForm({ username: "", password: "", fullName: "", role: "student", classId: classes[0]?.id || "" });
    load();
  }

  async function saveEdit(event) {
    event.preventDefault();
    await api(`/api/admin/users/${editingUser.id}`, {
      method: "PATCH",
      body: JSON.stringify(editingUser)
    });
    setEditingUser(null);
    load();
  }

  async function deleteUser(userItem) {
    const confirmed = window.confirm(`Delete user "${userItem.username}"? This also removes their progress and answers.`);
    if (!confirmed) return;

    await api(`/api/admin/users/${userItem.id}`, { method: "DELETE" });
    setSelectedIds((ids) => ids.filter((id) => id !== userItem.id));
    load();
  }

  async function bulkAssign(event) {
    event.preventDefault();
    await api("/api/admin/users/bulk-assign-class", {
      method: "POST",
      body: JSON.stringify({ userIds: selectedIds, classId: bulkClassId })
    });
    setSelectedIds([]);
    load();
  }

  function toggleUser(id) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  function toggleAllStudents(checked) {
    setSelectedIds(checked ? studentIds : []);
  }

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Users</h2>
        <p className="text-slate-600">Create, edit, delete, and assign students to one active class.</p>
      </div>

      <form onSubmit={submit} className="grid gap-3 border border-line bg-white p-4 md:grid-cols-5">
        <Input label="Username" value={form.username} onChange={(username) => setForm({ ...form, username })} />
        <Input label="Password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
        <Input label="Full name" value={form.fullName} onChange={(fullName) => setForm({ ...form, fullName })} />
        <RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} currentUser={currentUser} />
        <ClassSelect value={form.classId} onChange={(classId) => setForm({ ...form, classId })} classes={classes} disabled={form.role !== "student"} />
        <button className="focus-ring inline-flex items-center justify-center gap-2 rounded bg-ink px-4 py-2 text-white md:col-span-5">
          <Plus size={17} /> Create user
        </button>
      </form>

      <form onSubmit={bulkAssign} className="flex flex-wrap items-end gap-3 border border-line bg-white p-4">
        <div>
          <p className="text-sm font-medium">Bulk assign selected students</p>
          <p className="text-xs text-slate-500">{selectedIds.length} selected</p>
        </div>
        <ClassSelect value={bulkClassId} onChange={setBulkClassId} classes={classes} />
        <button
          disabled={selectedIds.length === 0}
          className="focus-ring inline-flex items-center gap-2 rounded bg-moss px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UsersRound size={17} /> Assign class
        </button>
      </form>

      {editingUser && (
        <form onSubmit={saveEdit} className="grid gap-3 border border-ink bg-white p-4 md:grid-cols-5">
          <div className="md:col-span-5">
            <h3 className="font-semibold">Edit user</h3>
            <p className="text-sm text-slate-600">Leave password blank to keep the current password.</p>
          </div>
          <Input label="Username" value={editingUser.username} onChange={(username) => setEditingUser({ ...editingUser, username })} />
          <Input label="New password" value={editingUser.password || ""} onChange={(password) => setEditingUser({ ...editingUser, password })} required={false} />
          <Input label="Full name" value={editingUser.fullName} onChange={(fullName) => setEditingUser({ ...editingUser, fullName })} />
          <RoleSelect value={editingUser.role} onChange={(role) => setEditingUser({ ...editingUser, role })} currentUser={currentUser} />
          <ClassSelect value={editingUser.classId || ""} onChange={(classId) => setEditingUser({ ...editingUser, classId })} classes={classes} disabled={editingUser.role !== "student"} />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(editingUser.isActive)}
              onChange={(event) => setEditingUser({ ...editingUser, isActive: event.target.checked })}
            />
            Active
          </label>
          <div className="flex gap-2 md:col-span-4">
            <button className="focus-ring rounded bg-ink px-4 py-2 text-white">Save changes</button>
            <button type="button" onClick={() => setEditingUser(null)} className="focus-ring rounded border border-line px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line bg-slate-50">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={studentIds.length > 0 && selectedIds.length === studentIds.length}
                  onChange={(event) => toggleAllStudents(event.target.checked)}
                />
              </th>
              <th className="p-3">Username</th>
              <th className="p-3">Name</th>
              <th className="p-3">Role</th>
              <th className="p-3">Class</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((userItem) => (
              <tr key={userItem.id} className="border-b border-line">
                <td className="p-3">
                  <input
                    type="checkbox"
                    disabled={userItem.role !== "student"}
                    checked={selectedIds.includes(userItem.id)}
                    onChange={() => toggleUser(userItem.id)}
                  />
                </td>
                <td className="p-3 font-medium">{userItem.username}</td>
                <td className="p-3">{userItem.full_name}</td>
                <td className="p-3">{userItem.role}</td>
                <td className="p-3">{userItem.class_name || "-"}</td>
                <td className="p-3">{userItem.is_active ? "Active" : "Inactive"}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingUser({
                          id: userItem.id,
                          username: userItem.username,
                          password: "",
                          fullName: userItem.full_name,
                          role: userItem.role,
                          classId: userItem.class_id || "",
                          isActive: userItem.is_active
                        })
                      }
                      className="focus-ring rounded border border-line p-2 hover:bg-slate-50"
                      title="Edit user"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteUser(userItem)}
                      className="focus-ring rounded border border-line p-2 text-clay hover:bg-red-50"
                      title="Delete user"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Input({ label, value, onChange, required = true }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input className="focus-ring w-full rounded border border-line px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </label>
  );
}

function RoleSelect({ value, onChange, currentUser }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">Role</span>
      <select className="focus-ring w-full rounded border border-line px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="student">Student</option>
        {currentUser?.role === "superadmin" && <option value="admin">Admin</option>}
        {currentUser?.role === "superadmin" && <option value="superadmin">Superadmin</option>}
      </select>
    </label>
  );
}

function ClassSelect({ value, onChange, classes, disabled = false }) {
  return (
    <label className="block min-w-44">
      <span className="mb-1 block text-sm font-medium">Class</span>
      <select className="focus-ring w-full rounded border border-line px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {classes.map((classItem) => (
          <option key={classItem.id} value={classItem.id}>
            {classItem.name}
          </option>
        ))}
      </select>
    </label>
  );
}
