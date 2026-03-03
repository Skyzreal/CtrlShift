# Skill: Daily Digest Composer

## Purpose
Assembles the full morning digest: loads tasks + Jira issues, runs the prioritizer, generates prose, and returns a structured `DigestPayload` ready for Block Kit rendering.

## Flow
```
1. getOrCreateUser → load user + preferences
2. getPendingTasks → manual task list
3. fetchAssignedIssues → Jira issues (mock or live)
4. prioritize → scored + ordered issues
5. generateGreeting / generateJoke / generateFocusReason → prose (Phase 3: Claude)
6. composeDigest → split issues into stage buckets, build DigestPayload
7. logDigest → persists snapshot to digest_log
```

## Input
`userId: string`, `triggeredBy: 'schedule' | 'command'`

## Output
`DigestPayload` — see `src/types.ts`. The payload is then passed to `buildDigestBlocks()` for Slack rendering.

## Sections
- **Suggested Focus** — single top-pick with reason
- **Manual Tasks** — pending user tasks
- **Analysis** — Jira issues in Analysis stage
- **Development** — Jira issues in Development stage
- **Test Cycle** — broken into Failed / In Test / Ready / Passed

Empty sections are omitted from the rendered output (handled in Block Kit layer).

## Claude involvement (Phase 3)
- `generateGreeting` — personalized greeting based on tone preference
- `generateJoke` — safe dev-themed joke
- `generateFocusReason` — one-sentence explanation for the top pick
