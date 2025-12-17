DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_focus_goal_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_focus_goal_id_fkey
      FOREIGN KEY (focus_goal_id)
      REFERENCES public.goals (id)
      ON DELETE SET NULL;
  END IF;
END $$;
