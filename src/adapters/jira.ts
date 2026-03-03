import { JiraIssueRaw, JiraIssue, StageConfig, TestSubStatus, IssueStage } from '../types';
import { config } from '../config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultStages: StageConfig = require('../../config/jira-stages.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockData: { issues: JiraIssueRaw[] } = require('../../dev/mock-jira.json');

export function enrichIssue(raw: JiraIssueRaw, stageOverride?: StageConfig): JiraIssue {
  const stages = stageOverride ?? defaultStages;

  for (const [stage, statuses] of Object.entries(stages)) {
    if (stage === 'Test') {
      const testStages = statuses as StageConfig['Test'];
      for (const [subStage, subStatuses] of Object.entries(testStages)) {
        if ((subStatuses as string[]).includes(raw.status)) {
          return {
            ...raw,
            stage: 'Test' as IssueStage,
            testSubStatus: subStage as TestSubStatus,
          };
        }
      }
    } else {
      if ((statuses as string[]).includes(raw.status)) {
        return {
          ...raw,
          stage: stage as IssueStage,
          testSubStatus: null,
        };
      }
    }
  }

  // Unknown status → default to Analysis
  return { ...raw, stage: 'Analysis', testSubStatus: null };
}

export async function fetchAssignedIssues(stageOverride?: StageConfig): Promise<JiraIssue[]> {
  const isJiraConfigured =
    config.JIRA_BASE_URL && config.JIRA_USER_EMAIL && config.JIRA_API_TOKEN;

  if (!isJiraConfigured) {
    // Use mock data
    return mockData.issues.map((raw) => enrichIssue(raw, stageOverride));
  }

  // Phase 5: real Jira API
  // TODO: implement live fetch with JQL assignee=currentUser() AND resolution=Unresolved
  console.warn('[jira] Credentials set but live fetch not yet implemented — using mock data');
  return mockData.issues.map((raw) => enrichIssue(raw, stageOverride));
}
