/**
 * Legba Command Parser
 *
 * Parses natural language chat messages into structured commands.
 */

import type { LegbaCommand } from '../types/index.js';

/**
 * Regular expression patterns for command parsing
 */
const PATTERNS = {
  // legba run sprint-3 on myproject
  // legba run sprint 3 on myproject
  // legba run sprint-03 on myproject branch feature/x
  run: /^legba\s+run\s+sprint[- ]?(\d+)\s+on\s+(\S+)(?:\s+branch\s+(\S+))?$/i,

  // legba status
  // legba status abc123
  status: /^legba\s+status(?:\s+(\S+))?$/i,

  // legba resume abc123
  resume: /^legba\s+resume\s+(\S+)$/i,

  // legba abort abc123
  abort: /^legba\s+abort\s+(\S+)$/i,

  // legba projects
  projects: /^legba\s+projects$/i,

  // legba history myproject
  history: /^legba\s+history\s+(\S+)$/i,

  // legba logs abc123
  logs: /^legba\s+logs\s+(\S+)$/i,

  // legba help
  // legba
  help: /^legba(?:\s+help)?$/i,
};

/**
 * Parse a chat message into a Legba command.
 *
 * @param message - The raw message text from chat
 * @returns The parsed command, or null if not recognized
 *
 * @example
 * parseCommand('legba run sprint-3 on myproject')
 * // => { type: 'run', project: 'myproject', sprint: 3 }
 *
 * @example
 * parseCommand('legba status')
 * // => { type: 'status' }
 *
 * @example
 * parseCommand('hello world')
 * // => null
 */
export function parseCommand(message: string): LegbaCommand | null {
  // Normalize whitespace
  const normalized = message.trim().replace(/\s+/g, ' ');

  // Try run command
  const runMatch = normalized.match(PATTERNS.run);
  if (runMatch) {
    return {
      type: 'run',
      sprint: parseInt(runMatch[1], 10),
      project: runMatch[2],
      branch: runMatch[3],
    };
  }

  // Try status command
  const statusMatch = normalized.match(PATTERNS.status);
  if (statusMatch) {
    return {
      type: 'status',
      sessionId: statusMatch[1],
    };
  }

  // Try resume command
  const resumeMatch = normalized.match(PATTERNS.resume);
  if (resumeMatch) {
    return {
      type: 'resume',
      sessionId: resumeMatch[1],
    };
  }

  // Try abort command
  const abortMatch = normalized.match(PATTERNS.abort);
  if (abortMatch) {
    return {
      type: 'abort',
      sessionId: abortMatch[1],
    };
  }

  // Try projects command
  if (PATTERNS.projects.test(normalized)) {
    return { type: 'projects' };
  }

  // Try history command
  const historyMatch = normalized.match(PATTERNS.history);
  if (historyMatch) {
    return {
      type: 'history',
      project: historyMatch[1],
    };
  }

  // Try logs command
  const logsMatch = normalized.match(PATTERNS.logs);
  if (logsMatch) {
    return {
      type: 'logs',
      sessionId: logsMatch[1],
    };
  }

  // Try help command
  if (PATTERNS.help.test(normalized)) {
    return { type: 'help' };
  }

  // Not a recognized command
  return null;
}

/**
 * Check if a message looks like it might be a Legba command
 * (starts with "legba" or "/legba")
 */
export function isLegbaMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized.startsWith('legba') || normalized.startsWith('/legba');
}

/**
 * Format a command back into a string (for display purposes)
 */
export function formatCommand(command: LegbaCommand): string {
  switch (command.type) {
    case 'run':
      let runStr = `legba run sprint-${command.sprint} on ${command.project}`;
      if (command.branch) {
        runStr += ` branch ${command.branch}`;
      }
      return runStr;

    case 'status':
      return command.sessionId
        ? `legba status ${command.sessionId}`
        : 'legba status';

    case 'resume':
      return `legba resume ${command.sessionId}`;

    case 'abort':
      return `legba abort ${command.sessionId}`;

    case 'projects':
      return 'legba projects';

    case 'history':
      return `legba history ${command.project}`;

    case 'logs':
      return `legba logs ${command.sessionId}`;

    case 'help':
      return 'legba help';
  }
}
