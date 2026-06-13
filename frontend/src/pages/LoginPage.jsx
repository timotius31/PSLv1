import { BookOpen } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const user = await login(form.username, form.password);
      navigate(user.role === "student" ? "/learn" : "/admin");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8f5] px-4">
      <form onSubmit={submit} className="w-full max-w-sm border border-line bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded bg-ink text-white">
            <BookOpen size={21} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Local LMS</p>
            <h1 className="text-xl font-semibold">Sign in</h1>
          </div>
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">Username</span>
          <input
            className="focus-ring w-full rounded border border-line px-3 py-2"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">Password</span>
          <input
            type="password"
            className="focus-ring w-full rounded border border-line px-3 py-2"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>

        {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button className="focus-ring w-full rounded bg-ink px-4 py-2 font-medium text-white hover:bg-slate-700">
          Login
        </button>
      </form>
    </main>
  );
}
