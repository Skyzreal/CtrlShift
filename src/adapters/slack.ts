import { WebClient } from '@slack/web-api';
import type { KnownBlock } from '@slack/types';
import { config } from '../config';

export const botClient = new WebClient(config.SLACK_BOT_TOKEN);
export const userClient = config.SLACK_USER_TOKEN
  ? new WebClient(config.SLACK_USER_TOKEN)
  : null;

// Cache the DM channel ID so we don't call conversations.open on every message
let _dmChannelId: string | null = null;

export async function getDmChannelId(): Promise<string> {
  if (_dmChannelId) return _dmChannelId;

  const result = await botClient.conversations.open({
    users: config.SLACK_USER_ID,
  });

  if (!result.channel?.id) {
    throw new Error('Could not open DM channel with configured SLACK_USER_ID');
  }

  _dmChannelId = result.channel.id;
  return _dmChannelId;
}

/**
 * Send a message to the user's personal DM.
 * The bot NEVER posts to channels — only to this DM channel.
 */
export async function sendDm(
  blocks: KnownBlock[],
  fallbackText = 'CtrlShift+ update'
): Promise<string | undefined> {
  const channelId = await getDmChannelId();
  const result = await botClient.chat.postMessage({
    channel: channelId,
    blocks,
    text: fallbackText,
  });
  return result.ts ?? undefined;
}

export async function sendDmText(text: string): Promise<void> {
  const channelId = await getDmChannelId();
  await botClient.chat.postMessage({
    channel: channelId,
    text,
  });
}

export async function updateDm(ts: string, blocks: KnownBlock[]): Promise<void> {
  const channelId = await getDmChannelId();
  await botClient.chat.update({
    channel: channelId,
    ts,
    blocks,
  });
}

// ── Status & DND ──────────────────────────────────────────────────────

export async function setStatus(
  statusText: string,
  statusEmoji: string,
  expirationEpochSeconds: number
): Promise<void> {
  const client = userClient ?? botClient;
  await client.users.profile.set({
    profile: JSON.stringify({
      status_text: statusText,
      status_emoji: statusEmoji,
      status_expiration: expirationEpochSeconds,
    }),
  });
}

export async function clearStatus(): Promise<void> {
  const client = userClient ?? botClient;
  await client.users.profile.set({
    profile: JSON.stringify({
      status_text: '',
      status_emoji: '',
      status_expiration: 0,
    }),
  });
}

export async function setDnd(durationMinutes: number): Promise<void> {
  const client = userClient ?? botClient;
  await client.dnd.setSnooze({ num_minutes: durationMinutes });
}

export async function endDnd(): Promise<void> {
  const client = userClient ?? botClient;
  await client.dnd.endSnooze();
}
