// ── Jira ─────────────────────────────────────────────────────────────

export interface JiraIssueRaw {
  key: string;
  summary: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: string;
  labels: string[];
}

export type TestSubStatus = 'ReadyToTest' | 'InTest' | 'TestFailed' | 'TestPassed';
export type IssueStage = 'Analysis' | 'Development' | 'Test';

export interface JiraIssue extends JiraIssueRaw {
  stage: IssueStage;
  testSubStatus: TestSubStatus | null;
}

export interface ScoredIssue extends JiraIssue {
  score: number;
  tags: string[];
  pinned: boolean;
}

// ── Scoring ───────────────────────────────────────────────────────────

export interface ScoringWeights {
  stageTestCycle: number;
  stageDevelopment: number;
  stageAnalysis: number;
  testFailed: number;
  testReady: number;
  testInProgress: number;
  priorityCritical: number;
  priorityHigh: number;
  priorityMedium: number;
  priorityLow: number;
  releaseSoonTestFailed: number;
  releaseSoonRegression: number;
  blocked: number;
}

export interface PriorityRules {
  pinToTop: string[];
  weights: Partial<ScoringWeights>;
}

// ── Stage config ──────────────────────────────────────────────────────

export interface StageConfig {
  Analysis: string[];
  Development: string[];
  Test: {
    ReadyToTest: string[];
    InTest: string[];
    TestFailed: string[];
    TestPassed: string[];
  };
}

// ── State entities ────────────────────────────────────────────────────

export interface User {
  id: string;
  timezone: string;
  digestTime: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserPreferences {
  userId: string;
  jokesEnabled: boolean;
  nudgesEnabled: boolean;
  nudgeIntervalMinutes: number;
  endOfDayTime: string;
  wfhMirrorMode: 'confirm' | 'auto' | 'off';
  contextCaptureMode: 'confirm' | 'off';
  jiraStageConfig: StageConfig | null;
  tone: 'enthusiastic' | 'friendly' | 'minimal';
  priorityRules: PriorityRules;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  status: 'pending' | 'done' | 'archived';
  jiraKey: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface FocusSession {
  id: string;
  userId: string;
  startedAt: number;
  endsAt: number;
  taskRef: string | null;
  taskTitle: string | null;
  status: 'active' | 'completed' | 'cancelled';
  completedAt: number | null;
}

export interface ContextCapture {
  id: string;
  userId: string;
  messageTs: string;
  channelId: string;
  permalink: string | null;
  extractedType: 'release' | 'deadline' | 'meeting' | 'milestone' | null;
  extractedTitle: string | null;
  extractedDate: string | null;
  confidence: number | null;
  status: 'pending' | 'added_to_calendar' | 'saved' | 'ignored';
  calendarEventId: string | null;
  createdAt: number;
}

// ── Skill payloads ────────────────────────────────────────────────────

export interface DigestPayload {
  greeting: string;
  joke: string | null;
  suggestedFocus: {
    ref: string;
    title: string;
    reason: string;
    tags: string[];
  } | null;
  sections: {
    manualTasks: Task[];
    analysis: ScoredIssue[];
    development: ScoredIssue[];
    testCycle: {
      failed: ScoredIssue[];
      inTest: ScoredIssue[];
      readyToTest: ScoredIssue[];
      passed: ScoredIssue[];
    };
  };
  calendarNote: string | null;
  dateString: string;
}

export interface FocusPlan {
  dndMinutes: number;
  dndUntilTs: number;
  statusText: string;
  statusEmoji: string;
  statusExpiration: number;
  breakReminderAt: number | null;
  humanReadableEndTime: string;
  confirmationText: string;
  focusTaskTitle: string | null;
}

export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
}
