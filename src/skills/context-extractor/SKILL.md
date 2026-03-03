# Skill: Context Event Extractor

## Purpose
Detects actionable events (releases, deadlines, milestones) in Slack messages and extracts structured metadata. Operates in two stages: a fast regex pre-filter, then a Claude structured extraction.

## Flow
```
1. hasEventCandidate(text) → fast regex check (date pattern + keyword)
   If false → skip entirely (no Claude call)
2. Claude extraction → named entity recognition for dates, event type, suggested actions
3. Filter candidates by confidence >= 0.7
4. Return structured EventCandidate[]
```

## Pre-filter patterns
- **Date patterns:** month names, numeric dates, "next Monday", "end of month", Q1 2026, etc.
- **Keywords:** release, deploy, deadline, feature freeze, milestone, due by, go-live, GA

## Output (per candidate)
```ts
{
  type: 'release' | 'deadline' | 'meeting' | 'milestone';
  title: string;
  dateIso: string;         // ISO 8601 absolute date
  confidence: number;      // 0.0 – 1.0
  extractedPhrase: string; // The original phrase that triggered extraction
  suggestedCalendarTitle: string;
  suggestedFollowUpQuestion: string;
}
```

## Current status
- **Phase 2:** Pre-filter implemented. Returns empty candidates (Claude call not wired yet).
- **Phase 3:** Claude extraction using `CONTEXT_EXTRACTOR_SYSTEM_PROMPT` + structured output.

## Channel scope
Bot listens on all channels it has been invited to. Users add/remove the bot with `/invite @CtrlShift+`.
