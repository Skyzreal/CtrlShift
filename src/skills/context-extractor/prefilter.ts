/**
 * Fast regex pre-filter for context capture.
 * Avoids sending every Slack message to Claude — only pass messages that
 * contain both a date-like pattern AND a release/deadline keyword.
 */

const DATE_PATTERNS = [
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?/i,
  /\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/,
  /\b(?:next|this)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(?:next|this)\s+(?:week|month)\b/i,
  /\bend\s+of\s+(?:the\s+)?(?:week|month|quarter|sprint)\b/i,
  /\bq[1-4]\s*\d{4}\b/i,
];

const KEYWORD_PATTERNS = [
  /\b(?:release|deploy|deployment|ship|launch)\b/i,
  /\bdeadline\b/i,
  /\bfeature\s+freeze\b/i,
  /\bcode\s+freeze\b/i,
  /\bmilestone\b/i,
  /\bdue\s+(?:date|by|on)\b/i,
  /\bcut-?off\b/i,
  /\bgo-?live\b/i,
  /\bGA\b/, // General Availability
];

export function hasEventCandidate(text: string): boolean {
  const hasDate = DATE_PATTERNS.some((p) => p.test(text));
  if (!hasDate) return false;

  const hasKeyword = KEYWORD_PATTERNS.some((p) => p.test(text));
  return hasKeyword;
}
