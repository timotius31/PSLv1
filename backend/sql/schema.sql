create extension if not exists pgcrypto;

do $$ begin
  create type user_role as enum ('superadmin', 'admin', 'student');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type lesson_step_type as enum ('title', 'text', 'video', 'quiz');
exception when duplicate_object then null;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  full_name text not null,
  role user_role not null default 'student',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null unique references classes(id) on delete cascade,
  weekday text not null default 'sun',
  start_time time not null default '16:00',
  end_time time not null default '23:59',
  is_manually_open boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  assigned_by uuid references users(id),
  is_active boolean not null default true,
  assigned_at timestamptz not null default now()
);

create unique index if not exists one_active_class_per_user
  on enrollments(user_id)
  where is_active = true;

create table if not exists lesson_steps (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  position int not null,
  title text not null,
  step_type lesson_step_type not null,
  content text,
  video_file_name text,
  video_quality text not null default '480p',
  quiz_prompt text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(class_id, position)
);

create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references lesson_steps(id) on delete cascade,
  position int not null,
  question text not null,
  created_at timestamptz not null default now(),
  unique(step_id, position)
);

create table if not exists student_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  step_id uuid not null references lesson_steps(id) on delete cascade,
  last_video_second int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, step_id)
);

create table if not exists essay_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  step_id uuid not null references lesson_steps(id) on delete cascade,
  question_id uuid references quiz_questions(id) on delete cascade,
  answer text not null,
  score numeric(5,2),
  feedback text,
  graded_by uuid references users(id),
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  unique(user_id, question_id)
);

create table if not exists refresh_tokens (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_lesson_steps_class_position
  on lesson_steps(class_id, position);

create index if not exists idx_progress_user_step
  on student_progress(user_id, step_id);

create index if not exists idx_quiz_questions_step_position
  on quiz_questions(step_id, position);
