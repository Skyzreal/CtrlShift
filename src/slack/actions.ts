import { App } from '@slack/bolt';
import { FocusPlan } from '../types';
import { planFocus } from '../skills/focus-planner';
import { setDnd, setStatus, sendDmText } from '../adapters/slack';
import { createFocusSession } from '../state/repositories/focus';
import { buildDigest } from '../skills/daily-digest';
import { buildDigestBlocks } from './blocks';
import { sendDm, updateDm } from '../adapters/slack';
import { config } from '../config';

export function registerActions(app: App): void {

  // ── Focus: confirm ────────────────────────────────────────────────

  app.action('focus_confirm', async ({ body, ack, respond }) => {
    await ack();

    let plan: FocusPlan;
    try {
      const rawValue = (body as { actions: Array<{ value: string }> }).actions[0]?.value;
      plan = JSON.parse(rawValue) as FocusPlan;
    } catch {
      await respond({ response_type: 'ephemeral', text: '❌ Invalid focus plan data.' });
      return;
    }

    try {
      await setDnd(plan.dndMinutes);
      await setStatus(plan.statusText, plan.statusEmoji, plan.statusExpiration);
      createFocusSession(
        config.SLACK_USER_ID,
        plan.dndUntilTs,
        null,
        plan.focusTaskTitle
      );
      await respond({
        response_type: 'ephemeral',
        text: `🧠 Focus mode active until ${plan.humanReadableEndTime}. You've got this!`,
        replace_original: true,
      });
    } catch (err) {
      console.error('[focus_confirm] error:', err);
      await respond({
        response_type: 'ephemeral',
        text: '❌ Could not set DND/status. Check that SLACK_USER_TOKEN is set with the right scopes.',
      });
    }
  });

  // ── Focus: cancel ─────────────────────────────────────────────────

  app.action('focus_cancel', async ({ ack, respond }) => {
    await ack();
    await respond({
      response_type: 'ephemeral',
      text: 'Focus cancelled. Whenever you\'re ready! 👍',
      replace_original: true,
    });
  });

  // ── Focus: start from digest ──────────────────────────────────────

  app.action('focus_start_from_digest', async ({ ack, respond }) => {
    await ack();
    await respond({
      response_type: 'ephemeral',
      text: 'Use `/focus 2h` (or any duration) to start a focus block! 🧠',
    });
  });

  // ── Digest: refresh ───────────────────────────────────────────────

  app.action('digest_refresh', async ({ body, ack, respond }) => {
    await ack();
    await respond({ response_type: 'ephemeral', text: '🔁 Refreshing your digest...' });

    try {
      const userId = body.user.id;
      const payload = await buildDigest(userId, 'command');
      const blocks = buildDigestBlocks(payload);

      // Try to update the original DM message if we have its ts
      const msgTs = (body as { message?: { ts?: string } }).message?.ts;
      if (msgTs) {
        await updateDm(msgTs, blocks);
      } else {
        await sendDm(blocks, 'Refreshed digest');
      }
    } catch (err) {
      console.error('[digest_refresh] error:', err);
      await sendDmText('❌ Could not refresh digest. Check the logs.');
    }
  });

  // ── Context capture actions ───────────────────────────────────────

  app.action('capture_add_calendar', async ({ ack, respond }) => {
    await ack();
    // Phase 5: create calendar event
    await respond({
      response_type: 'ephemeral',
      text: '📅 Calendar integration coming in Phase 5! Saved as context for now.',
      replace_original: true,
    });
  });

  app.action('capture_save', async ({ ack, respond }) => {
    await ack();
    await respond({
      response_type: 'ephemeral',
      text: '🗂 Saved as context. I\'ll factor this in when prioritizing.',
      replace_original: true,
    });
  });

  app.action('capture_ignore', async ({ ack, respond }) => {
    await ack();
    await respond({
      response_type: 'ephemeral',
      text: 'Got it, ignoring this one.',
      replace_original: true,
    });
  });

  // ── Focus: from slash command flow ────────────────────────────────

  // Exported helper for use in receiver
  void planFocus; // keep import live
}

/**
 * Called by the /focus command handler to apply the focus plan.
 * Extracted so the command and the action button share the same logic.
 */
export async function executeFocusPlan(plan: FocusPlan): Promise<void> {
  await setDnd(plan.dndMinutes);
  await setStatus(plan.statusText, plan.statusEmoji, plan.statusExpiration);
  createFocusSession(
    config.SLACK_USER_ID,
    plan.dndUntilTs,
    null,
    plan.focusTaskTitle
  );
}
