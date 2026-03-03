# CtrlShift+ — Setup Guide: Getting Your Tokens & API Keys

This guide walks you through getting every credential CtrlShift+ needs to run. It is written for anyone — you do not need to be a developer to follow it.

> **Security reminder:** Treat every token and key in this guide like a password. Never share them, never paste them into a chat or email, and never commit your `.env` file to Git (the project's `.gitignore` already prevents this).

---

## Table of Contents

1. [Overview — what you will need](#1-overview--what-you-will-need)
2. [Slack — creating the app](#2-slack--creating-the-app)
3. [Slack — bot token](#3-slack--bot-token-slack_bot_token)
4. [Slack — user token](#4-slack--user-token-slack_user_token)
5. [Slack — signing secret](#5-slack--signing-secret-slack_signing_secret)
6. [Slack — app token (Socket Mode)](#6-slack--app-token-slack_app_token)
7. [Slack — your user ID](#7-slack--your-user-id-slack_user_id)
8. [Anthropic API key](#8-anthropic-api-key-anthropic_api_key)
9. [Jira API token (optional)](#9-jira-api-token-optional)
10. [Microsoft Graph / Outlook (optional)](#10-microsoft-graph--outlook-optional)
11. [Putting it all together](#11-putting-it-all-together)
12. [Verifying it works](#12-verifying-it-works)

---

## 1. Overview — what you will need

Here is a plain-English summary of every credential and why CtrlShift+ needs it:

| Credential | What it is | Why it is needed | Required? |
|------------|-----------|-----------------|-----------|
| `SLACK_BOT_TOKEN` | A key that lets the app act as a Slack bot | Sending you messages and responding to commands | **Yes** |
| `SLACK_USER_TOKEN` | A key that lets the app act as *you* in Slack | Setting your Do Not Disturb and Slack status | **Yes** (for focus mode) |
| `SLACK_SIGNING_SECRET` | A secret that proves Slack events are genuine | Security — prevents fake requests | **Yes** |
| `SLACK_APP_TOKEN` | A key for maintaining a persistent connection to Slack | Lets the bot run without a public web address | **Yes** (for Socket Mode) |
| `SLACK_USER_ID` | Your personal Slack ID | Tells the bot who to send messages to | **Yes** |
| `ANTHROPIC_API_KEY` | A key for the Claude AI API | Generating your greeting, jokes, and focus reasons | **Yes** |
| `JIRA_BASE_URL` + `JIRA_API_TOKEN` | Your Jira instance address and an API key | Pulling your assigned tickets live | **No** — uses demo data if omitted |
| `AZURE_CLIENT_ID` + `AZURE_TENANT_ID` | Identifiers for a Microsoft app registration | Connecting to your Outlook calendar | **No** — calendar features skipped if omitted |

---

## 2. Slack — creating the app

You only do this once. It takes about 10 minutes.

### Step 1 — Create a new Slack app

1. Open your browser and go to **https://api.slack.com/apps**
2. Click the green **Create New App** button (top right)
3. A dialog appears — choose **From scratch**
4. In the **App Name** field, type: `CtrlShift+`
5. Under **Pick a workspace to develop your app in**, choose your Slack workspace from the dropdown
6. Click **Create App**

You will land on the app's Basic Information page. Keep this tab open — you will come back to it several times.

---

### Step 2 — Add the required permissions

The bot needs specific permissions to do its job. Slack calls these "scopes."

1. In the left sidebar, click **OAuth & Permissions**
2. Scroll down to the **Scopes** section
3. You will see two boxes: **Bot Token Scopes** and **User Token Scopes**

**Under Bot Token Scopes**, click **Add an OAuth Scope** and add each of these one at a time:

| Scope | What it allows |
|-------|---------------|
| `chat:write` | Send messages to your DM |
| `im:write` | Open a direct message conversation with you |
| `commands` | Respond to slash commands (`/daily-update`, `/focus`, `/task`) |
| `channels:history` | Read channel messages for context capture |
| `groups:history` | Read private channel messages for context capture |
| `im:history` | Read direct message history |
| `reactions:write` | Add emoji reactions in your DM |

**Under User Token Scopes**, add:

| Scope | What it allows |
|-------|---------------|
| `dnd:write` | Set Do Not Disturb on your behalf |
| `users.profile:write` | Set your Slack status on your behalf |

### Step 3 — Add the slash commands

1. In the left sidebar, click **Slash Commands**
2. Click **Create New Command** and add three commands:

| Command | Short Description | Usage Hint |
|---------|------------------|-----------|
| `/daily-update` | Get your daily digest | _(leave blank)_ |
| `/focus` | Start a focus block | `[duration] [task]` |
| `/task` | Manage your tasks | `add \| list \| done \| remove` |

For **Request URL**, enter any placeholder for now (e.g. `https://example.com/slack`). You can leave it — Socket Mode does not use this URL.

3. Click **Save** after adding each command.

### Step 4 — Enable Socket Mode

Socket Mode lets CtrlShift+ connect to Slack without needing a public web address. This is required for running it locally.

1. In the left sidebar, click **Socket Mode**
2. Toggle **Enable Socket Mode** to **On**
3. A dialog will ask you to name an App-Level Token — type `ctrlshift-socket`
4. Make sure the scope `connections:write` is shown
5. Click **Generate**
6. Copy the token that appears (it starts with `xapp-`) — you will use this shortly

### Step 5 — Enable Event Subscriptions

This lets the bot listen for messages in channels (for context capture).

1. In the left sidebar, click **Event Subscriptions**
2. Toggle **Enable Events** to **On**
3. In the **Subscribe to bot events** section, add:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `app_mention`
4. Click **Save Changes**

### Step 6 — Install the app

1. In the left sidebar, click **OAuth & Permissions**
2. Scroll back to the top and click **Install to Workspace**
3. Slack will show you a permission screen listing what the app can do — click **Allow**

The page will reload and show you two tokens. You need both.

---

## 3. Slack — bot token (`SLACK_BOT_TOKEN`)

After installing the app in Step 6 above, you will see a section called **OAuth Tokens for Your Workspace**.

1. Find the line that says **Bot User OAuth Token**
2. Click **Copy** next to the token (it starts with `xoxb-`)
3. Paste it into your `.env` file:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token-here
   ```

> This token lets the bot send messages. Keep it private.

---

## 4. Slack — user token (`SLACK_USER_TOKEN`)

On the same OAuth & Permissions page:

1. Find the line that says **User OAuth Token**
2. Click **Copy** next to the token (it starts with `xoxp-`)
3. Paste it into your `.env` file:
   ```
   SLACK_USER_TOKEN=xoxp-your-token-here
   ```

> This token lets the bot set *your* Do Not Disturb and Slack status. It acts as you, which is why it requires separate user-level permission.

---

## 5. Slack — signing secret (`SLACK_SIGNING_SECRET`)

1. In the left sidebar, click **Basic Information**
2. Scroll down to the **App Credentials** section
3. Find **Signing Secret** — click **Show** to reveal it
4. Click **Copy**
5. Paste it into your `.env` file:
   ```
   SLACK_SIGNING_SECRET=your-signing-secret-here
   ```

> This secret is used to verify that events really come from Slack and not from someone pretending to be Slack.

---

## 6. Slack — app token (`SLACK_APP_TOKEN`)

You generated this token in Step 4 above (it starts with `xapp-`). If you did not copy it at the time:

1. In the left sidebar, click **Basic Information**
2. Scroll to **App-Level Tokens**
3. Click on the token name (`ctrlshift-socket`) to reveal it
4. Click **Copy**
5. Paste it into your `.env` file:
   ```
   SLACK_APP_TOKEN=xapp-your-token-here
   ```

> This token maintains the persistent connection between the bot and Slack so it does not need a public web address.

---

## 7. Slack — your user ID (`SLACK_USER_ID`)

This tells the bot who it is serving (you). It is not a secret, but it must be your own Slack member ID.

**To find it in the Slack desktop app:**
1. Click on your name or profile picture (top-right or in the left sidebar)
2. Click **View full profile**
3. In your profile panel, click the **three dots** (⋯) icon
4. Click **Copy member ID**

**To find it in Slack on the web:**
1. Click your name in the sidebar
2. In your profile popup, click **View full profile**
3. Click the **three dots** (⋯) icon → **Copy member ID**

The ID starts with the letter `U` followed by letters and numbers (e.g. `U04ABCDE123`).

Paste it into your `.env` file:
```
SLACK_USER_ID=U04ABCDE123
```

---

## 8. Anthropic API key (`ANTHROPIC_API_KEY`)

The Anthropic API key gives CtrlShift+ access to Claude, which generates your morning greeting, jokes, and suggested focus reasons.

1. Open your browser and go to **https://console.anthropic.com**
2. Sign in (or create a free account if you do not have one)
3. Once signed in, click **API Keys** in the left sidebar
4. Click **Create Key**
5. Give it a name like `ctrlshift-plus`
6. Click **Create Key**
7. **Copy the key immediately** — it is only shown once (it starts with `sk-ant-`)
8. Paste it into your `.env` file:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

> **Important:** The key is only shown once. If you close the dialog without copying it, you will need to create a new one.

> **Billing note:** The Anthropic API is a paid service, but the cost for personal use of CtrlShift+ is very low (typically a few cents per day). New accounts may include free credits.

---

## 9. Jira API token (optional)

Skip this section if you are happy using the built-in demo data. CtrlShift+ works fully without a live Jira connection.

If you do set this up, the digest will show your actual assigned tickets instead of the sample data.

### What you need

Three values: your Jira site URL, your email address, and an API token.

### Step 1 — Get your Jira base URL

This is the web address of your Jira instance. It looks like:
- `https://yourcompany.atlassian.net` (Jira Cloud)
- Or a custom domain if your company hosts Jira itself

Open Jira in your browser and copy the part of the address up to and including `.atlassian.net` (or your company's domain). Do not include anything after it.

```
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_USER_EMAIL=you@yourcompany.com
```

### Step 2 — Create a Jira API token

1. Open your browser and go to **https://id.atlassian.com/manage-profile/security/api-tokens**
   (You must be signed in to Atlassian)
2. Click **Create API token**
3. In the label field, type `ctrlshift-plus`
4. Click **Create**
5. Click **Copy** next to the token that appears
6. Paste it into your `.env` file:
   ```
   JIRA_API_TOKEN=your-jira-token-here
   ```

> This token gives CtrlShift+ read-only access to your Jira tickets. It cannot create or modify anything.

---

## 10. Microsoft Graph / Outlook (optional)

Skip this section if you do not need calendar integration. The morning digest and all other features work without it.

If you set this up, CtrlShift+ can:
- Detect WFH/OOO/Vacation in your calendar and offer to update your Slack status
- Create calendar events when it detects a release date in a Slack message

This is the most involved setup step. It requires access to Microsoft Azure. If you are doing this in a work environment, your IT department may need to assist.

### Step 1 — Register an app in Azure

1. Open your browser and go to **https://portal.azure.com**
2. Sign in with your Microsoft account (the same one linked to Outlook/Teams)
3. In the search bar at the top, search for **App registrations** and click it
4. Click **New registration**
5. Fill in the form:
   - **Name:** `CtrlShift+`
   - **Supported account types:** choose **Accounts in this organizational directory only** (if work account) or **Personal Microsoft accounts only** (if personal)
   - **Redirect URI:** leave blank for now
6. Click **Register**

You are now on the app's Overview page.

### Step 2 — Copy your client and tenant IDs

On the Overview page you will see two IDs:

- **Application (client) ID** — copy this
- **Directory (tenant) ID** — copy this

Paste them into your `.env` file:
```
AZURE_CLIENT_ID=paste-application-client-id-here
AZURE_TENANT_ID=paste-directory-tenant-id-here
```

### Step 3 — Add calendar permissions

1. In the left sidebar, click **API permissions**
2. Click **Add a permission**
3. Click **Microsoft Graph**
4. Click **Delegated permissions**
5. Search for `Calendars` and check:
   - `Calendars.Read`
   - `Calendars.ReadWrite`
6. Click **Add permissions**

### Step 4 — Run the one-time authentication script

Once your `.env` file has `AZURE_CLIENT_ID` and `AZURE_TENANT_ID`, run this command in the project folder:

```bash
npm run auth:graph
```

The script will:
1. Print a URL and a short code (e.g. `ABCD-1234`)
2. Open your browser to `https://microsoft.com/devicelogin`
3. Ask you to enter the code
4. Ask you to sign in with your Microsoft account
5. Ask you to grant the calendar permissions you added above

After you approve, the script saves `GRAPH_ACCESS_TOKEN` and `GRAPH_REFRESH_TOKEN` directly into your `.env` file. You do not need to do this again unless the tokens expire (they refresh automatically at runtime).

> **Work accounts:** Your IT or Azure administrator may need to grant admin consent for the calendar permissions before you can complete this step. Ask them to approve the `Calendars.ReadWrite` permission for the app registration you created.

---

## 11. Putting it all together

Your completed `.env` file should look like this (with your actual values):

```bash
# ── Slack ──────────────────────────────────────────────────────────────
SLACK_BOT_TOKEN=xoxb-...
SLACK_USER_TOKEN=xoxp-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...
SLACK_USER_ID=U...

# ── Claude / Anthropic ─────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ── Jira (leave blank to use demo data) ────────────────────────────────
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_USER_EMAIL=you@yourcompany.com
JIRA_API_TOKEN=...

# ── Microsoft Graph (leave blank to skip calendar features) ────────────
AZURE_CLIENT_ID=...
AZURE_TENANT_ID=...
GRAPH_ACCESS_TOKEN=...        # filled automatically by npm run auth:graph
GRAPH_REFRESH_TOKEN=...       # filled automatically by npm run auth:graph

# ── Storage ────────────────────────────────────────────────────────────
DATABASE_PATH=./data/ctrlshift.db

# ── Server ─────────────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development
```

Leave any optional value blank (or remove the line entirely) if you are skipping that integration. The bot will start fine and skip the features that need it.

---

## 12. Verifying it works

Once your `.env` is filled in, start the bot:

```bash
npm run dev
```

You should see output like this:
```
🚀 Starting CtrlShift+...
💾 Initialising database...
  ✓ Migration applied: 001_initial.sql
⚡ CtrlShift+ running in Socket Mode

✅ CtrlShift+ is ready!
   User:      U04ABCDE123
   Mode:      Socket Mode
   Jira:      mock data         ← or your Jira URL
   Calendar:  not configured    ← or "Graph connected"

   Try: /daily-update  /focus 2h  /task add <title>
```

Go to Slack and type `/daily-update`. The bot should send you a DM with your digest within a few seconds.

### Common problems

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `Missing required environment variable: SLACK_BOT_TOKEN` | `.env` file not found or variable not set | Make sure the file is named `.env` (not `.env.example`) and is in the project root |
| Bot does not respond to commands | App not installed in the workspace, or slash commands not saved | Re-check Step 6 (Install to workspace) and Step 3 (Slash commands) |
| `/focus` says it cannot set DND/status | `SLACK_USER_TOKEN` missing or missing `dnd:write` scope | Check that you added the user token scopes and re-installed the app after adding them |
| `Could not open DM channel` | `SLACK_USER_ID` is wrong | Double-check by copying your member ID from your Slack profile again |
| `SSL certificate` error on startup (corporate network) | Corporate proxy intercepts HTTPS | Run: `git config http.sslBackend schannel` (Windows) or ask your IT team |

---

## Security checklist

Before you start:

- [ ] The `.env` file is in the project folder and **not** committed to Git (check with `git status` — it should not appear)
- [ ] You have not shared any token in a chat, email, or document
- [ ] Each token has the minimum scopes listed above — no more
- [ ] If you stop using CtrlShift+, revoke the tokens:
  - Slack: **api.slack.com/apps** → your app → Revoke tokens
  - Jira: **id.atlassian.com** → API tokens → Revoke
  - Anthropic: **console.anthropic.com** → API Keys → Delete
  - Graph: **portal.azure.com** → App registrations → Delete app registration
