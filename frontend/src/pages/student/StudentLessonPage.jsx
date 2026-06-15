import { CheckCircle2, Lock, PlayCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, videoUrl } from "../../api/client.js";

export default function StudentLessonPage() {
  const [data, setData] = useState({ class: null, steps: [], locked: true });
  const [settings, setSettings] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);

  async function load() {
    const [classData, settingsData] = await Promise.all([
      api("/api/student/current-class"),
      api("/api/student/settings")
    ]);
    setData(classData);
    setSettings(settingsData);
    const firstUnlockedIncomplete = classData.steps.findIndex((step) => step.unlocked && !step.completed_at);
    setActiveIndex(firstUnlockedIncomplete >= 0 ? firstUnlockedIncomplete : 0);
  }

  useEffect(() => {
    load();
  }, []);

  const activeStep = data.steps[activeIndex];
  const completedCount = useMemo(() => data.steps.filter((step) => step.completed_at).length, [data.steps]);

  if (data.locked) {
    return (
      <section className="border border-line bg-white p-6">
        <Lock className="mb-4 text-clay" />
        <h2 className="text-2xl font-semibold">{data.class?.name || "Class"} is locked</h2>
        <p className="mt-2 text-slate-600">This class opens every Sunday from 16:00 to 23:59 Indonesia central time, unless admin opens it manually.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-semibold">{data.class?.name}</h2>
        <p className="text-slate-600">{completedCount} of {data.steps.length} steps completed</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="grid h-fit gap-2">
          {data.steps.map((step, index) => (
            <button
              key={step.id}
              disabled={!step.unlocked}
              onClick={() => step.unlocked && setActiveIndex(index)}
              className={`focus-ring rounded border p-3 text-left ${
                index === activeIndex ? "border-ink bg-white" : "border-line bg-white"
              } ${step.unlocked ? "hover:bg-slate-50" : "cursor-not-allowed opacity-60"}`}
            >
              <div className="flex items-center gap-2">
                {step.completed_at ? <CheckCircle2 size={17} className="text-moss" /> : step.unlocked ? <PlayCircle size={17} /> : <Lock size={17} />}
                <span className="text-sm font-medium">{step.title}</span>
              </div>
              <p className="mt-1 text-xs capitalize text-slate-500">{step.step_type}</p>
            </button>
          ))}
        </aside>

        {activeStep && (
          <LessonStep
            step={activeStep}
            settings={settings}
            onCompleted={load}
            onNext={() => setActiveIndex((index) => Math.min(index + 1, data.steps.length - 1))}
          />
        )}
      </div>
    </section>
  );
}

function LessonStep({ step, settings, onCompleted, onNext }) {
  if (step.step_type === "video") {
    return <VideoStep step={step} settings={settings} onCompleted={onCompleted} />;
  }

  if (step.step_type === "quiz") {
    return <QuizStep step={step} onCompleted={onCompleted} />;
  }

  return (
    <article className="border border-line bg-white p-6">
      <h3 className="text-xl font-semibold">{step.title}</h3>
      <p className="mt-4 whitespace-pre-wrap text-slate-700">{step.content}</p>
      {!step.completed_at && (
        <button
          className="focus-ring mt-6 rounded bg-ink px-4 py-2 text-white"
          onClick={async () => {
            await api(`/api/student/steps/${step.id}/complete`, { method: "POST", body: JSON.stringify({}) });
            await onCompleted();
            onNext();
          }}
        >
          Next
        </button>
      )}
    </article>
  );
}

function VideoStep({ step, settings, onCompleted }) {
  const videoRef = useRef(null);
  const maxWatchedRef = useRef(0);
  const [error, setError] = useState("");
  const allowForwardSeek = Boolean(settings.allow_forward_seek);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function pauseWhenHidden() {
      if (document.hidden) video.pause();
    }

    function blockForwardSeek() {
      if (allowForwardSeek) return;
      if (video.currentTime > maxWatchedRef.current + 1.5) {
        video.currentTime = maxWatchedRef.current;
      }
    }

    function updateProgress() {
      maxWatchedRef.current = Math.max(maxWatchedRef.current, video.currentTime);
    }

    document.addEventListener("visibilitychange", pauseWhenHidden);
    window.addEventListener("blur", pauseWhenHidden);
    video.addEventListener("seeking", blockForwardSeek);
    video.addEventListener("timeupdate", updateProgress);

    const interval = window.setInterval(() => {
      if (maxWatchedRef.current > 0) {
        api(`/api/student/steps/${step.id}/progress`, {
          method: "POST",
          body: JSON.stringify({ second: Math.floor(maxWatchedRef.current) })
        }).catch(() => {});
      }
    }, 8000);

    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      window.removeEventListener("blur", pauseWhenHidden);
      video.removeEventListener("seeking", blockForwardSeek);
      video.removeEventListener("timeupdate", updateProgress);
      window.clearInterval(interval);
    };
  }, [step.id, allowForwardSeek]);

  async function complete() {
    await api(`/api/student/steps/${step.id}/complete`, {
      method: "POST",
      body: JSON.stringify({ lastVideoSecond: Math.floor(maxWatchedRef.current) })
    });
    onCompleted();
  }

  return (
    <article className="border border-line bg-white p-4">
      <h3 className="mb-3 text-xl font-semibold">{step.title}</h3>
      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <video
        ref={videoRef}
        className="aspect-video w-full bg-black"
        controls
        controlsList="nodownload noplaybackrate"
        src={videoUrl(step.id)}
        onError={() => setError("Video file is missing or cannot be loaded. If an error happens during a real lesson, the user starts this video again.")}
        onEnded={complete}
        crossOrigin="use-credentials"
        onLoadedMetadata={(event) => {
          event.currentTarget.currentTime = Math.min(step.last_video_second || 0, 3);
        }}
      >
        <source src={videoUrl(step.id)} type="video/mp4" />
      </video>
      <p className="mt-3 text-sm text-slate-600">Forward seeking is {allowForwardSeek ? "allowed" : "blocked"}. The video pauses when this window loses focus.</p>
    </article>
  );
}

function QuizStep({ step, onCompleted }) {
  const [answer, setAnswer] = useState({});
  const [error, setError] = useState("");
  const questions = step.questions?.length ? step.questions : [{ id: "legacy", question: step.quiz_prompt }];

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await api(`/api/student/steps/${step.id}/answer`, {
        method: "POST",
        body: JSON.stringify({
          answers: questions.map((question) => ({
            questionId: question.id,
            answer: answer[question.id] || ""
          }))
        })
      });
      onCompleted();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <article className="border border-line bg-white p-6">
      <h3 className="text-xl font-semibold">{step.title}</h3>
      {step.has_answers ? (
        <p className="mt-6 rounded bg-skyglass px-3 py-2 text-sm">Answer submitted. The next step is unlocked.</p>
      ) : (
        <form onSubmit={submit} className="mt-5 grid gap-3">
          {questions.map((question, index) => (
            <label key={question.id} className="grid gap-2">
              <span className="text-sm font-medium">Question {index + 1}: {question.question}</span>
              <textarea
                className="focus-ring min-h-32 rounded border border-line px-3 py-2"
                value={answer[question.id] || ""}
                onChange={(event) => setAnswer({ ...answer, [question.id]: event.target.value })}
                required
              />
            </label>
          ))}
          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button className="focus-ring rounded bg-ink px-4 py-2 text-white">Submit answer</button>
        </form>
      )}
    </article>
  );
}
