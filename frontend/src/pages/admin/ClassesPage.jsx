import { Plus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [steps, setSteps] = useState([]);
  const [classForm, setClassForm] = useState({ name: "", description: "" });
  const [stepForm, setStepForm] = useState({
    title: "",
    stepType: "video",
    content: "",
    videoFileName: "",
    videoQuality: "480p",
    quizPrompt: ""
  });

  async function loadClasses() {
    const data = await api("/api/admin/classes");
    setClasses(data);
    setSelected((current) => current || data[0] || null);
  }

  async function loadSteps(classId) {
    if (!classId) return;
    setSteps(await api(`/api/admin/classes/${classId}/steps`));
  }

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadSteps(selected?.id);
  }, [selected?.id]);

  async function createClass(event) {
    event.preventDefault();
    await api("/api/admin/classes", { method: "POST", body: JSON.stringify(classForm) });
    setClassForm({ name: "", description: "" });
    loadClasses();
  }

  async function createStep(event) {
    event.preventDefault();
    await api(`/api/admin/classes/${selected.id}/steps`, { method: "POST", body: JSON.stringify(stepForm) });
    setStepForm({ title: "", stepType: "video", content: "", videoFileName: "", videoQuality: "480p", quizPrompt: "" });
    loadSteps(selected.id);
  }

  async function toggleManualOpen(classItem) {
    await api(`/api/admin/classes/${classItem.id}/schedule`, {
      method: "PATCH",
      body: JSON.stringify({ isManuallyOpen: !classItem.is_manually_open })
    });
    loadClasses();
  }

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Classes</h2>
        <p className="text-slate-600">Sunday access is set for 16:00-23:59 Asia/Makassar. Admin can reopen manually.</p>
      </div>

      <form onSubmit={createClass} className="grid gap-3 border border-line bg-white p-4 md:grid-cols-[1fr_2fr_auto]">
        <Input label="Class name" value={classForm.name} onChange={(name) => setClassForm({ ...classForm, name })} />
        <Input label="Description" value={classForm.description} onChange={(description) => setClassForm({ ...classForm, description })} />
        <button className="focus-ring mt-6 inline-flex items-center justify-center gap-2 rounded bg-ink px-4 py-2 text-white">
          <Plus size={17} /> Add
        </button>
      </form>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="grid h-fit gap-2">
          {classes.map((classItem) => (
            <button
              key={classItem.id}
              onClick={() => setSelected(classItem)}
              className={`focus-ring rounded border p-3 text-left ${
                selected?.id === classItem.id ? "border-ink bg-white" : "border-line bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{classItem.name}</span>
                <span className="text-xs text-slate-500">{classItem.weekday} {classItem.start_time?.slice(0, 5)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{classItem.description}</p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleManualOpen(classItem);
                }}
                className="focus-ring mt-3 inline-flex items-center gap-2 rounded border border-line px-3 py-1.5 text-xs"
              >
                <RefreshCw size={14} /> {classItem.is_manually_open ? "Manual open" : "Schedule only"}
              </button>
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          <div className="border border-line bg-white p-4">
            <h3 className="mb-3 font-semibold">Add lesson step</h3>
            <form onSubmit={createStep} className="grid gap-3 md:grid-cols-2">
              <Input label="Title" value={stepForm.title} onChange={(title) => setStepForm({ ...stepForm, title })} />
              <label>
                <span className="mb-1 block text-sm font-medium">Type</span>
                <select className="focus-ring w-full rounded border border-line px-3 py-2" value={stepForm.stepType} onChange={(e) => setStepForm({ ...stepForm, stepType: e.target.value })}>
                  <option value="title">Title</option>
                  <option value="text">Text</option>
                  <option value="video">Video</option>
                  <option value="quiz">Essay Quiz</option>
                </select>
              </label>
              <Input label="Video filename" value={stepForm.videoFileName} onChange={(videoFileName) => setStepForm({ ...stepForm, videoFileName })} />
              <label>
                <span className="mb-1 block text-sm font-medium">Quality folder</span>
                <select className="focus-ring w-full rounded border border-line px-3 py-2" value={stepForm.videoQuality} onChange={(e) => setStepForm({ ...stepForm, videoQuality: e.target.value })}>
                  <option value="480p">480p</option>
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                </select>
              </label>
              <Textarea label="Text content" value={stepForm.content} onChange={(content) => setStepForm({ ...stepForm, content })} />
              <Textarea label="Quiz prompt" value={stepForm.quizPrompt} onChange={(quizPrompt) => setStepForm({ ...stepForm, quizPrompt })} />
              <button className="focus-ring rounded bg-ink px-4 py-2 text-white md:col-span-2">Create step</button>
            </form>
          </div>

          <div className="border border-line bg-white">
            <div className="border-b border-line p-4">
              <h3 className="font-semibold">{selected?.name || "Class"} sequence</h3>
            </div>
            {steps.map((step) => (
              <div key={step.id} className="grid gap-1 border-b border-line p-4 md:grid-cols-[48px_1fr_120px]">
                <span className="text-sm text-slate-500">#{step.position}</span>
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="text-sm text-slate-600">{step.video_file_name || step.quiz_prompt || step.content || ""}</p>
                </div>
                <span className="text-sm capitalize text-slate-600">{step.step_type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input className="focus-ring w-full rounded border border-line px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} required={label !== "Description" && label !== "Video filename"} />
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <textarea className="focus-ring min-h-24 w-full rounded border border-line px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
