# Skill: Task Store

## Purpose
Manages the user's manual task list (add, list, complete, remove, link to Jira key). Pure CRUD — no Claude involvement.

## Slash command mapping
| Command | Action |
|---------|--------|
| `/task add <title>` | Add a new task |
| `/task list` | Show pending tasks (ephemeral) |
| `/task done <#>` | Mark task #N done |
| `/task remove <#>` | Archive task #N |
| `/task link <#> <JIRA-KEY>` | Associate task with Jira issue |

## Task numbering
Tasks are displayed with 1-based indexes matching the order returned by `opList()` (sorted by sort_order ASC, created_at ASC). The `/task done 2` command marks the 2nd task in that list.

## Storage
SQLite `tasks` table. Status values: `pending`, `done`, `archived`. Archived tasks are hidden from the list but not deleted.

## Output
All operations return the affected `Task` object plus a human-readable message string rendered as ephemeral Slack text.
