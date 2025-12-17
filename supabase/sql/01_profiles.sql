-- 01 - profiles

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() REFERENCES auth.users (id),
  full_name text,
  age_group age_group_type,
  gender gender_type,
  interests text[] NOT NULL DEFAULT '{}',
  goals text[] NOT NULL DEFAULT '{}',
  life_area_ranking life_area[] NOT NULL DEFAULT '{}',
  onboarding_completed boolean NOT NULL DEFAULT false,
  focus_goal_id uuid,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS profiles_focus_goal_idx ON public.profiles (focus_goal_id);
