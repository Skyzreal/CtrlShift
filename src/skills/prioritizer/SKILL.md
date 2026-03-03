# Skill: Prioritizer

## Purpose
Takes a list of Jira issues (already enriched with stage/testSubStatus) and user-configurable scoring rules, and returns them in priority order with a recommended top pick.

## How scoring works

### Pass 1 — Weighted score
Each issue accumulates points from `userPriorityRules.weights` (merged on top of defaults):

| Factor | Default weight |
|--------|---------------|
| Stage: Test Cycle | +10 |
| Stage: Development | +5 |
| Stage: Analysis | +2 |
| Test Failed | +5 |
| Test Ready | +3 |
| Test In Progress | +2 |
| Priority Critical | +4 |
| Priority High | +3 |
| Priority Medium | +2 |
| Priority Low | +1 |
| Release ≤7 days + Test Failed | +3 |
| Release ≤7 days + Regression | +2 |
| Blocked | −10 |

### Pass 2 — Pin-to-top override
Issues whose tags match any entry in `userPriorityRules.pinToTop` are sorted above all non-pinned issues, regardless of their weighted score. Within the pinned group, ordering is still by weighted score.

**Example:** `"pinToTop": ["regression"]` → all regression tickets float to the top.

## Tags assigned (deterministic)
- `test-failed` — testSubStatus is TestFailed
- `regression` — label matches `/regression/i` OR summary contains "regression"
- `release-soon` — release context within 7 days
- `high-priority` — Jira priority is Critical or High
- `blocked` — has a label matching `/blocked/i`

## Input
```ts
{
  jiraIssues: JiraIssue[];
  tasks: Task[];
  contextFlags: { upcomingRelease: { title, date } | null; releaseWithinDays: number | null };
  userPriorityRules: PriorityRules;
}
```

## Output
```ts
{
  orderedIssues: ScoredIssue[];   // sorted, each has score + tags + pinned
  topPick: ScoredIssue | null;    // first item (the suggested focus)
}
```

## Claude involvement
None — fully deterministic. Claude only generates the human-readable `reason` string for the top pick (in the digest composer).
