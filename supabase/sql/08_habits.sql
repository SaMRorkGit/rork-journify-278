-- 08 - habits

CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  frequency habit_frequency NOT NULL,
  week_days smallint[] NOT NULL DEFAULT '{}',
  tracking_type habit_tracking_type NOT NULL,
  target_value numeric,
  unit text,
  completed_dates date[] NOT NULL DEFAULT '{}',
  goal_id uuid REFERENCES public.goals (id),
  aspiration_id uuid REFERENCES public.aspirations (id),
  life_area life_area,
  from_journal_id uuid REFERENCES public.journal_entries (id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS habits_profile_idx ON public.habits (profile_id);
