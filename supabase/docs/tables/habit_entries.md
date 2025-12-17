# `habit_entries`

Per-day logs for habits.

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Defaults to `gen_random_uuid()` |
| `habit_id` | `uuid` | NOT NULL, FK -> `habits(id)` ON DELETE CASCADE |  |
| `entry_date` | `date` | NOT NULL | Unique per habit/day |
| `completed` | `boolean` | NOT NULL, DEFAULT `false` |  |
| `value` | `numeric` |  | For numeric/time tracking |
| `created_at` | `timestamptz` | NOT NULL | Defaults to UTC now |

## Indexes

- Unique: (`habit_id`, `entry_date`)

## RLS

- Users can manage only rows where the linked habit is theirs.
