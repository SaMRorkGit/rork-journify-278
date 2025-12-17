# `vision_guide_sessions`

Holds AI-guided session state for a vision-guiding flow.

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Defaults to `gen_random_uuid()` |
| `profile_id` | `uuid` | NOT NULL, FK -> `profiles(id)` ON DELETE CASCADE | Owner |
| `synthesized_vision` | `text` |  | Final output |
| `pending_vision` | `text` |  | In-progress output |
| `last_updated` | `timestamptz` | NOT NULL | Defaults to UTC now |

## Indexes

- `vision_sessions_profile_idx` on (`profile_id`)

## RLS

- Users can manage only their own rows (`profile_id = auth.uid()`).
