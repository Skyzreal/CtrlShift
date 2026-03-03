import { getOrCreateUser, getPreferences } from '../../state/repositories/users';
import { getPendingTasks } from '../../state/repositories/tasks';
import { fetchAssignedIssues } from '../../adapters/jira';
import { prioritize } from '../prioritizer';
import { generateGreeting, generateJoke, generateFocusReason } from '../../agent/loop';
import { composeDigest } from './compose';
import { DigestPayload } from '../../types';
import { getDb } from '../../state/db';
import { v4 as uuidv4 } from 'uuid';

export async function buildDigest(
  userId: string,
  triggeredBy: 'schedule' | 'command'
): Promise<DigestPayload> {
  const user = getOrCreateUser(userId);
  const prefs = getPreferences(userId);

  // Load data
  const tasks = getPendingTasks(userId);
  const jiraIssues = await fetchAssignedIssues(prefs.jiraStageConfig ?? undefined);

  // Prioritize
  const { orderedIssues, topPick } = prioritize({
    jiraIssues,
    tasks,
    contextFlags: { upcomingRelease: null, releaseWithinDays: null },
    userPriorityRules: prefs.priorityRules,
  });

  // Generate prose (Phase 2: static stubs; Phase 3: Claude)
  const greeting = await generateGreeting(prefs.tone);
  const joke = prefs.jokesEnabled ? await generateJoke() : null;
  const focusReason = topPick
    ? await generateFocusReason(topPick.tags, topPick.summary)
    : null;

  const payload = composeDigest({
    greeting,
    joke,
    suggestedFocus: topPick
      ? {
          ref: topPick.key,
          title: topPick.summary,
          reason: focusReason!,
          tags: topPick.tags,
        }
      : null,
    pendingTasks: tasks,
    scoredIssues: orderedIssues,
    calendarNote: null, // Phase 5: calendar integration
  });

  // Log the digest
  logDigest(userId, triggeredBy, payload);

  // Suppress unused warning
  void user;

  return payload;
}

function logDigest(
  userId: string,
  triggeredBy: string,
  payload: DigestPayload
): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO digest_log (id, user_id, triggered_by, sent_at, snapshot)
       VALUES (?, ?, ?, ?, ?)`
    ).run(uuidv4(), userId, triggeredBy, Date.now(), JSON.stringify(payload));
  } catch {
    // Non-critical — don't let logging failures surface to the user
  }
}
