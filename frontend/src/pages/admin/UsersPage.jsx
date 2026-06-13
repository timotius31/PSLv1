import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client.js";
import { useAuth } from "../../components/AuthContext.jsx";

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", fullName: "", role: "student", classId: "" });

  async function load() {
    const [userData, classData] = await Promise.all([api("/api/admin/users"), api("/api/admin/classes")]);
    setUsers(userData);
    setClasses(classData);
    setForm((current) => ({ ...current, classId: current.classId || classData[0]?.id || "" }));
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

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Users</h2>
        <p className="text-slate-600">Create usernames and passwords, then assign students to one class.</p>
      </div>

      <form onSubmit={submit} className="grid gap-3 border border-line bg-white p-4 md:grid-cols-5">
        <Input label="Username" value={form.username} onChange={(username) => setForm({ ...form, username })} />
        <Input label="Password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
        <Input label="Full name" value={form.fullName} onChange={(fullName) => setForm({ ...form, fullName })} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Role</span>
          <select className="focus-ring w-full rounded border border-line px-3 py-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="student">Student</option>
            {user?.role === "superadmin" && <option value="admin">Admin</option>}
            {user?.role === "superadmin" && <option value="superadmin">Superadmin</option>}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Class</span>
          <select className="focus-ring w-full rounded border border-line px-3 py-2" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} disabled={form.role !== "student"}>
            {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}
          </select>
        </label>
        <button className="focus-ring inline-flex items-center justify-center gap-2 rounded bg-ink px-4 py-2 text-white md:col-span-5">
          <Plus size={17} /> Create user
        </button>
      </form>

      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-line bg-slate-50">
            <tr>
              <th className="p-3">Username</th>
              <th className="p-3">Name</th>
              <th className="p-3">Role</th>
              <th className="p-3">Class</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-line">
                <td className="p-3 font-medium">{user.username}</td>
                <td className="p-3">{user.full_name}</td>
                <td className="p-3">{user.role}</td>
                <td className="p-3">{user.class_name || "-"}</td>
                <td className="p-3">{user.is_active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input className="focus-ring w-full rounded border border-line px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} required />
    </label>
  );
}
