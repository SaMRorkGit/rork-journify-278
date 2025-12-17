CREATE TABLE IF NOT EXISTS public.vision_guide_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  synthesized_vision text,
  pending_vision text,
  last_updated timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS vision_sessions_profile_idx ON public.vision_guide_sessions (profile_id);
