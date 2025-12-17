# `goals`

High-level targets with optional life-area and aspiration links.

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Defaults to `gen_random_uuid()` |
| `profile_id` | `uuid` | NOT NULL, FK -> `profiles(id)` ON DELETE CASCADE | Owner |
| `title` | `text` | NOT NULL |  |
| `why` | `text` |  |  |
| `success_criteria` | `text` |  |  |
| `target_date` | `date` |  |  |
| `status` | `goal_status` | NOT NULL, DEFAULT `'active'` |  |
| `life_area` | `life_area` |  |  |
| `is_focus_goal` | `boolean` | NOT NULL, DEFAULT `false` |  |
| `aspiration_id` | `uuid` | FK -> `aspirations(id)` |  |
| `aspiration_ids` | `uuid[]` | NOT NULL, DEFAULT `'{}'` | Historical links |
| `from_journal_id` | `uuid` | FK -> `journal_entries(id)` | Traceability |
| `created_at` | `timestamptz` | NOT NULL | Defaults to UTC now |
| `completed_at` | `timestamptz` |  |  |

## Indexes

- `goals_profile_status_idx` on (`profile_id`, `status`)

## RLS

- Users can manage only their own rows (`profile_id = auth.uid()`).
