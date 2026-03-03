# CtrlShift+ — Architecture & Implementation Plan

> **Status:** Pre-implementation planning document
> **Last updated:** 2026-03-03
> **Scope:** Personal Slack-native workflow assistant — single-user demo target

---

## Table of Contents

1. [Vision & Goals](#1-vision--goals)
2. [User Experience Flows](#2-user-experience-flows)
3. [Technical Architecture](#3-technical-architecture)
4. [Skills Decomposition](#4-skills-decomposition)
5. [Integrations Specification](#5-integrations-specification)
6. [Data Model & State](#6-data-model--state)
7. [Security & Safety Constraints](#7-security--safety-constraints)
8. [Repository Structure](#8-repository-structure)
9. [MVP Scope](#9-mvp-scope)
10. [Implementation Phases](#10-implementation-phases)
11. [Open Questions & Decisions](#11-open-questions--decisions)

---

## 1. Vision & Goals

### What is CtrlShift+?

CtrlShift+ is a **Slack-native personal workflow assistant** that helps a user manage their workday. It is not an enterprise bot or a team tool — it is a personal co-pilot, scoped to one person, focused on reducing friction between scattered information sources (Jira, Outlook, Slack threads) and the user's actual intentions for the day.

### Core goals

| Goal | Description |
|------|-------------|
| **Reduce cognitive overhead** | User should not have to manually check Jira, calendar, and Slack separately to know what to work on |
| **Surface priorities intelligently** | Use workflow stage awareness (not just due dates) to suggest what to do next |
| **Make focus real** | Give focus mode teeth: Slack DND + status, not just a reminder |
| **Capture context passively** | When a release date appears in a Slack message, the bot notices and asks; the user doesn't have to |
| **Respect boundaries** | Work-life nudges are opt-in, non-judgmental, and gentle |
| **Feel personal** | Enthusiastic tone, morning jokes, greeting — this assistant has personality |

### Non-goals (for MVP)

- Multi-user or team deployment
- Enterprise SSO or org-wide rollout
- Replacing a full project management tool
- Automated actions without confirmation (except explicitly invoked focus mode)
- High-availability production infrastructure

---

## 2. User Experience Flows

### 2.1 Morning Digest (scheduled DM)

Triggered automatically at a configured time (e.g., 08:30 local) or manually via `/daily-update`.

```
Bot → User DM:

Goooood morning! Hope you feel well-rested today! ☀️
Here's a quick one: [optional joke]

━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 YOUR DIGEST — Monday, March 3
━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Suggested Focus
→ DVLS-1234 — Fix regression in auth flow [TEST FAILED]
   Reason: Test failed + release scheduled March 12

📌 Manual Tasks
• [ ] Write API docs for token refresh endpoint
• [ ] Review PR from Sarah on config loader

🔬 Analysis
• DVLS-1102 — Investigate session timeout on mobile  [High]

🛠️ Development
• DVLS-0982 — Implement new onboarding wizard  [Medium]
• DVLS-1100 — Add retry logic to webhook handler  [Low]

🔄 Review / Test Cycle
• DVLS-1234 — Fix regression in auth flow  [🔴 Test Failed]
• DVLS-1201 — Update Docker base image  [🟡 Ready to Test]
• DVLS-1189 — Add MFA backup codes UI  [🟢 Test Passed]

[▶ Start Focus]  [🔁 Refresh]  [⚙ Settings]
```

**Rules:**
- Joke is toggleable (default on; safe/work-appropriate).
- Digest sections only appear if they have content.
- "Suggested Focus" is a single item with a one-line reason.
- Manual tasks appear above Jira sections.
- Jira sections use workflow stage buckets, not "overdue" framing.

### 2.2 `/daily-update` Command

On-demand refresh of the morning digest, same format. If Jira integration is active, pulls fresh data before rendering. Slack responds ephemerally first ("Fetching your update..."), then sends/updates the DM.

### 2.3 `/focus <duration> [task]`

```
User: /focus 2h DVLS-1234

Bot (ephemeral):
Setting up your focus block...
• DND until 11:30
• Status: 🧠 Deep Focus — Fix regression in auth (until 11:30)

[Confirm]  [Cancel]
```

On confirm:
- Sets Slack DND for `<duration>`
- Sets Slack status with task name + end time
- (Optional) Schedules a break nudge at midpoint
- At end of focus: sends check-in DM: "Focus block done! How did it go? [Mark task done] [Extend 30min] [Done for now]"

Duration parsing: `2h`, `90m`, `1.5h`, `until 3pm` (timezone-aware).

### 2.4 Context Capture from Slack Messages

Bot listens to messages in all channels it has been invited to. The user controls scope by adding or removing the bot from channels using Slack's native `/invite @CtrlShift+` — no separate config file or command needed. When removed from a channel, the bot stops receiving events from it automatically.

**Detection trigger:** Message contains a date-like pattern paired with release/deadline/milestone keywords.

```
Someone posts: "Just a reminder, DVLS March release is March 12th — feature freeze tomorrow."

Bot → User DM (private, not in the channel):

📌 I noticed something in #dev-general

"DVLS release is March 12th"
Event detected: Release — March 12, 2026

Should I add this to your calendar?
[✅ Add to Calendar]  [🗂 Save as Context Only]  [❌ Ignore]

If it's a release, should I reprioritize your Jira board?
[🔺 Prioritize test-failed tickets]  [🔺 Prioritize regressions]  [Skip]
```

On calendar confirm: creates a 30-minute event titled "DVLS Release" on March 12 (all-day or point-in-time, configurable). Links the Slack message in event description.

### 2.5 Work-Life Boundary Nudges (opt-in)

**Conditions (configurable):**
- User is active in Slack past their configured end-of-day time
- User has been active for N hours without a break (Slack activity heuristic)

**Messages (non-judgmental, gentle):**
- "Hey! Just noticed you've been heads-down for a while. 💧 Grab some water?"
- "It's past 6pm — today's looking solid. Everything else will still be there tomorrow. 🌙"
- "You've been at it for 4 hours straight. A 10-minute walk might actually help your next problem. 🚶"

These are DMs only, never channel messages. Nudge messages use **plain text** — intentionally conversational and low-ceremony. User can dismiss, snooze, or disable by replying or reacting.

### 2.6 WFH / Office / Vacation Status Mirroring

At morning digest time (or on-demand):

```
Bot → User DM:

📅 I see "WFH" on your calendar today.
Should I update your Slack status to 🏠 Working from Home?

[Yes, update]  [No thanks]  [Always do this automatically]
```

**Detection:** Reads user's Outlook calendar for today's events; checks event titles for keywords: `WFH`, `Work from Home`, `Office`, `OOO`, `Out of Office`, `Vacation`, `PTO`, `Holiday`.

**Modes:**
- `confirm` (default): always asks before changing status
- `auto`: applies automatically at digest time; user can configure per-keyword

---

## 3. Technical Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Slack Workspace                            │
│  User ←──── DMs, Blocks, Ephemeral messages ───── Slack App        │
│             Slash commands (/focus, /daily-update)                  │
│             Message events (filtered)                               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │  HTTP (events, commands, interactions)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CtrlShift+ Backend Service                     │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────────┐  │
│  │  HTTP Layer  │   │  Agent Loop  │   │   Scheduler (cron)     │  │
│  │  (Express /  │──▶│  (Claude +   │   │   morning digest       │  │
│  │   FastAPI)   │   │  tool calls) │   │   nudge checks         │  │
│  └──────────────┘   └──────┬───────┘   └────────────────────────┘  │
│                            │                                        │
│              ┌─────────────┼──────────────┐                        │
│              ▼             ▼              ▼                        │
│  ┌─────────────────┐ ┌──────────┐ ┌────────────┐                  │
│  │  Skills Engine  │ │  State   │ │  Tool      │                  │
│  │  (composable)   │ │  Layer   │ │  Adapters  │                  │
│  └─────────────────┘ │  SQLite  │ └─────┬──────┘                  │
│                      └──────────┘       │                          │
└─────────────────────────────────────────┼──────────────────────────┘
                                          │
              ┌───────────────────────────┼────────────────────┐
              ▼                           ▼                    ▼
     ┌─────────────────┐       ┌──────────────────┐  ┌───────────────┐
     │   Slack API      │       │    Jira REST API │  │ MS Graph API  │
     │  (set DND,       │       │  (issues, status │  │ (calendar r/w,│
     │   status, DM,    │       │   updates)       │  │  OOO detect)  │
     │   post blocks)   │       └──────────────────┘  └───────────────┘
     └─────────────────┘
```

### 3.2 Backend Service

**Language:** Node.js (TypeScript). Slack Bolt SDK is first-class in Node; strong ecosystem for Slack apps; Anthropic SDK has full TypeScript support.

**Framework:** Slack Bolt for JavaScript (handles event routing, OAuth, signature verification out of the box).

**HTTP server:** Bolt's built-in receiver or Express.js adapter.

**Scheduler:** `node-cron` for morning digest and periodic checks. Alternative: BullMQ if a queue is needed later.

**Key responsibilities:**

| Module | Responsibility |
|--------|---------------|
| `slack/receiver.ts` | Inbound events, commands, interactions from Slack |
| `slack/blocks.ts` | Block Kit template builders for digest, prompts, focus confirmation |
| `agent/loop.ts` | Orchestrates Claude calls with tool routing |
| `agent/tools.ts` | Tool definitions (as Claude tool-use specs) |
| `skills/` | Individual skill implementations (see Section 4) |
| `adapters/slack.ts` | Slack API calls (status, DND, DM, post) |
| `adapters/jira.ts` | Jira REST API fetch + status mapping |
| `adapters/graph.ts` | Microsoft Graph calendar read + event create |
| `state/db.ts` | SQLite access layer (tasks, settings, tokens) |
| `scheduler/index.ts` | Cron job definitions |

### 3.3 Agent Loop (Claude Integration)

The backend uses Claude as the reasoning core for:
- Composing digest narrative
- Prioritizing Jira issues
- Extracting event candidates from Slack messages
- Generating nudge messages

**Pattern:** Tool-use (function calling) loop.

```
1. Assemble context (tasks, Jira issues, calendar events, message text)
2. Send to Claude with system prompt + tool definitions
3. Claude returns: text response or tool_use block(s)
4. Backend executes tool calls (fetch Jira, set DND, create event, etc.)
5. Return tool results to Claude
6. Claude produces final structured output (JSON)
7. Backend renders to Slack Block Kit
```

**Structured output:** Skills return a defined JSON schema so the rendering layer is deterministic even if Claude's prose varies.

**Rendering approach (hybrid):**
- **Block Kit** for structured/interactive content: daily digest, focus confirmation, context capture prompts, WFH status prompt. These need sections, buttons, and formatted layout.
- **Plain text** for conversational messages: nudges, hydration reminders, focus check-ins, quick acknowledgments ("Got it! Added to your tasks 👍"). Plain text feels more human and less app-like for ephemeral interactions.

**Model:** `claude-sonnet-4-6` for skill execution (balance of speed and quality). System prompt enforces personal, enthusiastic tone and structured output format.

### 3.4 Slack App Configuration

**Required scopes (Bot Token):**

| Scope | Purpose |
|-------|---------|
| `chat:write` | Send DMs to the user (DM only — never channels) |
| `im:write` | Open the personal DM channel with the user |
| `commands` | Slash commands |
| `channels:history` | Read channel messages for context capture (read-only) |
| `groups:history` | Read private channel messages for context capture (read-only) |
| `im:history` | Read DM history |
| `reactions:write` | Add reactions for confirmation UX in DMs |

**Required scopes (User Token — if needed for DND/status):**

| Scope | Purpose |
|-------|---------|
| `dnd:write` | Set Do Not Disturb on behalf of user |
| `users.profile:write` | Set custom Slack status on behalf of user |

> **Note:** Slack's API requires user-token for DND and profile writes. The user token (`xoxp-`) is set in `.env` alongside the bot token. Both are read at startup; no runtime OAuth flow.

**Scopes explicitly NOT requested:**
- `channels:write` — bot never posts to channels
- `groups:write` — bot never posts to private channels
- `chat:write.public` — not needed, not requested

**Event subscriptions:**
- `message.channels` — context capture (read-only; bot does not reply in channels)
- `message.im` — user commands and replies in the personal DM
- `app_mention` — @CtrlShift+ mentions (replies via DM, not in-channel)

**Slash commands:**
- `/daily-update` → POST to `/slack/commands/daily-update`
- `/focus` → POST to `/slack/commands/focus`
- `/task` → POST to `/slack/commands/task`

**Interactivity:** Block Kit button actions routed through `/slack/interactions`.

---

## 4. Skills Decomposition

Each skill lives in `skills/<skill-name>/` with a `SKILL.md` manifest and implementation files. Skills are invoked by the agent loop; they are pure functions that take structured input and return structured output.

### 4.1 Daily Digest Composer

**Path:** `skills/daily-digest/`

**Input schema:**
```json
{
  "user": { "id": "string", "timezone": "string", "preferences": {} },
  "tasks": [ { "id": "string", "title": "string", "status": "string", "jiraKey": "string|null" } ],
  "jiraIssues": [ { "key": "string", "summary": "string", "priority": "string", "status": "string", "stage": "Analysis|Development|Test" } ],
  "calendarEvents": [ { "title": "string", "date": "string", "isWFH": "boolean", "isOOO": "boolean" } ],
  "contextFlags": { "upcomingRelease": { "title": "string", "date": "string" } | null }
}
```

**Output schema:**
```json
{
  "greeting": "string",
  "joke": "string|null",
  "suggestedFocus": { "ref": "string", "title": "string", "reason": "string" } | null,
  "sections": {
    "manualTasks": [],
    "analysis": [],
    "development": [],
    "testCycle": []
  },
  "calendarNote": "string|null",
  "actions": [ { "actionId": "string", "label": "string" } ]
}
```

**Claude's role:** Generate greeting, joke, `suggestedFocus.reason`, and calendarNote prose. Section ordering and issue classification come from deterministic logic.

### 4.2 Prioritizer

**Path:** `skills/prioritizer/`

**Input schema:**
```json
{
  "jiraIssues": [ { "key": "string", "summary": "string", "priority": "string", "stage": "string", "testStatus": "string|null", "labels": ["string"] } ],
  "tasks": [],
  "contextFlags": { "upcomingRelease": { "date": "string" } | null, "releaseWithinDays": "number|null" },
  "userPriorityRules": {
    "pinToTop": ["regression", "test-failed"],
    "weights": {
      "stageTestCycle": 10,
      "testFailed": 5,
      "testReady": 3,
      "testInProgress": 2,
      "priorityCritical": 4,
      "priorityHigh": 3,
      "priorityMedium": 2,
      "priorityLow": 1,
      "releaseSoonTestFailed": 3,
      "releaseSoonRegression": 2,
      "blocked": -10
    }
  }
}
```

**Output schema:**
```json
{
  "orderedIssues": [
    { "key": "string", "score": "number", "pinned": "boolean", "tags": ["test-failed", "release-soon", "high-priority", "regression", "blocked"] }
  ],
  "topPick": { "key": "string", "reason": "string" }
}
```

**Scoring logic (deterministic, user-configurable, Claude not required):**

The scoring engine runs in two passes:

**Pass 1 — Weighted score:** Each issue accumulates points based on `userPriorityRules.weights`. Default weights produce the following ordering intent: Test Cycle > Development > Analysis; within Test: Failed > Ready > In Progress > Passed; Jira priority adds points on top; release context boosts test-failed and regression issues; blocked issues are heavily penalized.

**Pass 2 — Pin-to-top override:** Issues whose tags intersect `userPriorityRules.pinToTop` are marked `pinned: true` and sorted above all non-pinned issues (sorted among themselves by weighted score). This is the mechanism for "regressions always first" regardless of Jira priority: add `"regression"` to `pinToTop` and every issue tagged `regression` floats to the top of the list, ordered by their weighted score relative to each other.

**Tag assignment rules (deterministic):**
- `regression`: issue has a label matching `/regression/i` or summary contains "regression"
- `test-failed`: stage is `TestFailed`
- `release-soon`: release context within `releaseWithinDays` days
- `high-priority`: Jira priority is Critical or High
- `blocked`: issue has a "Blocked" label or is explicitly flagged as blocked

**User control surface:** `userPriorityRules` is stored as JSON in `user_preferences.priority_rules`. Users can adjust via a future `/ctrlshift priority` command or by editing their preferences. Changes take effect on the next digest or `/daily-update` call.

**Claude's role:** Generate human-readable `reason` string for `topPick`. Everything else is deterministic.

### 4.3 Context Event Extractor

**Path:** `skills/context-extractor/`

**Input schema:**
```json
{
  "messageText": "string",
  "messageTs": "string",
  "channelId": "string",
  "permalink": "string",
  "authorId": "string"
}
```

**Output schema:**
```json
{
  "candidates": [
    {
      "type": "release|deadline|meeting|milestone",
      "title": "string",
      "dateIso": "string",
      "confidence": 0.0,
      "extractedPhrase": "string",
      "suggestedCalendarTitle": "string",
      "suggestedFollowUpQuestion": "string"
    }
  ]
}
```

**Detection approach:**
1. Fast regex pre-filter: look for date patterns + release/deadline keywords. Skip message if no match (avoid sending every message to Claude).
2. If pre-filter passes: send to Claude for structured extraction.
3. Only surface candidates with `confidence >= 0.7`.

**Channel scope:** Bot processes messages from all channels it has been invited to. User manages this via `/invite @CtrlShift+` and `/kick @CtrlShift+` in Slack — no additional configuration needed.

**Claude's role:** Named entity recognition for dates (relative and absolute), event type classification, generating `suggestedCalendarTitle` and `suggestedFollowUpQuestion`.

### 4.4 Focus Mode Planner

**Path:** `skills/focus-planner/`

**Input schema:**
```json
{
  "duration": "string",
  "focusTask": { "key": "string|null", "title": "string|null" },
  "userTimezone": "string",
  "currentTime": "string"
}
```

**Output schema:**
```json
{
  "dndUntilTs": "number",
  "statusText": "string",
  "statusEmoji": "string",
  "statusExpiration": "number",
  "breakReminderAt": "number|null",
  "endOfFocusTs": "number",
  "humanReadableEndTime": "string",
  "confirmationText": "string"
}
```

**Duration parsing:** Handle `2h`, `90m`, `1.5h`, `until 3pm` (with timezone). Library: `chrono-node` or similar.

**Claude's role:** Minimal. Generate `confirmationText` prose ("Deep focus for 2 hours until 11:30 — go get 'em!"). Status text is templated deterministically: `🧠 Deep Focus — <task> (until <time>)`.

### 4.5 Task Store Manager

**Path:** `skills/task-store/`

**Operations:** `add`, `list`, `done`, `remove`, `link-jira`

**Input schema (add):**
```json
{ "op": "add", "title": "string", "jiraKey": "string|null", "notes": "string|null" }
```

**Output schema (list):**
```json
{
  "tasks": [ { "id": "string", "title": "string", "status": "pending|done", "jiraKey": "string|null", "createdAt": "string" } ]
}
```

**No Claude involvement.** Pure CRUD against the SQLite task table.

**Slash command mapping:**
- `/task add Write API docs` → add task
- `/task list` → show list (ephemeral)
- `/task done 3` → mark task #3 done
- `/task link 3 DVLS-1234` → associate with Jira key

---

## 5. Integrations Specification

### 5.1 Slack API Adapter

**Auth:** Bot token (`xoxb-`) and optionally a user token (`xoxp-`) read directly from `.env`. No OAuth flow — tokens are configured once at setup time. `.env` is gitignored.

**DM-only constraint:** The bot **never posts to channels**. All outbound messages go to the user's personal DM (opened via `conversations.open` with the configured `SLACK_USER_ID`). This is a hard architectural rule, not just a best practice. The bot has no `channels:write` or `groups:write` scope.

**Key operations:**

| Operation | Slack API | Notes |
|-----------|-----------|-------|
| Send DM | `conversations.open` + `chat.postMessage` | Only ever the configured user's DM |
| Post blocks | `chat.postMessage` with `blocks` | Block Kit for all structured output |
| Update message | `chat.update` | For in-place digest refresh |
| Set DND | `dnd.setSnooze` | May require user token; verify at setup |
| Set status | `users.profile.set` | `status_text`, `status_emoji`, `status_expiration` |
| Clear status | `users.profile.set` with empty fields | Called at end of focus block |
| Get permalink | `chat.getPermalink` | For context capture message linking |

**Error handling:** All API calls wrapped with retry (exponential backoff, max 3 retries) for rate limit errors. Non-retryable errors surface as ephemeral slash command responses to the user.

### 5.2 Jira REST API Adapter

**Auth:** Personal Access Token (PAT) read from `.env` (`JIRA_API_TOKEN`). No OAuth flow. Token is generated once in Atlassian account settings and added to `.env`.

**Base URL:** `https://<org>.atlassian.net/rest/api/3/`

**Key operations:**

| Operation | Endpoint | Notes |
|-----------|----------|-------|
| Fetch assigned issues | `GET /search?jql=assignee=currentUser() AND resolution=Unresolved` | Paginate; max 50 for MVP |
| Get issue detail | `GET /issue/{issueKey}` | For single-issue detail |
| Transition issue | `POST /issue/{issueKey}/transitions` | Future: status updates from bot |

**Status → Stage mapping** (configurable in `config/jira-stages.json`):

```json
{
  "Analysis": ["To Do", "Backlog", "In Analysis", "Requirement Gathering"],
  "Development": ["In Progress", "In Development", "Coding"],
  "Test": {
    "ReadyToTest": ["Ready for QA", "Ready to Test", "QA Queue"],
    "InTest": ["In QA", "Testing", "Test In Progress"],
    "TestFailed": ["QA Failed", "Test Failed", "Reopen", "Failed"],
    "TestPassed": ["QA Passed", "Test Passed", "Verified", "Done (Pending Release)"]
  }
}
```

**Mock mode:** If Jira credentials are not configured, load from `dev/mock-jira.json`. This allows full demo without real Jira access.

### 5.3 Microsoft Graph API Adapter

**Auth:** Device code flow (MSAL). Run `npm run auth:graph` once — it prints a URL and a code, you visit the URL in a browser, sign in, and the script saves `GRAPH_ACCESS_TOKEN` and `GRAPH_REFRESH_TOKEN` directly into your `.env`. No redirect server, no Azure callback URL to configure. Token refresh is handled automatically at runtime using the refresh token. If Graph tokens are absent from `.env`, the calendar section is silently skipped and the rest of the bot works normally.

**Key operations:**

| Operation | Endpoint | Notes |
|-----------|----------|-------|
| Read today's events | `GET /me/calendarView` with `startDateTime`/`endDateTime` | Filter to today |
| Create event | `POST /me/events` | On user confirmation only |
| Detect WFH/OOO | Client-side: keyword check on fetched event titles | No special API needed |

**WFH/OOO keyword config** (in `config/calendar-keywords.json`):
```json
{
  "wfh": ["WFH", "Work from Home", "Working from Home", "Remote"],
  "office": ["Office", "In Office", "On Site", "Onsite"],
  "ooo": ["OOO", "Out of Office", "Vacation", "PTO", "Holiday", "Leave"],
  "vacation": ["Vacation", "Annual Leave", "Time Off"]
}
```

**Fallback:** If Graph is not configured, WFH/OOO detection section is omitted from digest. Context capture and focus mode still work fully.

---

## 6. Data Model & State

### 6.1 Database

**Engine:** SQLite (file: `data/ctrlshift.db`). Upgrade path to PostgreSQL requires minimal changes (use a migration-friendly ORM like `drizzle-orm` or `knex`).

### 6.2 Tables

#### `users`
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- Slack user ID (matches SLACK_USER_ID in .env)
  timezone TEXT NOT NULL DEFAULT 'UTC',
  digest_time TEXT DEFAULT '08:30', -- HH:MM in user's timezone
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
-- Note: all API tokens (Slack, Jira, Graph) live in .env for MVP.
-- No token columns in DB; no encryption layer needed at this stage.
```

#### `user_preferences`
```sql
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  jokes_enabled INTEGER DEFAULT 1,          -- boolean
  nudges_enabled INTEGER DEFAULT 0,         -- opt-in
  nudge_interval_minutes INTEGER DEFAULT 120,
  end_of_day_time TEXT DEFAULT '18:00',
  wfh_mirror_mode TEXT DEFAULT 'confirm',   -- 'confirm' | 'auto' | 'off'
  context_capture_mode TEXT DEFAULT 'confirm', -- 'confirm' | 'off'
  jira_stage_config TEXT,                   -- JSON override for stage mapping
  tone TEXT DEFAULT 'enthusiastic',         -- 'enthusiastic' | 'friendly' | 'minimal'
  priority_rules TEXT                       -- JSON: user-defined scoring weights + pin-to-top rules
  -- Default priority_rules (applied when null):
  -- {
  --   "pinToTop": [],
  --   "weights": {
  --     "stageTestCycle": 10, "testFailed": 5, "testReady": 3, "testInProgress": 2,
  --     "priorityCritical": 4, "priorityHigh": 3, "priorityMedium": 2, "priorityLow": 1,
  --     "releaseSoonTestFailed": 3, "releaseSoonRegression": 2, "blocked": -10
  --   }
  -- }
);
```

#### `tasks`
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,             -- UUID
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'done' | 'archived'
  jira_key TEXT,                   -- optional link
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER
);
```

#### `context_captures`
```sql
CREATE TABLE context_captures (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  message_ts TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  permalink TEXT,
  extracted_type TEXT,             -- 'release' | 'deadline' | 'meeting'
  extracted_title TEXT,
  extracted_date TEXT,             -- ISO 8601
  confidence REAL,
  status TEXT DEFAULT 'pending',   -- 'pending' | 'added_to_calendar' | 'saved' | 'ignored'
  calendar_event_id TEXT,
  created_at INTEGER NOT NULL
);
```

#### `focus_sessions`
```sql
CREATE TABLE focus_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  started_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  task_ref TEXT,                   -- Jira key or task ID
  task_title TEXT,
  status TEXT DEFAULT 'active',    -- 'active' | 'completed' | 'cancelled'
  completed_at INTEGER
);
```

#### `digest_log`
```sql
CREATE TABLE digest_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  triggered_by TEXT,               -- 'schedule' | 'command' | 'manual'
  sent_at INTEGER NOT NULL,
  message_ts TEXT,                 -- Slack message timestamp for potential updates
  snapshot TEXT                    -- JSON snapshot of digest content
);
```

### 6.3 Token Storage

All API tokens (Slack bot token, Slack user token, Jira PAT, Graph tokens) are stored exclusively in `.env`. The `.env` file is gitignored and never committed. No tokens are stored in the database for MVP.

This keeps the architecture simple and auditable: you can see exactly what credentials exist by reading `.env.example`, and revocation is as simple as rotating the token at the source (Atlassian/Slack/Azure) and updating `.env`.

---

## 7. Security & Safety Constraints

### 7.1 Confirmation-by-default principle

All actions that affect external systems or are visible to others require explicit user confirmation unless the user has opted in to auto mode for that specific feature:

| Action | Default | Auto-mode available? |
|--------|---------|---------------------|
| Create calendar event | Confirm | No |
| Set Slack status | Confirm | Yes (focus mode: auto on command) |
| Set Slack DND | Confirm | Yes (focus mode: auto on command) |
| WFH status mirror | Confirm | Yes (user opt-in) |
| Add context to tasks | Confirm | No |
| Jira transitions | Confirm | No (future feature) |
| Posting to channels | Never — DM only, enforced at code level | No |

### 7.2 Scope minimization

- **Slack:** No `channels:write`, `groups:write`, or `chat:write.public` scope requested. The bot's `chat:write` scope is used exclusively to open and post to the user's personal DM. Any code path that constructs a `chat.postMessage` call MUST use the DM channel ID opened via `conversations.open(SLACK_USER_ID)` — never a channel ID from event payloads.
- **Jira:** Read-only PAT for MVP. Transition/write scope only when (and if) issue status updates are built.
- **Graph:** `Calendars.Read` by default; `Calendars.ReadWrite` only when event creation is enabled and user has confirmed they want it.

### 7.3 Message filtering for context capture

- Context capture does NOT read or log all channel messages. It processes messages that pass a fast local pre-filter (regex on keywords).
- Message content is not stored persistently; only the extracted structured metadata (type, date, permalink) is saved.
- The raw message text sent to Claude is not retained after the API call.
- Channel scope is controlled entirely by Slack membership: the bot only receives events from channels it has been invited to. The user adds/removes the bot from channels as desired. No additional allowlist config needed.

### 7.4 Data handling

- No Jira ticket contents (beyond key, summary, status, priority) are stored.
- No calendar event body/description is read or stored — only title, date, and WFH/OOO keyword presence.
- Digest snapshots stored in `digest_log.snapshot` are for debugging; can be disabled in production config.

---

## 8. Repository Structure

```
CtrlShift/
├── ARCHITECTURE.md              ← This document
├── README.md                    ← Quick start and overview
├── .gitignore
├── .env.example                 ← Template for required env vars
│
├── src/
│   ├── index.ts                 ← Entry point; wires up Bolt + scheduler
│   ├── config.ts                ← Loads and validates env config
│   │
│   ├── slack/
│   │   ├── receiver.ts          ← Bolt app setup, event/command/action routing
│   │   ├── blocks.ts            ← Block Kit builders (digest, prompts, confirmations)
│   │   └── actions.ts           ← Interaction handlers (button clicks)
│   │
│   ├── agent/
│   │   ├── loop.ts              ← Claude tool-use orchestration loop
│   │   ├── tools.ts             ← Tool definitions (Anthropic SDK format)
│   │   ├── prompts.ts           ← System prompts per skill context
│   │   └── types.ts             ← Shared agent types
│   │
│   ├── skills/
│   │   ├── daily-digest/
│   │   │   ├── SKILL.md         ← Skill manifest (purpose, inputs, outputs, examples)
│   │   │   ├── index.ts         ← Skill entry point
│   │   │   └── compose.ts       ← Digest composition logic
│   │   │
│   │   ├── prioritizer/
│   │   │   ├── SKILL.md
│   │   │   ├── index.ts
│   │   │   └── score.ts         ← Scoring algorithm
│   │   │
│   │   ├── context-extractor/
│   │   │   ├── SKILL.md
│   │   │   ├── index.ts
│   │   │   └── prefilter.ts     ← Regex pre-filter before Claude call
│   │   │
│   │   ├── focus-planner/
│   │   │   ├── SKILL.md
│   │   │   ├── index.ts
│   │   │   └── duration.ts      ← Duration parsing
│   │   │
│   │   └── task-store/
│   │       ├── SKILL.md
│   │       ├── index.ts
│   │       └── operations.ts    ← CRUD operations
│   │
│   ├── adapters/
│   │   ├── slack.ts             ← Slack API wrapper
│   │   ├── jira.ts              ← Jira REST API wrapper
│   │   └── graph.ts             ← Microsoft Graph API wrapper
│   │
│   ├── state/
│   │   ├── db.ts                ← SQLite connection + migration runner
│   │   ├── migrations/          ← SQL migration files (001_initial.sql, etc.)
│   │   └── repositories/
│   │       ├── users.ts
│   │       ├── tasks.ts
│   │       ├── context.ts
│   │       └── focus.ts
│   │
│   └── scheduler/
│       └── index.ts             ← Cron job setup (morning digest, nudges)
│
├── config/
│   ├── jira-stages.json         ← Status → stage mapping (overridable per-user in DB)
│   └── calendar-keywords.json   ← WFH/OOO keyword lists
│
├── dev/
│   ├── mock-jira.json           ← Sample Jira issues for demo/dev
│   └── mock-calendar.json       ← Sample calendar events for demo/dev
│
├── package.json
├── tsconfig.json
└── docker-compose.yml           ← Optional: local dev with ngrok tunnel
```

---

## 9. MVP Scope

The following defines the minimum coherent demo. Anything beyond this is a stretch goal.

### MVP: Must have

- [ ] Slack App registered with required scopes
- [ ] `/daily-update` command → sends digest DM with manual tasks + mock Jira issues
- [ ] `/focus <duration>` command → DND + status set after confirmation
- [ ] Manual task management: `/task add`, `/task list`, `/task done`
- [ ] Morning digest scheduled DM (configurable time)
- [ ] Context capture: detect "release <date>" in monitored channels → DM with confirm prompt
- [ ] Jira workflow bucket logic with mock data (Analysis / Development / Test stages)
- [ ] Prioritizer with scoring logic
- [ ] Enthusiastic greeting + optional joke in digest
- [ ] SQLite state: tasks, preferences, digest log
- [ ] `.env.example` with all required variables documented
- [ ] `dev/mock-jira.json` so demo works without live Jira

### MVP: Nice-to-have (include if time allows)

- [ ] Real Jira OAuth PAT integration (live ticket pull)
- [ ] Calendar event creation on context capture confirm (requires Graph)
- [ ] WFH/OOO status mirroring from Outlook calendar
- [ ] Focus end-of-block check-in DM
- [ ] Break/hydration nudges (opt-in)
- [ ] Jira reprioritize prompt when release context is found

### Stretch goals (post-MVP)

- [ ] Full Jira OAuth 2.0 flow (vs PAT)
- [ ] Full MS Graph OAuth flow for calendar
- [ ] After-hours detection and gentle wrap-up nudges
- [ ] `/task link` to associate manual task with Jira key
- [ ] Focus history / productivity summary
- [ ] Settings command `/ctrlshift settings` with Block Kit UI

---

## 10. Implementation Phases

### Phase 1 — Foundation (Backend skeleton + Slack wiring)

**Goal:** Slack bot is running, can receive commands, and responds with static content.

1. Initialize Node.js + TypeScript project (`package.json`, `tsconfig.json`)
2. Install Slack Bolt SDK, Anthropic SDK, better-sqlite3, node-cron
3. Create `.env.example` with all required variables
4. Implement `src/slack/receiver.ts` — Bolt app wiring
5. Implement `/daily-update` command with a hardcoded "hello" response (smoke test)
6. Implement `/focus` command with echo response
7. Implement `/task` command with basic parsing
8. Set up SQLite and run initial migration (`001_initial.sql`)
9. Verify bot responds in Slack workspace

**Exit criteria:** Bot responds to all three slash commands in a real Slack workspace.

### Phase 2 — Task Store + Static Digest

**Goal:** Task CRUD works; digest renders with mock data (no Claude, no Jira yet).

1. Implement `skills/task-store/` — add, list, done, remove
2. Implement `src/state/repositories/tasks.ts`
3. Implement Block Kit digest template in `src/slack/blocks.ts`
4. Implement `skills/daily-digest/compose.ts` — deterministic layout from mock data
5. Load mock Jira from `dev/mock-jira.json`
6. Apply prioritizer scoring logic to mock issues
7. Render full digest DM on `/daily-update`
8. Add morning digest cron job (triggers `/daily-update` flow for configured user)

**Exit criteria:** `/daily-update` sends a well-formatted digest with mock Jira issues and manual tasks.

### Phase 3 — Agent Loop + Claude Integration

**Goal:** Claude generates greeting, joke, suggested focus reason, and context extraction.

1. Implement `src/agent/loop.ts` — Claude tool-use orchestration
2. Implement `src/agent/tools.ts` — tool definitions for all skill capabilities
3. Implement `src/agent/prompts.ts` — system prompts
4. Wire digest composition to call Claude for: greeting, joke, `suggestedFocus.reason`
5. Implement `skills/context-extractor/` — regex pre-filter + Claude structured extraction
6. Implement context capture event listener (Slack `message` events)
7. Implement DM prompt for context capture with confirm/ignore buttons
8. Handle button interactions in `src/slack/actions.ts`

**Exit criteria:** Digest has Claude-generated greeting and suggested focus reason. Context capture DM appears when a release-date message is posted in a monitored channel.

### Phase 4 — Focus Mode

**Goal:** Full focus flow: command → confirm → DND + status set → end check-in.

1. Implement `skills/focus-planner/` — duration parsing, status/DND plan generation
2. Implement `src/adapters/slack.ts` — set DND, set status, clear status
3. Wire `/focus` command through focus planner → confirmation block → execution
4. Implement focus session tracking in DB
5. Schedule end-of-focus DM check-in
6. Clear DND + status on focus end or cancel

**Exit criteria:** `/focus 2h` results in DND being set and Slack status reflecting the focus block.

### Phase 5 — Optional Integrations

**Goal:** Real Jira data + optional calendar features.

1. Implement `src/adapters/jira.ts` — JQL fetch, status mapping
2. Add Jira PAT config + fallback to mock if not configured
3. Implement `src/adapters/graph.ts` — calendar read + event create
4. WFH/OOO keyword detection → Slack status prompt
5. Calendar event creation from context capture confirm
6. Test full end-to-end flow with real Jira issues

**Exit criteria:** Digest shows live Jira issues; context capture offers to create real calendar event.

### Phase 6 — Polish + Demo Prep

1. Error handling and user-facing error messages (friendly, not stack traces)
2. Edge cases: no tasks, no Jira issues, Jira offline, Graph offline
3. Demo script and sample data in `dev/`
4. `README.md` with setup instructions
5. Final review of all confirmation flows (no accidental actions)

---

## 11. Open Questions & Decisions

All open questions resolved. Summary of decisions:

| # | Question | Decision |
|---|----------|----------|
| 1 | **Backend language** | ✅ Node.js (TypeScript) |
| 2 | **Jira auth method** | ✅ PAT in `.env`, no OAuth flow |
| 3 | **Slack token storage** | ✅ All tokens in `.env`; no DB token columns |
| 4 | **Bot write scope** | ✅ Personal DM only — never posts to channels |
| 5 | **Scoring weights** | ✅ User-configurable via `priority_rules` JSON; `pinToTop` for hard overrides |
| 6 | **Context capture channel scope** | ✅ All channels the bot has been invited to; user manages via `/invite` and `/kick` in Slack |
| 7 | **Joke source** | ✅ Claude on-the-fly with safe/work-appropriate prompt constraint |
| 8 | **Deployment target** | ✅ Local + ngrok for now; revisit later |
| 9 | **Graph OAuth flow** | ✅ Device code flow — one-time `npm run auth:graph` script; tokens saved to `.env` |
| 10 | **Block Kit vs plain text** | ✅ Hybrid: Block Kit for structured/interactive content; plain text for conversational nudges and quick replies |

---

## Appendix A — Environment Variables

All secrets live exclusively in `.env` (gitignored). Copy `.env.example` to `.env` and fill in values.

```bash
# ── Slack ──────────────────────────────────────────────────────────────
SLACK_BOT_TOKEN=xoxb-...           # Bot token from Slack App > OAuth & Permissions
SLACK_USER_TOKEN=xoxp-...          # User token (needed for DND + profile writes)
SLACK_SIGNING_SECRET=...           # From Slack App > Basic Information
SLACK_APP_TOKEN=xapp-...           # For Socket Mode (skip if using public URL + ngrok)
SLACK_USER_ID=U...                 # Your own Slack user ID — the one user this bot serves

# ── Claude / Anthropic ─────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ── Jira (optional — omit to use mock data) ────────────────────────────
JIRA_BASE_URL=https://yourorg.atlassian.net
JIRA_USER_EMAIL=user@example.com
JIRA_API_TOKEN=...                 # Generate at: id.atlassian.com > Security > API tokens

# ── Microsoft Graph / Outlook (optional) ───────────────────────────────
AZURE_CLIENT_ID=...                # App registration in Azure Portal
AZURE_TENANT_ID=...
# Tokens below are populated by running the device-code auth helper once:
GRAPH_ACCESS_TOKEN=...
GRAPH_REFRESH_TOKEN=...

# ── Storage ────────────────────────────────────────────────────────────
DATABASE_PATH=./data/ctrlshift.db

# ── Server ─────────────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development
```

---

## Appendix B — Jira Stage Mapping (Default)

```json
{
  "Analysis": [
    "To Do", "Backlog", "Open", "New", "In Analysis",
    "Requirement Gathering", "Grooming", "Refinement"
  ],
  "Development": [
    "In Progress", "In Development", "Coding", "Implementation",
    "In Review", "Code Review", "PR Open"
  ],
  "Test": {
    "ReadyToTest": ["Ready for QA", "Ready to Test", "QA Queue", "Awaiting QA"],
    "InTest": ["In QA", "Testing", "Test In Progress", "QA In Progress"],
    "TestFailed": ["QA Failed", "Test Failed", "Failed", "Reopen", "Reopened", "Returned"],
    "TestPassed": ["QA Passed", "Test Passed", "Verified", "Done (Pending Release)", "Approved"]
  }
}
```

---

## Appendix C — Block Kit Digest Template (Sketch)

```
[Header] CtrlShift+ Daily Digest — Monday, March 3

[Section] Goooood morning! Hope you feel well-rested today! ☀️
[Context] Here's a quick one: Why do programmers prefer dark mode? Because light attracts bugs!

[Divider]

[Section] 🎯 Suggested Focus
[Section] DVLS-1234 — Fix regression in auth flow
[Context] Test failed · Release scheduled March 12 · Elevated priority

[Divider]

[Section] 📌 Manual Tasks
• [ ] Write API docs — token refresh endpoint
• [ ] Review PR from Sarah — config loader

[Divider]

[Section] 🔬 Analysis
[Section] DVLS-1102  In Analysis  High
Investigate session timeout on mobile

[Divider]

[Section] 🛠️ Development
[Section] DVLS-0982  In Dev  Medium
Implement new onboarding wizard

[Divider]

[Section] 🔄 Review / Test Cycle
[Section] 🔴 Test Failed  DVLS-1234  Fix regression in auth flow
[Section] 🟡 Ready to Test  DVLS-1201  Update Docker base image
[Section] 🟢 Test Passed  DVLS-1189  Add MFA backup codes UI

[Divider]

[Actions] [▶ Start Focus]  [🔁 Refresh]  [⚙ Settings]
```

---

*This document is the authoritative planning reference for the CtrlShift+ implementation. It should be updated as decisions are made and scope evolves.*
