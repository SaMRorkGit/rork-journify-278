# `todos`

Action items (manual or extracted from journals).

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Defaults to `gen_random_uuid()` |
| `profile_id` | `uuid` | NOT NULL, FK -> `profiles(id)` ON DELETE CASCADE | Owner |
| `title` | `text` | NOT NULL |  |
| `description` | `text` |  |  |
| `status_group` | `todo_group` | NOT NULL, DEFAULT `'now'` | now/later |
| `completed` | `boolean` | NOT NULL, DEFAULT `false` |  |
| `sort_order` | `integer` | NOT NULL, DEFAULT `0` |  |
| `created_at` | `timestamptz` | NOT NULL | Defaults to UTC now |
| `completed_at` | `timestamptz` |  |  |
| `from_journal_id` | `uuid` | FK -> `journal_entries(id)` | Traceability |
| `goal_id` | `uuid` | FK -> `goals(id)` |  |
| `habit_id` | `uuid` | FK -> `habits(id)` |  |

## Indexes

- `todos_profile_status_idx` on (`profile_id`, `status_group`, `completed`)

## RLS

- Users can manage only their own rows (`profile_id = auth.uid()`).
