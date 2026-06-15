import express from "express";
import { isWithinWeeklyWindow } from "../time.js";
import { query } from "../db.js";
import { authRequired, requireRole } from "../middleware/authRequired.js";

export const studentRoutes = express.Router();

studentRoutes.use(authRequired, requireRole("student"));

studentRoutes.get("/current-class", async (req, res) => {
  const { rows } = await query(
    `select classes.*, class_schedules.weekday, class_schedules.start_time,
            class_schedules.end_time, class_schedules.is_manually_open
     from enrollments
     join classes on classes.id = enrollments.class_id
     left join class_schedules on class_schedules.class_id = classes.id
     where enrollments.user_id = $1 and enrollments.is_active = true
     limit 1`,
    [req.user.sub]
  );

  const currentClass = rows[0];
  if (!currentClass) return res.json({ class: null, steps: [], locked: true });

  const unlockedBySchedule = isWithinWeeklyWindow(currentClass);
  if (!unlockedBySchedule) {
    return res.json({ class: currentClass, steps: [], locked: true });
  }

  const steps = await query(
    `select lesson_steps.*,
            student_progress.completed_at,
            exists (
              select 1 from essay_answers
              where essay_answers.step_id = lesson_steps.id
                and essay_answers.user_id = $2
            ) as has_answers
     from lesson_steps
     left join student_progress
       on student_progress.step_id = lesson_steps.id and student_progress.user_id = $2
     where lesson_steps.class_id = $1
     order by lesson_steps.position`,
    [currentClass.id, req.user.sub]
  );

  const questions = await query(
    `select quiz_questions.*
     from quiz_questions
     join lesson_steps on lesson_steps.id = quiz_questions.step_id
     where lesson_steps.class_id = $1
     order by quiz_questions.step_id, quiz_questions.position`,
    [currentClass.id]
  );

  const grouped = questions.rows.reduce((acc, question) => {
    acc[question.step_id] = [...(acc[question.step_id] || []), question];
    return acc;
  }, {});

  const decorated = decorateUnlocks(
    steps.rows.map((step) => ({ ...step, questions: grouped[step.id] || [] }))
  );
  res.json({ class: currentClass, steps: decorated, locked: false });
});

studentRoutes.post("/steps/:id/complete", async (req, res) => {
  const step = await getAccessibleStep(req.user.sub, req.params.id);
  if (!step) return res.status(403).json({ message: "Step is locked or unavailable" });

  if (step.step_type === "quiz") {
    return res.status(400).json({ message: "Submit quiz answer to complete this step" });
  }

  const { rows } = await query(
    `insert into student_progress (user_id, step_id, completed_at, last_video_second)
     values ($1, $2, now(), coalesce($3, 0))
     on conflict (user_id, step_id)
     do update set completed_at = coalesce(student_progress.completed_at, now()),
                   last_video_second = greatest(student_progress.last_video_second, coalesce($3, 0))
     returning *`,
    [req.user.sub, req.params.id, req.body.lastVideoSecond || 0]
  );

  res.json(rows[0]);
});

studentRoutes.post("/steps/:id/progress", async (req, res) => {
  const step = await getAccessibleStep(req.user.sub, req.params.id);
  if (!step) return res.status(403).json({ message: "Step is locked or unavailable" });

  const { second } = req.body;
  const { rows } = await query(
    `insert into student_progress (user_id, step_id, last_video_second)
     values ($1, $2, $3)
     on conflict (user_id, step_id)
     do update set last_video_second = greatest(student_progress.last_video_second, $3)
     returning *`,
    [req.user.sub, req.params.id, Math.max(0, Number(second || 0))]
  );

  res.json(rows[0]);
});

studentRoutes.post("/steps/:id/answer", async (req, res) => {
  const step = await getAccessibleStep(req.user.sub, req.params.id);
  if (!step || step.step_type !== "quiz") {
    return res.status(403).json({ message: "Quiz is locked or unavailable" });
  }

  const questions = await query(
    "select * from quiz_questions where step_id = $1 order by position",
    [req.params.id]
  );

  const answers = Array.isArray(req.body.answers)
    ? req.body.answers
    : [{ questionId: questions.rows[0]?.id, answer: req.body.answer }];

  if (questions.rows.length === 0) {
    return res.status(400).json({ message: "Quiz has no questions" });
  }

  const answerMap = new Map(
    answers.map((item) => [item.questionId, String(item.answer || "").trim()])
  );

  const missing = questions.rows.find((question) => !answerMap.get(question.id));
  if (missing) {
    return res.status(400).json({ message: "All questions must be answered" });
  }

  const existing = await query(
    "select id from essay_answers where user_id = $1 and step_id = $2 limit 1",
    [req.user.sub, req.params.id]
  );

  if (existing.rows[0]) {
    return res.status(409).json({ message: "Answer already submitted" });
  }

  const savedAnswers = [];
  for (const question of questions.rows) {
    const saved = await query(
      `insert into essay_answers (user_id, step_id, question_id, answer)
       values ($1, $2, $3, $4)
       returning *`,
      [req.user.sub, req.params.id, question.id, answerMap.get(question.id)]
    );
    savedAnswers.push(saved.rows[0]);
  }

  await query(
    `insert into student_progress (user_id, step_id, completed_at)
     values ($1, $2, now())
     on conflict (user_id, step_id)
     do update set completed_at = coalesce(student_progress.completed_at, now())`,
    [req.user.sub, req.params.id]
  );

  res.status(201).json({ answers: savedAnswers });
});

studentRoutes.get("/settings", async (_req, res) => {
  const { rows } = await query("select key, value from app_settings");
  res.json(Object.fromEntries(rows.map((row) => [row.key, row.value])));
});

function decorateUnlocks(steps) {
  let previousComplete = true;

  return steps.map((step) => {
    const unlocked = previousComplete;
    previousComplete = Boolean(step.completed_at);
    return { ...step, unlocked };
  });
}

async function getAccessibleStep(userId, stepId) {
  const classResult = await query(
    `select lesson_steps.*, class_schedules.weekday, class_schedules.start_time,
            class_schedules.end_time, class_schedules.is_manually_open
     from lesson_steps
     join enrollments on enrollments.class_id = lesson_steps.class_id
     left join class_schedules on class_schedules.class_id = lesson_steps.class_id
     where lesson_steps.id = $1
       and enrollments.user_id = $2
       and enrollments.is_active = true`,
    [stepId, userId]
  );

  const step = classResult.rows[0];
  if (!step || !isWithinWeeklyWindow(step)) return null;

  const previous = await query(
    `select previous.id, student_progress.completed_at
     from lesson_steps current
     join lesson_steps previous
       on previous.class_id = current.class_id
      and previous.position < current.position
     left join student_progress
       on student_progress.step_id = previous.id and student_progress.user_id = $2
     where current.id = $1
     order by previous.position desc
     limit 1`,
    [stepId, userId]
  );

  if (previous.rows[0] && !previous.rows[0].completed_at) return null;
  return step;
}
