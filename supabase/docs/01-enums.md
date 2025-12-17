# Enum types

The schema uses Postgres enums to keep app strings constrained and type-safe.

| Enum | Values |
| --- | --- |
| `mood_type` | `great`, `fine`, `neutral`, `stressed`, `low` |
| `check_in_type` | `morning`, `evening` |
| `habit_tracking_type` | `checkbox`, `numeric`, `time` |
| `habit_frequency` | `daily`, `weekly` |
| `goal_status` | `active`, `archived`, `completed` |
| `life_area` | `relationship`, `career`, `health`, `finance`, `growth` |
| `todo_group` | `now`, `later` |
| `age_group_type` | `18-24`, `25-34`, `35-44`, `45-54`, `55+`, `prefer-not-to-say` |
| `gender_type` | `female`, `male`, `non-binary`, `prefer-not-to-say` |
