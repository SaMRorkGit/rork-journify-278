-- 16 - app_states (single-row-per-user JSON state)

CREATE TABLE IF NOT EXISTS public.app_states (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own app state" ON public.app_states
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own app state" ON public.app_states
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own app state" ON public.app_states
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
