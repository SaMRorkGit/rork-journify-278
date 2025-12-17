# `aspirations`

Life-area aspirations, usually created via onboarding or reflection flows.

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Defaults to `gen_random_uuid()` |
| `profile_id` | `uuid` | NOT NULL, FK -> `profiles(id)` ON DELETE CASCADE | Owner |
| `life_area` | `life_area` | NOT NULL |  |
| `description` | `text` | NOT NULL |  |
| `created_at` | `timestamptz` | NOT NULL | Defaults to UTC now |
| `updated_at` | `timestamptz` | NOT NULL | Defaults to UTC now |

## Indexes

- `aspirations_profile_idx` on (`profile_id`)

## RLS

- Users can manage only their own rows (`profile_id = auth.uid()`).
