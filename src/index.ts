// Load env vars before anything else
import { config } from './config';

import { getDb } from './state/db';
import { startApp } from './slack/receiver';
import { startScheduler } from './scheduler';
import { getOrCreateUser } from './state/repositories/users';

async function main(): Promise<void> {
  console.log('🚀 Starting CtrlShift+...');

  // Init database + run any pending migrations
  console.log('💾 Initialising database...');
  getDb();

  // Ensure the configured user exists in the DB
  getOrCreateUser(config.SLACK_USER_ID);

  // Start the Slack Bolt app
  await startApp();

  // Start background scheduler (morning digest, nudges)
  startScheduler();

  console.log(`\n✅ CtrlShift+ is ready!`);
  console.log(`   User:      ${config.SLACK_USER_ID}`);
  console.log(`   Mode:      ${config.SLACK_APP_TOKEN ? 'Socket Mode' : `HTTP :${config.PORT}`}`);
  console.log(`   Jira:      ${config.JIRA_BASE_URL ? config.JIRA_BASE_URL : 'mock data'}`);
  console.log(`   Calendar:  ${config.GRAPH_ACCESS_TOKEN ? 'Graph connected' : 'not configured'}`);
  console.log(`\n   Try: /daily-update  /focus 2h  /task add <title>\n`);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
