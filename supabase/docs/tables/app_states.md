# `app_states`

Single-row-per-user JSON store for app state.

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `user_id` | `uuid` | PK, FK -> `auth.users(id)` ON DELETE CASCADE | Owner |
| `payload` | `jsonb` | NOT NULL, DEFAULT `'{}'::jsonb` | App state blob |
| `updated_at` | `timestamptz` | NOT NULL | Defaults to `now()` |

## RLS

Policies are included in SQL:
- read own row
- insert own row
- update own row
