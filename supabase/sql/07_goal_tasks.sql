-- 07 - goal_tasks

CREATE TABLE IF NOT EXISTS public.goal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES public.goals (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS goal_tasks_goal_idx ON public.goal_tasks (goal_id);
