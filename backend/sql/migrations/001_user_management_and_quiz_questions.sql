create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references lesson_steps(id) on delete cascade,
  position int not null,
  question text not null,
  created_at timestamptz not null default now(),
  unique(step_id, position)
);

alter table essay_answers
  add column if not exists question_id uuid references quiz_questions(id) on delete cascade;

alter table essay_answers
  drop constraint if exists essay_answers_user_id_step_id_key;

do $$ begin
  alter table essay_answers
    add constraint essay_answers_user_question_unique unique(user_id, question_id);
exception when duplicate_object then null;
end $$;

insert into quiz_questions (step_id, position, question)
select id, 1, quiz_prompt
from lesson_steps
where step_type = 'quiz'
  and quiz_prompt is not null
  and not exists (
    select 1 from quiz_questions where quiz_questions.step_id = lesson_steps.id
  );

update essay_answers
set question_id = quiz_questions.id
from quiz_questions
where essay_answers.step_id = quiz_questions.step_id
  and essay_answers.question_id is null
  and quiz_questions.position = 1;

create index if not exists idx_quiz_questions_step_position
  on quiz_questions(step_id, position);
