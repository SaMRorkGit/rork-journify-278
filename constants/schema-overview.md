# Journify Schema Overview

This document describes the canonical Supabase/Postgres schema for the Journify app. Keep it synchronized with the SQL files under `constants/schema-sql`.

## Modeling Principles

- **Profiles first**: Every domain record references `profiles.id`, which mirrors `auth.users.id`.
- **UUID everywhere**: Primary keys default to `gen_random_uuid()`.
- **UTC timestamps**: Use `timestamptz` with `timezone('utc', now())`.
- **Enums for constrained strings** to match the TypeScript unions used in the app.
- **Soft insights data** (AI outputs, tags, extracted content) live in JSONB or text arrays for flexibility.

## Enum Types

| Enum | Values |
| --- | --- |
| `mood_type` | `great`, `fine`, `neutral`, `stressed`, `low` |
| `check_in_type` | `morning`, `evening` |
| `habit_tracking_type` | `checkbox`, `numeric`, `time` |
| `habit_frequency` | `daily`, `weekly` |
| `goal_status` | `active`, `archived`, `completed` |
| `life_area` | `relationship`, `career`, `health`, `finance`, `growth` |
| `todo_group` | `now`, `later` |
| `age_group_type` | `18-24`, `25-34`, `35-44`, `45-54`, `55+`, `prefer-not-to-say` |
| `gender_type` | `female`, `male`, `non-binary`, `prefer-not-to-say` |

## Table Inventory

| Table | Purpose |
| --- | --- |
| `profiles` | User-level bio, preferences, onboarding state, and focus goal reference |
| `user_progress` | XP + level tracker keyed to `profiles.id` |
| `daily_check_ins` | Morning/evening mood + reflection snapshots |
| `journal_entries` | Long-form journal content with AI insights metadata |
| `todos` | Action items surfaced from journals or planning flows |
| `goal_tasks` | Subtasks linked to a goal |
| `goals` | High-level targets with life-area context |
| `habits` | Recurring behaviors plus metadata for tracking |
| `habit_entries` | Daily/weekly completion or numeric logs for habits |
| `aspirations` | Life-area aspirations tied to goals/habits |
| `visions` | Vision statements and imagery |
| `vision_guide_sessions` | AI-guided session state per profile |
| `vision_guide_responses` | Individual question/answer records under a session |

See `constants/schema-tables.md` for column-by-column details.
