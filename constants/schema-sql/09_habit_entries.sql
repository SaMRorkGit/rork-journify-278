CREATE TABLE IF NOT EXISTS public.habit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits (id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  value numeric,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS habit_entries_unique_per_day
  ON public.habit_entries (habit_id, entry_date);
