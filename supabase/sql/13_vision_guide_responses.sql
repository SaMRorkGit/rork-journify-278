-- 13 - vision_guide_responses

CREATE TABLE IF NOT EXISTS public.vision_guide_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.vision_guide_sessions (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  feedback text,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS vision_responses_session_idx
  ON public.vision_guide_responses (session_id);
