import { ScoredIssue, Task, DigestPayload } from '../../types';

export interface ComposeInput {
  greeting: string;
  joke: string | null;
  suggestedFocus: DigestPayload['suggestedFocus'];
  pendingTasks: Task[];
  scoredIssues: ScoredIssue[];
  calendarNote: string | null;
}

export function composeDigest(input: ComposeInput): DigestPayload {
  const now = new Date();
  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Split scored issues into their stage buckets
  const analysis = input.scoredIssues.filter((i) => i.stage === 'Analysis');
  const development = input.scoredIssues.filter((i) => i.stage === 'Development');
  const testIssues = input.scoredIssues.filter((i) => i.stage === 'Test');

  const testCycle = {
    failed: testIssues.filter((i) => i.testSubStatus === 'TestFailed'),
    inTest: testIssues.filter((i) => i.testSubStatus === 'InTest'),
    readyToTest: testIssues.filter((i) => i.testSubStatus === 'ReadyToTest'),
    passed: testIssues.filter((i) => i.testSubStatus === 'TestPassed'),
  };

  return {
    greeting: input.greeting,
    joke: input.joke,
    suggestedFocus: input.suggestedFocus,
    sections: {
      manualTasks: input.pendingTasks,
      analysis,
      development,
      testCycle,
    },
    calendarNote: input.calendarNote,
    dateString,
  };
}
