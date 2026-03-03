import cron from 'node-cron';
import { config } from '../config';
import { getOrCreateUser, getPreferences } from '../state/repositories/users';
import { buildDigest } from '../skills/daily-digest';
import { buildDigestBlocks } from '../slack/blocks';
import { sendDm, sendDmText } from '../adapters/slack';

/**
 * Starts all scheduled jobs.
 * Currently:
 *  - Morning digest: fired at the user's configured digest_time (defaults to 08:30)
 *  - Nudge check: every 30 minutes if nudges are enabled (Phase 2.5)
 */
export function startScheduler(): void {
  // Morning digest — runs every minute, checks if it's time for this user
  // This is intentionally simple for a single-user setup.
  // A multi-user setup would query all users and their digest_time.
  cron.schedule('* * * * *', async () => {
    try {
      await checkAndSendMorningDigest();
    } catch (err) {
      console.error('[scheduler] morning digest error:', err);
    }
  });

  console.log('📅 Scheduler started');
}

// Track whether we've sent the digest this minute window to avoid duplicates
let lastDigestDate = '';

async function checkAndSendMorningDigest(): Promise<void> {
  const userId = config.SLACK_USER_ID;
  const user = getOrCreateUser(userId);

  const now = new Date();
  const tz = user.timezone || 'UTC';

  // Get current HH:MM in user's timezone
  const localTime = now.toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Get current date string as the dedup key (date + time)
  const dateKey = now.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
  const dedupKey = `${dateKey}-${user.digestTime}`;

  // Already sent today at this time?
  if (lastDigestDate === dedupKey) return;

  // Is it digest time?
  if (localTime !== user.digestTime) return;

  lastDigestDate = dedupKey;
  console.log(`[scheduler] Sending morning digest for ${userId} at ${localTime} (${tz})`);

  try {
    const payload = await buildDigest(userId, 'schedule');
    const blocks = buildDigestBlocks(payload);
    await sendDm(blocks, 'Your morning digest');
  } catch (err) {
    console.error('[scheduler] Failed to send morning digest:', err);
    await sendDmText('❌ Had trouble building your morning digest today. Try `/daily-update` manually.').catch(() => {});
  }
}
