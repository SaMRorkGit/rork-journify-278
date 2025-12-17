# `user_progress`

Per-user XP/level tracker.

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `profile_id` | `uuid` | PK, FK -> `profiles(id)` ON DELETE CASCADE |  |
| `xp` | `integer` | NOT NULL, DEFAULT `0` |  |
| `level` | `integer` | NOT NULL, DEFAULT `1` |  |
| `updated_at` | `timestamptz` | NOT NULL | Defaults to UTC now |

## RLS

- Users can read/insert/update/delete their own progress row (`profile_id = auth.uid()`).
