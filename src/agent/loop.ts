/**
 * Agent loop — Phase 2 stubs.
 * Phase 3 will replace each function with real Claude claude-sonnet-4-6 calls
 * using the Anthropic SDK tool-use pattern.
 */

// Rotate through greetings by day-of-week so it feels fresh each morning
const GREETINGS: Record<string, string[]> = {
  enthusiastic: [
    "Goooood morning! Hope you feel well-rested today! ☀️",
    "Rise and shine! Let's make today count! 🚀",
    "Hey there! Ready to tackle the day? 💪",
    "Good morning! Big things happen one task at a time. 🎯",
    "Morning! Let's see what today has in store! 🌟",
    "Wakey wakey! It's going to be a great one. ⚡",
    "Hello hello! Another day to build something great! 🛠️",
  ],
  friendly: [
    "Good morning! Here's your daily overview.",
    "Morning! Ready when you are.",
    "Hey, good morning. Let's take a look at your day.",
    "Good morning! Here's what's on your plate.",
  ],
  minimal: [
    "Good morning.",
    "Morning. Here's your digest.",
    "Daily update ready.",
  ],
};

const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
  "A SQL query walks into a bar, walks up to two tables and asks... 'Can I join you?' 🍺",
  "Why do Java developers wear glasses? Because they don't C#! 👓",
  "How many programmers does it take to change a light bulb? None — that's a hardware problem! 💡",
  "I told my computer I needed a break. Now it won't stop sending me vacation ads. 🏖️",
  "Why was the developer unhappy at their job? They wanted arrays. 📊",
  "What's a developer's favourite place? The foo bar! 🍫",
];

export async function generateGreeting(tone: string): Promise<string> {
  const list = GREETINGS[tone] ?? GREETINGS['enthusiastic'];
  return list[new Date().getDay() % list.length];
}

export async function generateJoke(): Promise<string> {
  return JOKES[new Date().getDate() % JOKES.length];
}

export async function generateFocusReason(tags: string[], summary: string): Promise<string> {
  if (tags.includes('test-failed') && tags.includes('regression')) {
    return `Test failed regression — highest urgency, unblocks QA`;
  }
  if (tags.includes('test-failed') && tags.includes('release-soon')) {
    return `Test failed with release approaching — needs immediate attention`;
  }
  if (tags.includes('test-failed')) {
    return `Test failed — unblocks the QA pipeline`;
  }
  if (tags.includes('regression') && tags.includes('release-soon')) {
    return `Regression must be resolved before the upcoming release`;
  }
  if (tags.includes('regression')) {
    return `Regression — should be addressed promptly`;
  }
  if (tags.includes('release-soon')) {
    return `Release approaching — high-visibility item`;
  }
  if (tags.includes('high-priority')) {
    return `High priority in your current sprint`;
  }
  return `Top-scored item based on your priorities`;
}
