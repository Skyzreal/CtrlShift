import { JiraIssue, ScoredIssue, PriorityRules, Task } from '../../types';
import { scoreAndRank, DEFAULT_PRIORITY_RULES } from './score';

export interface PrioritizerInput {
  jiraIssues: JiraIssue[];
  tasks: Task[];
  contextFlags: {
    upcomingRelease: { title: string; date: string } | null;
    releaseWithinDays: number | null;
  };
  userPriorityRules: PriorityRules;
}

export interface PrioritizerOutput {
  orderedIssues: ScoredIssue[];
  topPick: ScoredIssue | null;
}

export function prioritize(input: PrioritizerInput): PrioritizerOutput {
  const rules = input.userPriorityRules ?? DEFAULT_PRIORITY_RULES;
  const orderedIssues = scoreAndRank(
    input.jiraIssues,
    rules,
    input.contextFlags.releaseWithinDays
  );

  return {
    orderedIssues,
    topPick: orderedIssues[0] ?? null,
  };
}
