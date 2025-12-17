# `daily_check_ins`

Morning/evening check-ins (mood + optional reflection).

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Defaults to `gen_random_uuid()` |
| `profile_id` | `uuid` | NOT NULL, FK -> `profiles(id)` ON DELETE CASCADE | Owner |
| `entry_date` | `date` | NOT NULL | Unique per (profile, date, type) |
| `type` | `check_in_type` | NOT NULL | `morning` / `evening` |
| `mood` | `mood_type` | NOT NULL |  |
| `reflection` | `text` |  | Optional text |
| `created_at` | `timestamptz` | NOT NULL | Defaults to UTC now |

## Indexes

- Unique: (`profile_id`, `entry_date`, `type`)

## RLS

- Users can manage only their own rows (`profile_id = auth.uid()`).
