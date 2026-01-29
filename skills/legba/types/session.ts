/**
 * Legba Session Types
 *
 * Represents session state and lifecycle.
 */

/**
 * All possible session states
 */
export type SessionState =
  | 'QUEUED'
  | 'STARTING'
  | 'CLONING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABORTED';

/**
 * Terminal states that cannot transition to other states
 */
export const TERMINAL_STATES: SessionState[] = ['COMPLETED', 'FAILED', 'ABORTED'];

/**
 * Check if a state is terminal
 */
export function isTerminalState(state: SessionState): boolean {
  return TERMINAL_STATES.includes(state);
}

/**
 * Chat platform identifier
 */
export type ChatPlatform = 'telegram' | 'discord';

/**
 * Context of the originating chat message
 */
export interface ChatContext {
  platform: ChatPlatform;
  channelId: string;
  messageId: string;
  userId: string;
}

/**
 * Metrics collected during session execution
 */
export interface SessionMetrics {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  testsRun: number;
  testsPassed: number;
  duration: number; // Milliseconds
}

/**
 * Default metrics for new sessions
 */
export function createDefaultMetrics(): SessionMetrics {
  return {
    filesChanged: 0,
    linesAdded: 0,
    linesRemoved: 0,
    testsRun: 0,
    testsPassed: 0,
    duration: 0,
  };
}

/**
 * Session record stored in R2
 */
export interface Session {
  /** Unique session identifier (UUID) */
  id: string;

  /** Project ID from registry */
  project: string;

  /** Sprint number being executed */
  sprint: number;

  /** Git branch being worked on */
  branch: string;

  /** Current session state */
  state: SessionState;

  /** Chat context for notifications */
  chatContext: ChatContext;

  /** User who triggered the session */
  triggeredBy: string;

  /** ISO timestamp when session was triggered */
  triggeredAt: string;

  /** ISO timestamp when execution started */
  startedAt?: string;

  /** ISO timestamp when session completed */
  completedAt?: string;

  /** ISO timestamp when session was paused */
  pausedAt?: string;

  /** Reason for pause (if paused) */
  pauseReason?: string;

  /** URL of created PR (if completed) */
  prUrl?: string;

  /** Error message (if failed) */
  error?: string;

  /** Execution metrics */
  metrics: SessionMetrics;
}

/**
 * Create a new session record
 */
export function createSession(
  id: string,
  project: string,
  sprint: number,
  branch: string,
  chatContext: ChatContext,
  triggeredBy: string
): Session {
  return {
    id,
    project,
    sprint,
    branch,
    state: 'QUEUED',
    chatContext,
    triggeredBy,
    triggeredAt: new Date().toISOString(),
    metrics: createDefaultMetrics(),
  };
}

/**
 * Session status response for status command
 */
export interface SessionStatus {
  id: string;
  project: string;
  sprint: number;
  state: SessionState;
  progress?: string;
  duration?: number;
  prUrl?: string;
  error?: string;
  pauseReason?: string;
}

/**
 * Extract status from a session
 */
export function getSessionStatus(session: Session): SessionStatus {
  const status: SessionStatus = {
    id: session.id,
    project: session.project,
    sprint: session.sprint,
    state: session.state,
  };

  if (session.startedAt) {
    const start = new Date(session.startedAt).getTime();
    const end = session.completedAt
      ? new Date(session.completedAt).getTime()
      : Date.now();
    status.duration = end - start;
  }

  if (session.prUrl) {
    status.prUrl = session.prUrl;
  }

  if (session.error) {
    status.error = session.error;
  }

  if (session.pauseReason) {
    status.pauseReason = session.pauseReason;
  }

  return status;
}
