insert into users (username, password_hash, full_name, role)
values
  ('superadmin', '$2a$12$sWM1qh6eCWJqtmuQjjhN6eo.Gpla341G0MWPsYHpLorA1Dsvg3taW', 'Super Administrator', 'superadmin'),
  ('admin', '$2a$12$8XdKXqIozjh95Fir70ohLefE3q16ARxjH8NMcRDgCM8PBe5Zn04q6', 'Class Administrator', 'admin'),
  ('plant_user', '$2a$12$sz4zJr43fWR5fkGc/UPMKuto0vtl4KSzwCry2XhtxyFTMgA54WV72', 'Plant Student', 'student')
on conflict (username) do nothing;

insert into classes (name, description)
values
  ('Plant', 'Foundational learning season.'),
  ('Serve', 'Service and practice learning season.'),
  ('Lead', 'Leadership learning season.')
on conflict (name) do nothing;

insert into class_schedules (class_id, weekday, start_time, end_time)
select id, 'sun', '16:00', '23:59'
from classes
on conflict (class_id) do nothing;

insert into enrollments (user_id, class_id, assigned_by)
select student.id, class.id, admin.id
from users student
cross join classes class
cross join users admin
where student.username = 'plant_user'
  and class.name = 'Plant'
  and admin.username = 'admin'
on conflict do nothing;

with plant as (
  select id from classes where name = 'Plant'
)
insert into lesson_steps
  (class_id, position, title, step_type, content, video_file_name, video_quality, quiz_prompt)
select id, 1, 'Plant Class', 'title'::lesson_step_type, 'Welcome to this week learning session.', null, '480p', null from plant
union all
select id, 2, 'Opening Host Video', 'video'::lesson_step_type, null, 'plant-opening-host.mp4', '480p', null from plant
union all
select id, 3, 'Lesson Video 1', 'video'::lesson_step_type, null, 'plant-lesson-1.mp4', '480p', null from plant
union all
select id, 4, 'Quiz 1', 'quiz'::lesson_step_type, null, null, '480p', 'Write your reflection from lesson video 1.' from plant
union all
select id, 5, 'Lesson Video 2', 'video'::lesson_step_type, null, 'plant-lesson-2.mp4', '480p', null from plant
union all
select id, 6, 'Quiz 2', 'quiz'::lesson_step_type, null, null, '480p', 'Write your reflection from lesson video 2.' from plant
union all
select id, 7, 'Lesson Video 3', 'video'::lesson_step_type, null, 'plant-lesson-3.mp4', '480p', null from plant
union all
select id, 8, 'Quiz 3', 'quiz'::lesson_step_type, null, null, '480p', 'Write your reflection from lesson video 3.' from plant
union all
select id, 9, 'Closing Video', 'video'::lesson_step_type, null, 'plant-closing.mp4', '480p', null from plant
on conflict (class_id, position) do nothing;

insert into app_settings (key, value)
values
  ('allow_forward_seek', 'false'::jsonb),
  ('pause_video_on_tab_hidden', 'true'::jsonb)
on conflict (key) do nothing;
