# CtrlShift+

**A Slack-native personal workflow assistant for developers.**

CtrlShift+ lives in your Slack workspace and helps you manage your workday without context-switching. It knows your Jira board, your manual tasks, your calendar, and — most importantly — what you should be working on right now.

---

## What it does

| Feature | How to use it |
|---------|--------------|
| **Morning digest** | Sent automatically at your configured time — tasks, Jira issues grouped by workflow stage, and a single suggested focus item |
| **On-demand update** | `/daily-update` — refreshes your digest any time |
| **Focus mode** | `/focus 2h` — sets Slack DND + status for the duration; optional break reminder at midpoint |
| **Task management** | `/task add`, `/task list`, `/task done`, `/task remove`, `/task link` |
| **Context capture** | Bot watches channels you invite it to and notices release dates, deadlines, and milestones — then DMs you privately to ask what to do with them |
| **WFH/OOO mirroring** | Reads your Outlook calendar and offers to update your Slack status (opt-in) |

Everything the bot sends goes to your **personal DM only** — it never posts to channels.

---

## Prioritization

The digest is sorted by a configurable scoring system, not by Jira priority alone. By default:

- **Test Cycle > Development > Analysis** (stage weight)
- **Test Failed** is heavily boosted
- **Regressions** are tagged and can be pinned to the top
- **Release context** (upcoming deadline) further boosts test-failed and regression tickets

You control the weights and the "pin-to-top" rules via your preferences. Setting `pinToTop: ["regression"]` makes every regression ticket float above everything else, regardless of its Jira priority.

---

## Quick start

### 1. Clone and install
```bash
git clone https://github.com/Skyzreal/CtrlShift.git
cd CtrlShift
npm install
```

### 2. Create a Slack App
1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App → From scratch
2. Under **OAuth & Permissions**, add bot scopes: `chat:write`, `im:write`, `commands`, `channels:history`, `groups:history`, `im:history`, `reactions:write`
3. Add user scopes: `dnd:write`, `users.profile:write`
4. Install the app to your workspace
5. Under **Basic Information** → App-Level Tokens → create one with `connections:write` scope (for Socket Mode)
6. Add slash commands: `/daily-update`, `/focus`, `/task` (Request URL can be anything for Socket Mode)

### 3. Configure environment
```bash
cp .env.example .env
# Fill in your tokens — see .env.example for descriptions
```

### 4. Run
```bash
npm run dev
```

The bot starts, runs DB migrations, and prints a startup summary. Try `/daily-update` in Slack.

---

## Integrations

| Integration | Status | Setup |
|-------------|--------|-------|
| Slack | Required | Bot + user token in `.env` |
| Jira | Optional | Add `JIRA_BASE_URL` + `JIRA_API_TOKEN` to `.env`; falls back to mock data |
| Outlook/Calendar | Optional | Run `npm run auth:graph` for a one-time device code flow |

Without Jira credentials the bot uses `dev/mock-jira.json` — the full digest, scoring, and focus flow all work with mock data.

---

## Project structure

```
src/
  skills/          # Core logic units (digest, prioritizer, focus, tasks, context)
  adapters/        # External API wrappers (Slack, Jira, Graph)
  slack/           # Bolt app, Block Kit builders, action handlers
  state/           # SQLite + repositories
  agent/           # Claude integration (Phase 3+)
  scheduler/       # Cron jobs
config/            # Stage mapping, calendar keywords
dev/               # Mock data for local development
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design document.

---

## Implementation status

- [x] Phase 1 — Project setup, Slack commands (skeleton)
- [x] Phase 2 — Task CRUD, digest with mock Jira data, Block Kit rendering, morning scheduler
- [ ] Phase 3 — Claude integration (greeting, joke, focus reason, context extraction)
- [ ] Phase 4 — Full focus mode (DND + status + end check-in)
- [ ] Phase 5 — Live Jira + Outlook calendar
- [ ] Phase 6 — Polish + demo prep
