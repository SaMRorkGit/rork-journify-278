CREATE TABLE IF NOT EXISTS public.daily_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  type check_in_type NOT NULL,
  mood mood_type NOT NULL,
  reflection text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_check_ins_profile_date_type_idx
  ON public.daily_check_ins (profile_id, entry_date, type);
