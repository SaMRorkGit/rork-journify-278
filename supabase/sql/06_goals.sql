-- 06 - goals

CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  why text,
  success_criteria text,
  target_date date,
  status goal_status NOT NULL DEFAULT 'active',
  life_area life_area,
  is_focus_goal boolean NOT NULL DEFAULT false,
  aspiration_id uuid REFERENCES public.aspirations (id),
  aspiration_ids uuid[] NOT NULL DEFAULT '{}',
  from_journal_id uuid REFERENCES public.journal_entries (id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS goals_profile_status_idx ON public.goals (profile_id, status);
