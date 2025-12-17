DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'journal_entries_linked_goal_id_fkey'
  ) THEN
    ALTER TABLE public.journal_entries
      ADD CONSTRAINT journal_entries_linked_goal_id_fkey
      FOREIGN KEY (linked_goal_id)
      REFERENCES public.goals (id)
      ON DELETE SET NULL;
  END IF;
END $$;
