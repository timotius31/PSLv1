import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

export default function AnswersPage() {
  const [answers, setAnswers] = useState([]);
  const [drafts, setDrafts] = useState({});

  async function load() {
    setAnswers(await api("/api/admin/answers"));
  }

  useEffect(() => {
    load();
  }, []);

  async function grade(id) {
    const draft = drafts[id] || {};
    await api(`/api/admin/answers/${id}/grade`, {
      method: "PATCH",
      body: JSON.stringify({ score: draft.score, feedback: draft.feedback })
    });
    load();
  }

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Essay grading</h2>
        <p className="text-slate-600">Review submitted essay quiz answers and add scores later.</p>
      </div>

      <div className="grid gap-4">
        {answers.map((answer) => (
          <article key={answer.id} className="border border-line bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{answer.full_name} <span className="text-sm font-normal text-slate-500">({answer.username})</span></p>
                <p className="text-sm text-slate-600">{answer.class_name} / {answer.step_title}</p>
              </div>
              <span className="rounded bg-skyglass px-2 py-1 text-xs text-ink">
                {answer.score === null ? "Pending" : `Score ${answer.score}`}
              </span>
            </div>
            <p className="mb-4 whitespace-pre-wrap border-l-4 border-moss pl-3 text-slate-800">{answer.answer}</p>
            <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
              <input
                className="focus-ring rounded border border-line px-3 py-2"
                placeholder="Score"
                value={drafts[answer.id]?.score ?? answer.score ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [answer.id]: { ...drafts[answer.id], score: e.target.value } })}
              />
              <input
                className="focus-ring rounded border border-line px-3 py-2"
                placeholder="Feedback"
                value={drafts[answer.id]?.feedback ?? answer.feedback ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [answer.id]: { ...drafts[answer.id], feedback: e.target.value } })}
              />
              <button onClick={() => grade(answer.id)} className="focus-ring inline-flex items-center justify-center gap-2 rounded bg-ink px-4 py-2 text-white">
                <Save size={16} /> Save
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
