# Table Definitions

## profiles

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK, references `auth.users` | Mirrors Supabase auth user id |
| full_name | text | | Optional display name |
| age_group | age_group_type | | Matches onboarding selection |
| gender | gender_type | | |
| interests | text[] | DEFAULT '{}' | Stored keywords |
| goals | text[] | DEFAULT '{}' | Captures focus areas from onboarding |
| life_area_ranking | life_area[] | DEFAULT '{}' | Ordered preference |
| onboarding_completed | boolean | DEFAULT false | Marks onboarding flow completion |
| focus_goal_id | uuid | FK -> `goals.id` | Null when auto-selected |
| created_at | timestamptz | DEFAULT timezone('utc', now()) | |
| updated_at | timestamptz | DEFAULT timezone('utc', now()) | Trigger recommended for auto-update |

Indexes: `profiles_focus_goal_idx` on (`focus_goal_id`).

## user_progress

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| profile_id | uuid | PK, FK -> `profiles.id` ON DELETE CASCADE | |
| xp | integer | DEFAULT 0 | |
| level | integer | DEFAULT 1 | |
| updated_at | timestamptz | DEFAULT timezone('utc', now()) | |

## daily_check_ins

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK | |
| profile_id | uuid | FK -> `profiles.id` ON DELETE CASCADE | |
| entry_date | date | NOT NULL | Unique per profile+type |
| type | check_in_type | NOT NULL | morning/evening |
| mood | mood_type | NOT NULL | |
| reflection | text | | Optional free-form text |
| created_at | timestamptz | DEFAULT timezone('utc', now()) | |

Unique index: (`profile_id`, `entry_date`, `type`).

## journal_entries

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK | |
| profile_id | uuid | FK -> `profiles.id` ON DELETE CASCADE | |
| content | text | NOT NULL | Rich text stored as markdown/plain |
| mood | mood_type | | Optional inferred mood |
| tags | text[] | DEFAULT '{}' | User or AI generated tags |
| linked_goal_id | uuid | FK -> `goals.id` | |
| extracted_todos | text[] | DEFAULT '{}' | Raw labels prior to creation |
| extracted_habits | text[] | DEFAULT '{}' | |
| extracted_goals | text[] | DEFAULT '{}' | |
| reflection_insights | jsonb | DEFAULT '{}'::jsonb | Stores AI insight payload |
| analyzed | boolean | DEFAULT false | Indicates AI pipeline completion |
| created_at | timestamptz | DEFAULT timezone('utc', now()) | |
| updated_at | timestamptz | DEFAULT timezone('utc', now()) | Trigger recommended |

## todos

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK | |
| profile_id | uuid | FK -> `profiles.id` ON DELETE CASCADE | |
| title | text | NOT NULL | |
| description | text | | |
| status_group | todo_group | DEFAULT 'now'::todo_group | UI grouping |
| completed | boolean | DEFAULT false | |
| sort_order | integer | DEFAULT 0 | Drag ordering |
| created_at | timestamptz | DEFAULT timezone('utc', now()) | |
| completed_at | timestamptz | | |
| from_journal_id | uuid | FK -> `journal_entries.id` | Traceability |
| goal_id | uuid | FK -> `goals.id` | Optional |
| habit_id | uuid | FK -> `habits.id` | Optional |

Indexes: `todos_profile_status_idx` on (`profile_id`, `status_group`, `completed`).

## goal_tasks

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK | |
| profile_id | uuid | FK -> `profiles.id` ON DELETE CASCADE | |
| goal_id | uuid | FK -> `goals.id` ON DELETE CASCADE | |
| title | text | NOT NULL | |
| description | text | | |
| due_date | date | | |
| completed | boolean | DEFAULT false | |
| created_at | timestamptz | DEFAULT timezone('utc', now()) | |
| completed_at | timestamptz | | |

## goals

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK | |
| profile_id | uuid | FK -> `profiles.id` ON DELETE CASCADE | |
| title | text | NOT NULL | |
| why | text | | |
| success_criteria | text | | |
| target_date | date | | |
| status | goal_status | DEFAULT 'active' | |
| life_area | life_area | | |
| is_focus_goal | boolean | DEFAULT false | Whether user spotlighted this goal |
| aspiration_id | uuid | FK -> `aspirations.id` | |
| aspiration_ids | uuid[] | DEFAULT '{}' | Historical links |
| from_journal_id | uuid | FK -> `journal_entries.id` | |
| created_at | timestamptz | DEFAULT timezone('utc', now()) | |
| completed_at | timestamptz | | |

Indexes: `goals_profile_status_idx` on (`profile_id`, `status`).

## habits

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK | |
| profile_id | uuid | FK -> `profiles.id` ON DELETE CASCADE | |
| title | text | NOT NULL | |
| description | text | | |
| frequency | habit_frequency | NOT NULL | |
| week_days | smallint[] | DEFAULT '{}' | 0 = Sunday ... 6 = Saturday |
| tracking_type | habit_tracking_type | NOT NULL | |
| target_value | numeric | | Used for numeric/time tracking |
| unit | text | | e.g. `minutes`, `reps` |
| completed_dates | date[] | DEFAULT '{}' | Lightweight cache for checkbox habits |
| goal_id | uuid | FK -> `goals.id` | |
| aspiration_id | uuid | FK -> `aspirations.id` | |
| life_area | life_area | | |
| from_journal_id | uuid | FK -> `journal_entries.id` | |
| created_at | timestamptz | DEFAULT timezone('utc', now()) | |

## habit_entries

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK | |
| habit_id | uuid | FK -> `habits.id` ON DELETE CASCADE | |
| entry_date | date | NOT NULL | |
| completed | boolean | DEFAULT false | Checkbox habits |
| value | numeric | | Captures numeric/time inputs |
| created_at | timestamptz | DEFAULT timezone('utc', now()) | |

Unique index: (`habit_id`, `entry_date`).

## aspirations

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK | |
| profile_id | uuid | FK -> `profiles.id` ON DELETE CASCADE | |
| life_area | life_area | NOT NULL | |
| description | text | NOT NULL | |
| created_at | timestamptz | DEFAULT timezone('utc', now()) | |
| updated_at | timestamptz | DEFAULT timezone('utc', now()) | |

## visions

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK | |
| profile_id | uuid | FK -> `profiles.id` ON DELETE CASCADE | |
| text | text | NOT NULL | Vision statement |
| image_urls | text[] | DEFAULT '{}' | Stored remote URLs |
| created_at | timestamptz | DEFAULT timezone('utc', now()) | |
| updated_at | timestamptz | DEFAULT timezone('utc', now()) | |

## vision_guide_sessions

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK | |
| profile_id | uuid | FK -> `profiles.id` ON DELETE CASCADE | |
| synthesized_vision | text | | |
| pending_vision | text | | |
| last_updated | timestamptz | DEFAULT timezone('utc', now()) | |

## vision_guide_responses

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK | |
| session_id | uuid | FK -> `vision_guide_sessions.id` ON DELETE CASCADE | |
| profile_id | uuid | FK -> `profiles.id` ON DELETE CASCADE | Denormalized for easier queries |
| question | text | NOT NULL | |
| answer | text | NOT NULL | |
| feedback | text | | Optional AI reflection |
| updated_at | timestamptz | DEFAULT timezone('utc', now()) | |

