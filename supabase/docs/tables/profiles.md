# `profiles`

User-level profile data.

## Columns

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, FK -> `auth.users(id)` | Mirrors Supabase Auth user id |
| `full_name` | `text` |  | Optional display name |
| `age_group` | `age_group_type` |  | Onboarding selection |
| `gender` | `gender_type` |  |  |
| `interests` | `text[]` | NOT NULL, DEFAULT `'{}'` | Keywords |
| `goals` | `text[]` | NOT NULL, DEFAULT `'{}'` | Onboarding goals |
| `life_area_ranking` | `life_area[]` | NOT NULL, DEFAULT `'{}'` | Ordered preference |
| `onboarding_completed` | `boolean` | NOT NULL, DEFAULT `false` |  |
| `focus_goal_id` | `uuid` | FK -> `goals(id)` (added later) | Nullable |
| `created_at` | `timestamptz` | NOT NULL | Defaults to UTC now |
| `updated_at` | `timestamptz` | NOT NULL | Defaults to UTC now |

## Indexes

- `profiles_focus_goal_idx` on (`focus_goal_id`)

## RLS

- A user can read/update only their own profile row (`profiles.id = auth.uid()`).
