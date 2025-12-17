# Supabase Schema (Journify)

This folder documents the full Postgres schema used by the app.

## Quick start (Supabase SQL Editor)

Run the SQL files under `supabase/sql/` in numeric order:

1. `00_extensions_and_enums.sql`
2. `01_profiles.sql`
3. `02_user_progress.sql`
4. `03_daily_check_ins.sql`
5. `04_journal_entries.sql`
6. `05_aspirations.sql`
7. `06_goals.sql`
8. `07_goal_tasks.sql`
9. `08_habits.sql`
10. `09_habit_entries.sql`
11. `10_todos.sql`
12. `11_visions.sql`
13. `12_vision_guide_sessions.sql`
14. `13_vision_guide_responses.sql`
15. `14_profiles_focus_goal_fk.sql`
16. `15_journal_entries_goal_fk.sql`
17. `16_app_states.sql`

## Modeling principles

- **Profiles mirror auth**: `public.profiles.id` mirrors `auth.users.id`.
- **UUID PKs**: UUID primary keys default to `gen_random_uuid()`.
- **UTC timestamps**: stored as `timestamptz`.
- **RLS-first**: all user-owned data is protected by Row Level Security policies.

See:
- `01-enums.md`
- `tables/*.md`
