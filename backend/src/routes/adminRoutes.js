import bcrypt from "bcryptjs";
import express from "express";
import { query } from "../db.js";
import { authRequired, requireRole } from "../middleware/authRequired.js";

export const adminRoutes = express.Router();

adminRoutes.use(authRequired, requireRole("admin", "superadmin"));

adminRoutes.get("/overview", async (_req, res) => {
  const [users, classes, pendingAnswers] = await Promise.all([
    query("select count(*)::int as count from users where role = 'student'"),
    query("select count(*)::int as count from classes"),
    query("select count(*)::int as count from essay_answers where score is null")
  ]);

  res.json({
    students: users.rows[0].count,
    classes: classes.rows[0].count,
    pendingAnswers: pendingAnswers.rows[0].count
  });
});

adminRoutes.get("/users", async (_req, res) => {
  const { rows } = await query(
    `select users.id, users.username, users.full_name, users.role, users.is_active,
            classes.id as class_id, classes.name as class_name
     from users
     left join enrollments on enrollments.user_id = users.id and enrollments.is_active = true
     left join classes on classes.id = enrollments.class_id
     order by users.created_at desc`
  );
  res.json(rows);
});

adminRoutes.post("/users", async (req, res) => {
  const { username, password, fullName, role = "student", classId } = req.body;

  if ((role === "admin" || role === "superadmin") && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Only superadmin can create elevated users" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { rows } = await query(
    `insert into users (username, password_hash, full_name, role)
     values ($1, $2, $3, $4)
     returning id, username, full_name, role`,
    [username, passwordHash, fullName, role]
  );

  if (role === "student" && classId) {
    await query(
      "insert into enrollments (user_id, class_id, assigned_by) values ($1, $2, $3)",
      [rows[0].id, classId, req.user.sub]
    );
  }

  res.status(201).json(rows[0]);
});

adminRoutes.patch("/users/:id", async (req, res) => {
  const { username, password, fullName, role, classId, isActive } = req.body;
  const existing = await query("select * from users where id = $1", [req.params.id]);
  const user = existing.rows[0];

  if (!user) return res.status(404).json({ message: "User not found" });

  if (req.user.role !== "superadmin" && (role === "admin" || role === "superadmin")) {
    return res.status(403).json({ message: "Only superadmin can assign elevated roles" });
  }

  if (req.user.role !== "superadmin" && (user.role === "admin" || user.role === "superadmin")) {
    return res.status(403).json({ message: "Only superadmin can edit elevated users" });
  }

  const passwordHash = password ? await bcrypt.hash(password, 12) : null;
  const updated = await query(
    `update users
     set username = coalesce($2, username),
         password_hash = coalesce($3, password_hash),
         full_name = coalesce($4, full_name),
         role = coalesce($5::user_role, role),
         is_active = coalesce($6, is_active),
         updated_at = now()
     where id = $1
     returning id, username, full_name, role, is_active`,
    [req.params.id, username || null, passwordHash, fullName || null, role || null, isActive]
  );

  if ((role || user.role) === "student" && classId) {
    await assignUserToClass(req.params.id, classId, req.user.sub);
  }

  res.json(updated.rows[0]);
});

adminRoutes.delete("/users/:id", async (req, res) => {
  if (req.params.id === req.user.sub) {
    return res.status(400).json({ message: "You cannot delete your own account" });
  }

  const existing = await query("select role from users where id = $1", [req.params.id]);
  const user = existing.rows[0];
  if (!user) return res.status(404).json({ message: "User not found" });

  if (req.user.role !== "superadmin" && (user.role === "admin" || user.role === "superadmin")) {
    return res.status(403).json({ message: "Only superadmin can delete elevated users" });
  }

  await query("delete from users where id = $1", [req.params.id]);
  res.json({ ok: true });
});

adminRoutes.post("/users/bulk-assign-class", async (req, res) => {
  const { userIds, classId } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: "Choose at least one user" });
  }

  const eligible = await query(
    "select id from users where id = any($1::uuid[]) and role = 'student'",
    [userIds]
  );

  for (const row of eligible.rows) {
    await assignUserToClass(row.id, classId, req.user.sub);
  }

  res.json({ assigned: eligible.rows.length });
});

adminRoutes.get("/classes", async (_req, res) => {
  const { rows } = await query(
    `select classes.*, class_schedules.weekday, class_schedules.start_time,
            class_schedules.end_time, class_schedules.is_manually_open
     from classes
     left join class_schedules on class_schedules.class_id = classes.id
     order by classes.name`
  );
  res.json(rows);
});

adminRoutes.post("/classes", async (req, res) => {
  const { name, description } = req.body;
  const { rows } = await query(
    "insert into classes (name, description) values ($1, $2) returning *",
    [name, description || null]
  );

  await query(
    `insert into class_schedules (class_id, weekday, start_time, end_time)
     values ($1, 'sun', '16:00', '23:59')`,
    [rows[0].id]
  );

  res.status(201).json(rows[0]);
});

adminRoutes.patch("/classes/:id/schedule", async (req, res) => {
  const { weekday, startTime, endTime, isManuallyOpen } = req.body;
  const { rows } = await query(
    `update class_schedules
     set weekday = coalesce($2, weekday),
         start_time = coalesce($3, start_time),
         end_time = coalesce($4, end_time),
         is_manually_open = coalesce($5, is_manually_open)
     where class_id = $1
     returning *`,
    [req.params.id, weekday, startTime, endTime, isManuallyOpen]
  );

  res.json(rows[0]);
});

adminRoutes.get("/classes/:id/steps", async (req, res) => {
  const steps = await query(
    "select * from lesson_steps where class_id = $1 order by position",
    [req.params.id]
  );
  const questions = await query(
    `select quiz_questions.*
     from quiz_questions
     join lesson_steps on lesson_steps.id = quiz_questions.step_id
     where lesson_steps.class_id = $1
     order by quiz_questions.step_id, quiz_questions.position`,
    [req.params.id]
  );

  const grouped = questions.rows.reduce((acc, question) => {
    acc[question.step_id] = [...(acc[question.step_id] || []), question];
    return acc;
  }, {});

  res.json(steps.rows.map((step) => ({ ...step, questions: grouped[step.id] || [] })));
});

adminRoutes.post("/classes/:id/steps", async (req, res) => {
  const { title, stepType, content, videoFileName, videoQuality = "480p", quizPrompt, quizQuestions = [] } = req.body;
  const nextPosition = await query(
    "select coalesce(max(position), 0) + 1 as position from lesson_steps where class_id = $1",
    [req.params.id]
  );

  const { rows } = await query(
    `insert into lesson_steps
       (class_id, position, title, step_type, content, video_file_name, video_quality, quiz_prompt)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning *`,
    [
      req.params.id,
      nextPosition.rows[0].position,
      title,
      stepType,
      content || null,
      videoFileName || null,
      videoQuality,
      quizPrompt || null
    ]
  );

  const questions = Array.isArray(quizQuestions)
    ? quizQuestions.map((question) => String(question).trim()).filter(Boolean)
    : [];

  if (stepType === "quiz") {
    const finalQuestions = questions.length > 0 ? questions : [quizPrompt].filter(Boolean);
    for (const [index, question] of finalQuestions.entries()) {
      await query(
        `insert into quiz_questions (step_id, position, question)
         values ($1, $2, $3)`,
        [rows[0].id, index + 1, question]
      );
    }
  }

  res.status(201).json(rows[0]);
});

adminRoutes.get("/answers", async (_req, res) => {
  const { rows } = await query(
    `select essay_answers.*, users.username, users.full_name, lesson_steps.title as step_title,
            quiz_questions.question, quiz_questions.position as question_position,
            classes.name as class_name
     from essay_answers
     join users on users.id = essay_answers.user_id
     join lesson_steps on lesson_steps.id = essay_answers.step_id
     left join quiz_questions on quiz_questions.id = essay_answers.question_id
     join classes on classes.id = lesson_steps.class_id
     order by essay_answers.submitted_at desc`
  );
  res.json(rows);
});

adminRoutes.patch("/answers/:id/grade", async (req, res) => {
  const { score, feedback } = req.body;
  const { rows } = await query(
    `update essay_answers
     set score = $2, feedback = $3, graded_by = $4, graded_at = now()
     where id = $1
     returning *`,
    [req.params.id, score, feedback || null, req.user.sub]
  );
  res.json(rows[0]);
});

async function assignUserToClass(userId, classId, assignedBy) {
  await query("update enrollments set is_active = false where user_id = $1 and is_active = true", [userId]);
  await query(
    "insert into enrollments (user_id, class_id, assigned_by) values ($1, $2, $3)",
    [userId, classId, assignedBy]
  );
}

adminRoutes.get("/settings", async (_req, res) => {
  const { rows } = await query("select key, value from app_settings order by key");
  res.json(Object.fromEntries(rows.map((row) => [row.key, row.value])));
});

adminRoutes.patch("/settings/:key", async (req, res) => {
  const { rows } = await query(
    `insert into app_settings (key, value)
     values ($1, $2)
     on conflict (key) do update set value = excluded.value
     returning *`,
    [req.params.key, req.body.value]
  );
  res.json(rows[0]);
});
