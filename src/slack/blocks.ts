import type { KnownBlock } from '@slack/types';
import { DigestPayload, FocusPlan, Task, ScoredIssue } from '../types';

// ── Primitive builders ────────────────────────────────────────────────

function header(text: string): KnownBlock {
  return { type: 'header', text: { type: 'plain_text', text, emoji: true } };
}

function section(text: string): KnownBlock {
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

function context(...elements: string[]): KnownBlock {
  return {
    type: 'context',
    elements: elements.map((e) => ({ type: 'mrkdwn' as const, text: e })),
  };
}

function divider(): KnownBlock {
  return { type: 'divider' };
}

function actions(
  buttons: Array<{ text: string; actionId: string; style?: 'primary' | 'danger'; value?: string }>
): KnownBlock {
  return {
    type: 'actions',
    elements: buttons.map((b) => ({
      type: 'button' as const,
      text: { type: 'plain_text' as const, text: b.text, emoji: true },
      action_id: b.actionId,
      value: b.value ?? b.actionId,
      ...(b.style ? { style: b.style } : {}),
    })),
  };
}

// ── Issue formatters ──────────────────────────────────────────────────

const PRIORITY_EMOJI: Record<string, string> = {
  Critical: '🔴',
  High: '🟠',
  Medium: '🟡',
  Low: '⚪',
};

const TEST_STATUS_EMOJI: Record<string, string> = {
  TestFailed: '🔴 Test Failed',
  InTest: '🔵 In Test',
  ReadyToTest: '🟡 Ready to Test',
  TestPassed: '🟢 Test Passed',
};

function issueTag(issue: ScoredIssue): string {
  if (issue.stage === 'Test' && issue.testSubStatus) {
    return TEST_STATUS_EMOJI[issue.testSubStatus] ?? issue.testSubStatus;
  }
  const pri = PRIORITY_EMOJI[issue.priority] ?? '⚪';
  return `${pri} ${issue.priority}`;
}

function issueBlock(issue: ScoredIssue): KnownBlock {
  const tag = issueTag(issue);
  const regressionBadge = issue.tags.includes('regression') ? ' `regression`' : '';
  return section(`*${issue.key}*  ${tag}${regressionBadge}\n${issue.summary}`);
}

// ── Task formatters ───────────────────────────────────────────────────

function taskLines(tasks: Task[]): string {
  if (tasks.length === 0) return '_No pending tasks_';
  return tasks
    .map((t, i) => {
      const jira = t.jiraKey ? ` _(${t.jiraKey})_` : '';
      return `${i + 1}. ${t.title}${jira}`;
    })
    .join('\n');
}

// ── Digest blocks ─────────────────────────────────────────────────────

export function buildDigestBlocks(payload: DigestPayload): KnownBlock[] {
  const blocks: KnownBlock[] = [];

  // Header
  blocks.push(header(`📋 CtrlShift+ — ${payload.dateString}`));

  // Greeting + optional joke
  blocks.push(section(payload.greeting));
  if (payload.joke) {
    blocks.push(context(`_${payload.joke}_`));
  }

  // Calendar note (WFH / OOO)
  if (payload.calendarNote) {
    blocks.push(context(`📅 ${payload.calendarNote}`));
  }

  blocks.push(divider());

  // Suggested focus
  if (payload.suggestedFocus) {
    const { ref, title, reason, tags } = payload.suggestedFocus;
    const pinnedBadge = tags.includes('regression') || tags.includes('test-failed') ? ' ⚡' : '';
    blocks.push(section(`*🎯 Suggested Focus${pinnedBadge}*`));
    blocks.push(section(`*${ref}* — ${title}`));
    blocks.push(context(reason));
    blocks.push(divider());
  }

  // Manual tasks
  if (payload.sections.manualTasks.length > 0) {
    blocks.push(section('*📌 Manual Tasks*'));
    blocks.push(section(taskLines(payload.sections.manualTasks)));
    blocks.push(divider());
  }

  // Analysis
  if (payload.sections.analysis.length > 0) {
    blocks.push(section('*🔬 Analysis*'));
    payload.sections.analysis.forEach((i) => blocks.push(issueBlock(i)));
    blocks.push(divider());
  }

  // Development
  if (payload.sections.development.length > 0) {
    blocks.push(section('*🛠️ Development*'));
    payload.sections.development.forEach((i) => blocks.push(issueBlock(i)));
    blocks.push(divider());
  }

  // Test cycle
  const tc = payload.sections.testCycle;
  const hasTestItems =
    tc.failed.length + tc.inTest.length + tc.readyToTest.length + tc.passed.length > 0;

  if (hasTestItems) {
    blocks.push(section('*🔄 Review / Test Cycle*'));
    [...tc.failed, ...tc.inTest, ...tc.readyToTest, ...tc.passed].forEach((i) =>
      blocks.push(issueBlock(i))
    );
    blocks.push(divider());
  }

  // Empty state
  const isEmpty =
    payload.sections.manualTasks.length === 0 &&
    payload.sections.analysis.length === 0 &&
    payload.sections.development.length === 0 &&
    !hasTestItems &&
    !payload.suggestedFocus;

  if (isEmpty) {
    blocks.push(section('_Nothing on your plate right now. Enjoy the calm! 🌿_'));
    blocks.push(divider());
  }

  // Actions
  blocks.push(
    actions([
      { text: '▶ Start Focus', actionId: 'focus_start_from_digest', style: 'primary' },
      { text: '🔁 Refresh', actionId: 'digest_refresh' },
    ])
  );

  return blocks;
}

// ── Focus confirmation blocks ─────────────────────────────────────────

export function buildFocusConfirmBlocks(plan: FocusPlan): KnownBlock[] {
  return [
    section(`*🧠 Ready to focus?*`),
    section(plan.confirmationText),
    context(
      `DND until ${plan.humanReadableEndTime}`,
      `Status: "${plan.statusText}"`
    ),
    actions([
      {
        text: '✅ Start Focus',
        actionId: 'focus_confirm',
        style: 'primary',
        value: JSON.stringify(plan),
      },
      { text: '✗ Cancel', actionId: 'focus_cancel', style: 'danger' },
    ]),
  ];
}

// ── Context capture prompt blocks ─────────────────────────────────────

export function buildContextCaptureBlocks(
  extractedTitle: string,
  extractedDate: string,
  captureId: string,
  permalink: string | null
): KnownBlock[] {
  const linkText = permalink ? ` (<${permalink}|view message>)` : '';
  return [
    section('*📌 I noticed something in a channel*'),
    section(`"${extractedTitle}"\n*Event detected:* Release — ${extractedDate}${linkText}`),
    section('Should I add this to your calendar?'),
    actions([
      { text: '✅ Add to Calendar', actionId: 'capture_add_calendar', style: 'primary', value: captureId },
      { text: '🗂 Save as Context', actionId: 'capture_save', value: captureId },
      { text: '✗ Ignore', actionId: 'capture_ignore', style: 'danger', value: captureId },
    ]),
  ];
}
