-- 10 - todos

CREATE TABLE IF NOT EXISTS public.todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status_group todo_group NOT NULL DEFAULT 'now',
  completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz,
  from_journal_id uuid REFERENCES public.journal_entries (id),
  goal_id uuid REFERENCES public.goals (id),
  habit_id uuid REFERENCES public.habits (id)
);

CREATE INDEX IF NOT EXISTS todos_profile_status_idx
  ON public.todos (profile_id, status_group, completed);
