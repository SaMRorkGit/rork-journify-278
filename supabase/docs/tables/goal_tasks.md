# `goal_tasks`

Tasks/sub-steps under a goal.

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Defaults to `gen_random_uuid()` |
| `profile_id` | `uuid` | NOT NULL, FK -> `profiles(id)` ON DELETE CASCADE | Owner |
| `goal_id` | `uuid` | NOT NULL, FK -> `goals(id)` ON DELETE CASCADE |  |
| `title` | `text` | NOT NULL |  |
| `description` | `text` |  |  |
| `due_date` | `date` |  |  |
| `completed` | `boolean` | NOT NULL, DEFAULT `false` |  |
| `created_at` | `timestamptz` | NOT NULL | Defaults to UTC now |
| `completed_at` | `timestamptz` |  |  |

## Indexes

- `goal_tasks_goal_idx` on (`goal_id`)

## RLS

- Users can manage only their own rows (`profile_id = auth.uid()`).
