/**
 * Parses human-readable focus durations into milliseconds.
 * Supports: 2h, 90m, 1.5h, 30min, 2hours, 45minutes
 */

export class DurationParseError extends Error {
  constructor(input: string) {
    super(
      `Could not parse duration "${input}". Try formats like: 2h, 90m, 1.5h, 45min`
    );
    this.name = 'DurationParseError';
  }
}

export function parseDurationMs(input: string): number {
  const clean = input.trim().toLowerCase();

  // Match: 1.5h, 2h, 2hours, 2 hours
  const hoursMatch = clean.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/);
  if (hoursMatch) {
    return Math.round(parseFloat(hoursMatch[1]) * 60 * 60 * 1000);
  }

  // Match: 90m, 45min, 45minutes, 45 min
  const minutesMatch = clean.match(/^(\d+)\s*m(?:in(?:utes?)?)?$/);
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10) * 60 * 1000;
  }

  throw new DurationParseError(input);
}

export function formatEndTime(endTs: number, timezone: string): string {
  try {
    return new Date(endTs).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
      hour12: true,
    });
  } catch {
    // Fallback if timezone is invalid
    return new Date(endTs).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
