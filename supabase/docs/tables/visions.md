# `visions`

Vision statements and optional reference images.

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Defaults to `gen_random_uuid()` |
| `profile_id` | `uuid` | NOT NULL, FK -> `profiles(id)` ON DELETE CASCADE | Owner |
| `text` | `text` | NOT NULL | Vision statement |
| `image_urls` | `text[]` | NOT NULL, DEFAULT `'{}'` | Remote image URLs |
| `created_at` | `timestamptz` | NOT NULL | Defaults to UTC now |
| `updated_at` | `timestamptz` | NOT NULL | Defaults to UTC now |

## Indexes

- Unique: `visions_profile_idx` on (`profile_id`)

## RLS

- Users can manage only their own rows (`profile_id = auth.uid()`).
