import { FocusPlan } from '../../types';
import { parseDurationMs, formatEndTime, DurationParseError } from './duration';

export { DurationParseError };

export interface FocusInput {
  durationStr: string;
  focusTaskKey: string | null;
  focusTaskTitle: string | null;
  userTimezone: string;
}

export function planFocus(input: FocusInput): FocusPlan {
  const durationMs = parseDurationMs(input.durationStr); // throws DurationParseError if invalid
  const now = Date.now();
  const dndUntilTs = now + durationMs;
  const dndMinutes = Math.round(durationMs / 60000);

  const humanReadableEndTime = formatEndTime(dndUntilTs, input.userTimezone);

  // Break reminder at midpoint (only if focus > 45 minutes)
  const breakReminderAt =
    durationMs > 45 * 60 * 1000 ? now + Math.round(durationMs / 2) : null;

  const taskLabel = input.focusTaskTitle ?? input.focusTaskKey ?? null;
  const statusText = taskLabel
    ? `Deep Focus — ${taskLabel.slice(0, 40)} (until ${humanReadableEndTime})`
    : `Deep Focus (until ${humanReadableEndTime})`;

  const confirmationText = taskLabel
    ? `Focus for ${formatDuration(durationMs)} on *${taskLabel}* — until ${humanReadableEndTime}. Let's go! 🧠`
    : `Focus block for ${formatDuration(durationMs)} — until ${humanReadableEndTime}. Let's go! 🧠`;

  return {
    dndMinutes,
    dndUntilTs,
    statusText,
    statusEmoji: ':brain:',
    statusExpiration: Math.floor(dndUntilTs / 1000),
    breakReminderAt,
    humanReadableEndTime,
    confirmationText,
    focusTaskTitle: taskLabel,
  };
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = totalMinutes / 60;
  return hours === Math.floor(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}
