import { JiraIssue, ScoredIssue, PriorityRules, ScoringWeights } from '../../types';

export const DEFAULT_WEIGHTS: ScoringWeights = {
  stageTestCycle: 10,
  stageDevelopment: 5,
  stageAnalysis: 2,
  testFailed: 5,
  testReady: 3,
  testInProgress: 2,
  priorityCritical: 4,
  priorityHigh: 3,
  priorityMedium: 2,
  priorityLow: 1,
  releaseSoonTestFailed: 3,
  releaseSoonRegression: 2,
  blocked: -10,
};

export const DEFAULT_PRIORITY_RULES: PriorityRules = {
  pinToTop: [],
  weights: {},
};

function getTags(issue: JiraIssue, releaseWithinDays: number | null): string[] {
  const tags: string[] = [];

  if (issue.testSubStatus === 'TestFailed') tags.push('test-failed');

  const isRegression =
    issue.labels.some((l) => /regression/i.test(l)) ||
    /regression/i.test(issue.summary);
  if (isRegression) tags.push('regression');

  if (releaseWithinDays !== null && releaseWithinDays <= 7) {
    tags.push('release-soon');
  }

  if (issue.priority === 'Critical' || issue.priority === 'High') {
    tags.push('high-priority');
  }

  if (issue.labels.some((l) => /blocked/i.test(l))) {
    tags.push('blocked');
  }

  return tags;
}

export function scoreIssue(
  issue: JiraIssue,
  rules: PriorityRules,
  releaseWithinDays: number | null
): ScoredIssue {
  // Merge user weights on top of defaults
  const w: ScoringWeights = { ...DEFAULT_WEIGHTS, ...rules.weights };
  const tags = getTags(issue, releaseWithinDays);
  let score = 0;

  // Stage base score
  if (issue.stage === 'Test') score += w.stageTestCycle;
  else if (issue.stage === 'Development') score += w.stageDevelopment;
  else score += w.stageAnalysis;

  // Test sub-status refinement
  if (issue.testSubStatus === 'TestFailed') score += w.testFailed;
  else if (issue.testSubStatus === 'ReadyToTest') score += w.testReady;
  else if (issue.testSubStatus === 'InTest') score += w.testInProgress;

  // Jira priority
  if (issue.priority === 'Critical') score += w.priorityCritical;
  else if (issue.priority === 'High') score += w.priorityHigh;
  else if (issue.priority === 'Medium') score += w.priorityMedium;
  else score += w.priorityLow;

  // Release context boosts
  if (tags.includes('release-soon')) {
    if (tags.includes('test-failed')) score += w.releaseSoonTestFailed;
    if (tags.includes('regression')) score += w.releaseSoonRegression;
  }

  // Blocked penalty
  if (tags.includes('blocked')) score += w.blocked;

  // pinToTop: issue is "pinned" if any of its tags appear in the user's pinToTop list
  const pinned = tags.some((t) => rules.pinToTop.includes(t));

  return { ...issue, score, tags, pinned };
}

export function scoreAndRank(
  issues: JiraIssue[],
  rules: PriorityRules,
  releaseWithinDays: number | null
): ScoredIssue[] {
  const scored = issues.map((i) => scoreIssue(i, rules, releaseWithinDays));

  // Sort: pinned first (by score desc), then non-pinned (by score desc)
  return scored.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.score - a.score;
  });
}
