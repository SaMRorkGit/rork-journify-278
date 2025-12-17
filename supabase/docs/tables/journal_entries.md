# `journal_entries`

Long-form journal content plus extracted/AI insights.

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Defaults to `gen_random_uuid()` |
| `profile_id` | `uuid` | NOT NULL, FK -> `profiles(id)` ON DELETE CASCADE | Owner |
| `content` | `text` | NOT NULL | Markdown/plain |
| `mood` | `mood_type` |  | Optional/inferred |
| `tags` | `text[]` | NOT NULL, DEFAULT `'{}'` |  |
| `linked_goal_id` | `uuid` | FK -> `goals(id)` (added later) | Nullable |
| `extracted_todos` | `text[]` | NOT NULL, DEFAULT `'{}'` |  |
| `extracted_habits` | `text[]` | NOT NULL, DEFAULT `'{}'` |  |
| `extracted_goals` | `text[]` | NOT NULL, DEFAULT `'{}'` |  |
| `reflection_insights` | `jsonb` | NOT NULL, DEFAULT `'{}'::jsonb` | AI payload |
| `analyzed` | `boolean` | NOT NULL, DEFAULT `false` | AI pipeline complete |
| `created_at` | `timestamptz` | NOT NULL | Defaults to UTC now |
| `updated_at` | `timestamptz` | NOT NULL | Defaults to UTC now |

## Indexes

- `journal_entries_profile_created_idx` on (`profile_id`, `created_at DESC`)

## RLS

- Users can manage only their own rows (`profile_id = auth.uid()`).
