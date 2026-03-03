import { config as loadEnv } from 'dotenv';

loadEnv();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string): string | undefined {
  return process.env[key] || undefined;
}

export const config = {
  // Slack
  SLACK_BOT_TOKEN: required('SLACK_BOT_TOKEN'),
  SLACK_SIGNING_SECRET: required('SLACK_SIGNING_SECRET'),
  SLACK_USER_ID: required('SLACK_USER_ID'),
  SLACK_APP_TOKEN: optional('SLACK_APP_TOKEN'),    // enables Socket Mode when set
  SLACK_USER_TOKEN: optional('SLACK_USER_TOKEN'),  // needed for DND + status writes

  // Claude
  ANTHROPIC_API_KEY: required('ANTHROPIC_API_KEY'),

  // Jira (optional)
  JIRA_BASE_URL: optional('JIRA_BASE_URL'),
  JIRA_USER_EMAIL: optional('JIRA_USER_EMAIL'),
  JIRA_API_TOKEN: optional('JIRA_API_TOKEN'),

  // Microsoft Graph (optional)
  AZURE_CLIENT_ID: optional('AZURE_CLIENT_ID'),
  AZURE_TENANT_ID: optional('AZURE_TENANT_ID'),
  GRAPH_ACCESS_TOKEN: optional('GRAPH_ACCESS_TOKEN'),
  GRAPH_REFRESH_TOKEN: optional('GRAPH_REFRESH_TOKEN'),

  // Storage
  DATABASE_PATH: process.env.DATABASE_PATH || './data/ctrlshift.db',

  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

export type Config = typeof config;
