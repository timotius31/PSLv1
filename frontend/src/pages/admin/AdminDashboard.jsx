import { BookOpen, ClipboardCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    Promise.all([api("/api/admin/overview"), api("/api/admin/settings")]).then(([overviewData, settingsData]) => {
      setOverview(overviewData);
      setSettings(settingsData);
    });
  }, []);

  async function toggleSeek() {
    const next = !Boolean(settings.allow_forward_seek);
    await api("/api/admin/settings/allow_forward_seek", {
      method: "PATCH",
      body: JSON.stringify({ value: next })
    });
    setSettings({ ...settings, allow_forward_seek: next });
  }

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Administrator</h2>
        <p className="text-slate-600">Manage users, class access, lessons, and grading.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={<Users />} label="Students" value={overview?.students ?? "-"} />
        <Metric icon={<BookOpen />} label="Classes" value={overview?.classes ?? "-"} />
        <Metric icon={<ClipboardCheck />} label="Pending answers" value={overview?.pendingAnswers ?? "-"} />
      </div>

      <div className="border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Video forward seeking</h3>
            <p className="text-sm text-slate-600">Keep disabled for strict lesson progression.</p>
          </div>
          <button
            className={`focus-ring rounded px-4 py-2 text-sm font-medium ${
              settings.allow_forward_seek ? "bg-clay text-white" : "bg-ink text-white"
            }`}
            onClick={toggleSeek}
          >
            {settings.allow_forward_seek ? "Allowed" : "Blocked"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="border border-line bg-white p-4">
      <div className="mb-3 text-moss">{icon}</div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
