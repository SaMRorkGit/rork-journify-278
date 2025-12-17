CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  content text NOT NULL,
  mood mood_type,
  tags text[] NOT NULL DEFAULT '{}',
  linked_goal_id uuid,
  extracted_todos text[] NOT NULL DEFAULT '{}',
  extracted_habits text[] NOT NULL DEFAULT '{}',
  extracted_goals text[] NOT NULL DEFAULT '{}',
  reflection_insights jsonb NOT NULL DEFAULT '{}'::jsonb,
  analyzed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS journal_entries_profile_created_idx
  ON public.journal_entries (profile_id, created_at DESC);
