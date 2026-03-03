import { App, LogLevel } from '@slack/bolt';
import { config } from '../config';
import { getOrCreateUser } from '../state/repositories/users';
import { buildDigest } from '../skills/daily-digest';
import { buildDigestBlocks, buildFocusConfirmBlocks } from './blocks';
import { sendDm, sendDmText } from '../adapters/slack';
import { planFocus, DurationParseError } from '../skills/focus-planner';
import { opAdd, opList, opDone, opRemove, opLink } from '../skills/task-store/operations';
import { hasEventCandidate } from '../skills/context-extractor/prefilter';
import { registerActions } from './actions';

const TASK_HELP =
  'Usage:\n' +
  '• `/task add <title>` — add a task\n' +
  '• `/task list` — show pending tasks\n' +
  '• `/task done <#>` — mark task done\n' +
  '• `/task remove <#>` — remove task\n' +
  '• `/task link <#> <JIRA-KEY>` — link to Jira';

export function createApp(): App {
  const appOptions = config.SLACK_APP_TOKEN
    ? {
        token: config.SLACK_BOT_TOKEN,
        signingSecret: config.SLACK_SIGNING_SECRET,
        socketMode: true,
        appToken: config.SLACK_APP_TOKEN,
        logLevel: config.NODE_ENV === 'development' ? LogLevel.WARN : LogLevel.ERROR,
      }
    : {
        token: config.SLACK_BOT_TOKEN,
        signingSecret: config.SLACK_SIGNING_SECRET,
        logLevel: config.NODE_ENV === 'development' ? LogLevel.WARN : LogLevel.ERROR,
      };

  const app = new App(appOptions);

  // ── /daily-update ────────────────────────────────────────────────

  app.command('/daily-update', async ({ command, ack, respond }) => {
    await ack();
    getOrCreateUser(command.user_id);

    try {
      await respond({ response_type: 'ephemeral', text: '📬 Fetching your digest...' });
      const payload = await buildDigest(command.user_id, 'command');
      const blocks = buildDigestBlocks(payload);
      await sendDm(blocks, 'Your daily digest');
    } catch (err) {
      console.error('[/daily-update]', err);
      await respond({
        response_type: 'ephemeral',
        text: '❌ Something went wrong building your digest. Check the logs.',
      });
    }
  });

  // ── /focus ───────────────────────────────────────────────────────

  app.command('/focus', async ({ command, ack, respond }) => {
    await ack();

    const text = command.text.trim();
    if (!text) {
      await respond({
        response_type: 'ephemeral',
        text: 'Usage: `/focus 2h` or `/focus 90m DVLS-1234 — fix the login bug`\nSupported durations: `2h`, `90m`, `1.5h`, `45min`',
      });
      return;
    }

    // First token = duration, rest = optional task description
    const [durationStr, ...rest] = text.split(/\s+/);
    const taskTitle = rest.length > 0 ? rest.join(' ') : null;

    try {
      const user = getOrCreateUser(command.user_id);
      const plan = planFocus({
        durationStr,
        focusTaskKey: null,
        focusTaskTitle: taskTitle,
        userTimezone: user.timezone,
      });

      await respond({
        response_type: 'ephemeral',
        blocks: buildFocusConfirmBlocks(plan),
      });
    } catch (err) {
      if (err instanceof DurationParseError) {
        await respond({ response_type: 'ephemeral', text: `❌ ${err.message}` });
      } else {
        console.error('[/focus]', err);
        await respond({ response_type: 'ephemeral', text: '❌ Could not plan focus session.' });
      }
    }
  });

  // ── /task ────────────────────────────────────────────────────────

  app.command('/task', async ({ command, ack, respond }) => {
    await ack();
    getOrCreateUser(command.user_id);

    const parts = command.text.trim().split(/\s+/);
    const subcommand = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    switch (subcommand) {
      case 'add': {
        const title = args.join(' ');
        if (!title) {
          await respond({ response_type: 'ephemeral', text: 'Usage: `/task add <title>`' });
          return;
        }
        const task = opAdd(command.user_id, title);
        await respond({
          response_type: 'ephemeral',
          text: `✅ Task added: "${task.title}"`,
        });
        break;
      }

      case 'list': {
        const tasks = opList(command.user_id);
        if (tasks.length === 0) {
          await respond({ response_type: 'ephemeral', text: '_No pending tasks. All clear! 🎉_' });
          return;
        }
        const lines = tasks
          .map((t, i) => {
            const jira = t.jiraKey ? ` _(${t.jiraKey})_` : '';
            return `${i + 1}. ${t.title}${jira}`;
          })
          .join('\n');
        await respond({ response_type: 'ephemeral', text: `*Your pending tasks:*\n${lines}` });
        break;
      }

      case 'done': {
        const n = parseInt(args[0], 10);
        if (isNaN(n) || n < 1) {
          await respond({ response_type: 'ephemeral', text: 'Usage: `/task done <#>`' });
          return;
        }
        const result = opDone(command.user_id, n);
        await respond({ response_type: 'ephemeral', text: result.success ? `✅ ${result.message}` : `❌ ${result.message}` });
        break;
      }

      case 'remove': {
        const n = parseInt(args[0], 10);
        if (isNaN(n) || n < 1) {
          await respond({ response_type: 'ephemeral', text: 'Usage: `/task remove <#>`' });
          return;
        }
        const result = opRemove(command.user_id, n);
        await respond({ response_type: 'ephemeral', text: result.success ? `🗑️ ${result.message}` : `❌ ${result.message}` });
        break;
      }

      case 'link': {
        const n = parseInt(args[0], 10);
        const jiraKey = args[1]?.toUpperCase();
        if (isNaN(n) || !jiraKey) {
          await respond({ response_type: 'ephemeral', text: 'Usage: `/task link <#> <JIRA-KEY>`' });
          return;
        }
        const result = opLink(command.user_id, n, jiraKey);
        await respond({ response_type: 'ephemeral', text: result.success ? `🔗 ${result.message}` : `❌ ${result.message}` });
        break;
      }

      default:
        await respond({ response_type: 'ephemeral', text: TASK_HELP });
    }
  });

  // ── Message events (context capture) ─────────────────────────────

  app.message(async ({ message, client }) => {
    // Only process messages from channels (not the bot's own DMs)
    if (message.subtype) return; // skip edits, deletes, joins, etc.

    const msg = message as { text?: string; ts: string; channel: string; user?: string };
    if (!msg.text || !msg.user) return;
    if (msg.user === config.SLACK_USER_ID) return; // skip our own messages

    if (!hasEventCandidate(msg.text)) return;

    // Phase 3: send to Claude extractor, then DM the user with capture prompt
    // For now, just log that we detected a candidate
    console.log(`[context-capture] Candidate detected in channel ${msg.channel}: "${msg.text.slice(0, 80)}..."`);

    // Get permalink for reference
    try {
      const permalink = await client.chat.getPermalink({
        channel: msg.channel,
        message_ts: msg.ts,
      });
      void permalink; // Phase 3 will use this
    } catch {
      // Non-critical
    }
  });

  // ── App mention ───────────────────────────────────────────────────

  app.event('app_mention', async ({ event }) => {
    // Reply via DM, not in the channel
    await sendDmText(
      `Hey! I don't reply in channels — I'm your personal assistant and only DM you. 🤫\n` +
      `Try \`/daily-update\` for your digest, or \`/focus 2h\` to start a focus block.`
    );
    void event;
  });

  // Register interactive button handlers
  registerActions(app);

  return app;
}

export async function startApp(): Promise<App> {
  const app = createApp();

  if (config.SLACK_APP_TOKEN) {
    // Socket Mode — no port needed
    await app.start();
    console.log('⚡ CtrlShift+ running in Socket Mode');
  } else {
    // HTTP Mode — expose on PORT (use ngrok or similar to get a public URL)
    await app.start(config.PORT);
    console.log(`⚡ CtrlShift+ running on HTTP port ${config.PORT}`);
  }

  return app;
}
