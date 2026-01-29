/**
 * Legba Notifier
 *
 * Dispatches notifications to the originating chat channel.
 */

import type { Session, ChatContext } from '../types/index.js';

/**
 * Moltbot context interface for sending messages
 */
export interface MoltbotContext {
  reply(text: string, options?: ReplyOptions): Promise<void>;
  sendTo(channelId: string, text: string, options?: ReplyOptions): Promise<void>;
}

export interface ReplyOptions {
  parseMode?: 'Markdown' | 'HTML';
  replyToMessageId?: string;
}

/**
 * Notification payload
 */
export interface Notification {
  type: 'started' | 'completed' | 'paused' | 'failed' | 'queued';
  message: string;
  sessionId: string;
  prUrl?: string;
}

/**
 * Notifier
 *
 * Sends notifications to chat platforms via Moltbot.
 */
export class Notifier {
  constructor(private moltbotContext: MoltbotContext) {}

  /**
   * Notify that a session has started
   */
  async notifyStarted(session: Session): Promise<void> {
    const message = this.formatStartedMessage(session);
    await this.send(session.chatContext, message);
  }

  /**
   * Notify that a session has completed
   */
  async notifyCompleted(session: Session, prUrl: string): Promise<void> {
    const message = this.formatCompletedMessage(session, prUrl);
    await this.send(session.chatContext, message);
  }

  /**
   * Notify that a session has been paused
   */
  async notifyPaused(session: Session, reason: string): Promise<void> {
    const message = this.formatPausedMessage(session, reason);
    await this.send(session.chatContext, message);
  }

  /**
   * Notify that a session has failed
   */
  async notifyFailed(session: Session, error: string): Promise<void> {
    const message = this.formatFailedMessage(session, error);
    await this.send(session.chatContext, message);
  }

  /**
   * Notify that a session has been queued
   */
  async notifyQueued(session: Session, position: number): Promise<void> {
    const message = this.formatQueuedMessage(session, position);
    await this.send(session.chatContext, message);
  }

  /**
   * Send a message to the chat context
   */
  private async send(context: ChatContext, message: string): Promise<void> {
    await this.moltbotContext.sendTo(context.channelId, message, {
      parseMode: 'Markdown',
      replyToMessageId: context.messageId,
    });
  }

  /**
   * Format started notification message
   */
  private formatStartedMessage(session: Session): string {
    return `**Legba** - Session Started

Sprint **${session.sprint}** on \`${session.project}\`

Session ID: \`${session.id}\`
Branch: \`${session.branch}\`

Check status: \`legba status ${session.id}\`
`;
  }

  /**
   * Format completed notification message
   */
  private formatCompletedMessage(session: Session, prUrl: string): string {
    const duration = session.completedAt && session.startedAt
      ? this.formatDuration(
          new Date(session.completedAt).getTime() -
          new Date(session.startedAt).getTime()
        )
      : 'unknown';

    return `**Legba** - Sprint Completed!

Sprint **${session.sprint}** on \`${session.project}\` completed successfully.

**Draft PR**: ${prUrl}

| Metric | Value |
|--------|-------|
| Files changed | ${session.metrics.filesChanged} |
| Lines added | ${session.metrics.linesAdded} |
| Lines removed | ${session.metrics.linesRemoved} |
| Duration | ${duration} |

Session ID: \`${session.id}\`
`;
  }

  /**
   * Format paused notification message
   */
  private formatPausedMessage(session: Session, reason: string): string {
    return `**Legba** - Session Paused

Sprint **${session.sprint}** on \`${session.project}\` has been paused.

**Reason**: ${reason}

**Options**:
- Resume: \`legba resume ${session.id}\`
- Abort: \`legba abort ${session.id}\`
- View logs: \`legba logs ${session.id}\`

Session ID: \`${session.id}\`
`;
  }

  /**
   * Format failed notification message
   */
  private formatFailedMessage(session: Session, error: string): string {
    return `**Legba** - Session Failed

Sprint **${session.sprint}** on \`${session.project}\` has failed.

**Error**: ${error}

View logs: \`legba logs ${session.id}\`

Session ID: \`${session.id}\`
`;
  }

  /**
   * Format queued notification message
   */
  private formatQueuedMessage(session: Session, position: number): string {
    return `**Legba** - Session Queued

Sprint **${session.sprint}** on \`${session.project}\` has been queued.

**Queue position**: ${position}

Another session is currently running. Your request will be processed automatically when the current session completes.

Check status: \`legba status ${session.id}\`

Session ID: \`${session.id}\`
`;
  }

  /**
   * Format duration in human-readable form
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}

/**
 * Create a notifier
 */
export function createNotifier(moltbotContext: MoltbotContext): Notifier {
  return new Notifier(moltbotContext);
}

/**
 * Create a no-op notifier for testing
 */
export function createNoopNotifier(): Notifier {
  const noopContext: MoltbotContext = {
    async reply() {},
    async sendTo() {},
  };
  return new Notifier(noopContext);
}
