# `habits`

Recurring behaviors a user tracks.

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Defaults to `gen_random_uuid()` |
| `profile_id` | `uuid` | NOT NULL, FK -> `profiles(id)` ON DELETE CASCADE | Owner |
| `title` | `text` | NOT NULL |  |
| `description` | `text` |  |  |
| `frequency` | `habit_frequency` | NOT NULL | `daily` / `weekly` |
| `week_days` | `smallint[]` | NOT NULL, DEFAULT `'{}'` | 0=Sun ... 6=Sat |
| `tracking_type` | `habit_tracking_type` | NOT NULL | checkbox/numeric/time |
| `target_value` | `numeric` |  | Numeric/time target |
| `unit` | `text` |  | e.g. `minutes` |
| `completed_dates` | `date[]` | NOT NULL, DEFAULT `'{}'` | Cache for checkbox habits |
| `goal_id` | `uuid` | FK -> `goals(id)` |  |
| `aspiration_id` | `uuid` | FK -> `aspirations(id)` |  |
| `life_area` | `life_area` |  |  |
| `from_journal_id` | `uuid` | FK -> `journal_entries(id)` | Traceability |
| `created_at` | `timestamptz` | NOT NULL | Defaults to UTC now |

## Indexes

- `habits_profile_idx` on (`profile_id`)

## RLS

- Users can manage only their own rows (`profile_id = auth.uid()`).
