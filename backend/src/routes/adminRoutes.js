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
            classes.name as class_name
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
  const { rows } = await query(
    "select * from lesson_steps where class_id = $1 order by position",
    [req.params.id]
  );
  res.json(rows);
});

adminRoutes.post("/classes/:id/steps", async (req, res) => {
  const { title, stepType, content, videoFileName, videoQuality = "480p", quizPrompt } = req.body;
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

  res.status(201).json(rows[0]);
});

adminRoutes.get("/answers", async (_req, res) => {
  const { rows } = await query(
    `select essay_answers.*, users.username, users.full_name, lesson_steps.title as step_title,
            classes.name as class_name
     from essay_answers
     join users on users.id = essay_answers.user_id
     join lesson_steps on lesson_steps.id = essay_answers.step_id
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
