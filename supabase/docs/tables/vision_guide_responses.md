# `vision_guide_responses`

Individual Q&A records for a vision guide session.

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Defaults to `gen_random_uuid()` |
| `session_id` | `uuid` | NOT NULL, FK -> `vision_guide_sessions(id)` ON DELETE CASCADE |  |
| `profile_id` | `uuid` | NOT NULL, FK -> `profiles(id)` ON DELETE CASCADE | Denormalized owner |
| `question` | `text` | NOT NULL |  |
| `answer` | `text` | NOT NULL |  |
| `feedback` | `text` |  | Optional AI feedback |
| `updated_at` | `timestamptz` | NOT NULL | Defaults to UTC now |

## Indexes

- `vision_responses_session_idx` on (`session_id`)

## RLS

- Users can manage only their own rows (`profile_id = auth.uid()`).
