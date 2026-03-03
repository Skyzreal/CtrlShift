import { hasEventCandidate } from './prefilter';

export interface ContextInput {
  messageText: string;
  messageTs: string;
  channelId: string;
  permalink: string | null;
  authorId: string;
}

export interface EventCandidate {
  type: 'release' | 'deadline' | 'meeting' | 'milestone';
  title: string;
  dateIso: string;
  confidence: number;
  extractedPhrase: string;
  suggestedCalendarTitle: string;
  suggestedFollowUpQuestion: string;
}

export interface ContextOutput {
  candidates: EventCandidate[];
}

/**
 * Phase 2: pre-filter only — no Claude call yet.
 * Returns empty candidates so the caller can skip further processing.
 * Phase 3 will send passing messages to Claude for structured extraction.
 */
export async function extractContext(input: ContextInput): Promise<ContextOutput> {
  if (!hasEventCandidate(input.messageText)) {
    return { candidates: [] };
  }

  // TODO Phase 3: send to Claude with CONTEXT_EXTRACTOR_SYSTEM_PROMPT
  // For now, return empty so the receiver knows to process it later
  return { candidates: [] };
}

export { hasEventCandidate };
