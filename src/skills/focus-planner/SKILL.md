# Skill: Focus Mode Planner

## Purpose
Converts a user's focus request (duration + optional task) into a concrete plan: Slack DND duration, status text, break reminder time, and a confirmation message.

## Input
```ts
{
  durationStr: string;       // e.g. "2h", "90m", "1.5h"
  focusTaskKey: string | null;
  focusTaskTitle: string | null;
  userTimezone: string;      // IANA tz string, e.g. "America/Toronto"
}
```

## Output (`FocusPlan`)
```ts
{
  dndMinutes: number;
  dndUntilTs: number;            // epoch ms
  statusText: string;            // "Deep Focus — DVLS-1234 (until 11:30 AM)"
  statusEmoji: string;           // ":brain:"
  statusExpiration: number;      // epoch seconds (Slack API format)
  breakReminderAt: number | null; // epoch ms, null if < 45 min
  humanReadableEndTime: string;
  confirmationText: string;
  focusTaskTitle: string | null;
}
```

## Duration formats supported
`2h`, `1.5h`, `90m`, `45min`, `2hours`, `30minutes`

## Break reminder
Scheduled at the midpoint of the focus block, but only if the block is longer than 45 minutes.

## Claude involvement
None — fully deterministic.
