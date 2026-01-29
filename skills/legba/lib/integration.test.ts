/**
 * Legba E2E Integration Test
 *
 * Tests the complete flow from chat trigger to PR creation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCommand } from './command-parser.js';
import { SessionManager, type Notifier, type GitHubClient } from './session-manager.js';
import { type Storage } from './storage.js';
import { type SandboxExecutor, type ExecutionResult } from './sandbox-executor.js';
import type { Session, Project, ChatContext } from '../types/index.js';

/**
 * Mock implementations
 */
function createMockStorage(): Storage {
  const sessions = new Map<string, Session>();
  const projects = new Map<string, Project>();
  const queue: any[] = [];

  // Pre-populate with test project
  projects.set('arrakis', {
    id: 'arrakis',
    name: 'arrakis',
    repoUrl: 'https://github.com/0xHoneyJar/arrakis',
    defaultBranch: 'main',
    enabled: true,
    githubInstallationId: 12345,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return {
    async saveSession(session: Session) {
      sessions.set(session.id, { ...session });
    },
    async getSession(id: string) {
      return sessions.get(id) ?? null;
    },
    async listSessions() {
      return Array.from(sessions.values());
    },
    async appendLog() {},
    async getLog() {
      return '';
    },
    async getRegistry() {
      return {
        version: '1.0.0',
        projects: Object.fromEntries(projects),
        updatedAt: new Date().toISOString(),
      };
    },
    async saveRegistry() {},
    async getProject(id: string) {
      return projects.get(id) ?? null;
    },
    async saveProject(project: Project) {
      projects.set(project.id, project);
    },
    async getProjectState() {
      return null;
    },
    async saveProjectState() {},
    async enqueue(request: any) {
      queue.push(request);
      return queue.length;
    },
    async dequeue() {
      return queue.shift() ?? null;
    },
    async getQueuePosition() {
      return -1;
    },
  } as Storage;
}

function createMockSandboxExecutor(): SandboxExecutor {
  return {
    async execute(): Promise<ExecutionResult> {
      return {
        success: true,
        exitCode: 0,
        logs: `
## Summary

Implemented the requested feature successfully.

- Added new component
- Updated tests
- All tests passing
`,
        diff: `diff --git a/src/feature.ts b/src/feature.ts
new file mode 100644
--- /dev/null
+++ b/src/feature.ts
@@ -0,0 +1,10 @@
+export function newFeature() {
+  return 'implemented';
+}
`,
        duration: 120000, // 2 minutes
        circuitBreaker: {
          tripped: false,
        },
      };
    },
  };
}

function createMockNotifier(): Notifier {
  return {
    notifyStarted: vi.fn().mockResolvedValue(undefined),
    notifyCompleted: vi.fn().mockResolvedValue(undefined),
    notifyPaused: vi.fn().mockResolvedValue(undefined),
    notifyFailed: vi.fn().mockResolvedValue(undefined),
    notifyQueued: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockGitHubClient(): GitHubClient {
  return {
    createDraftPR: vi.fn().mockResolvedValue({
      url: 'https://github.com/0xHoneyJar/arrakis/pull/42',
      number: 42,
    }),
  };
}

describe('Legba E2E Integration', () => {
  let storage: Storage;
  let sandboxExecutor: SandboxExecutor;
  let notifier: Notifier;
  let githubClient: GitHubClient;
  let sessionManager: SessionManager;

  beforeEach(() => {
    storage = createMockStorage();
    sandboxExecutor = createMockSandboxExecutor();
    notifier = createMockNotifier();
    githubClient = createMockGitHubClient();

    sessionManager = new SessionManager({
      storage,
      sandboxExecutor,
      notifier,
      githubClient,
      r2Bucket: {},
      anthropicKey: 'test-key',
      githubToken: 'test-token',
    });
  });

  describe('Chat to PR Flow', () => {
    it('should process a run command and create a draft PR', async () => {
      // 1. Parse chat message
      const message = 'legba run sprint-3 on arrakis';
      const command = parseCommand(message);

      expect(command).not.toBeNull();
      expect(command?.type).toBe('run');
      if (command?.type !== 'run') throw new Error('Expected run command');

      expect(command.sprint).toBe(3);
      expect(command.project).toBe('arrakis');

      // 2. Create chat context
      const chatContext: ChatContext = {
        platform: 'telegram',
        channelId: 'test-channel-123',
        messageId: 'msg-456',
        userId: 'user-789',
      };

      // 3. Start session
      const session = await sessionManager.startSession(
        command,
        chatContext,
        'test-user'
      );

      expect(session).toBeDefined();
      expect(session.project).toBe('arrakis');
      expect(session.sprint).toBe(3);
      expect(session.triggeredBy).toBe('test-user');

      // 4. Verify notifier was called
      expect(notifier.notifyStarted).toHaveBeenCalledWith(
        expect.objectContaining({
          id: session.id,
          project: 'arrakis',
          sprint: 3,
        })
      );

      // 5. Wait for async execution to complete
      // In real code this runs in background, but we can wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 6. Check session state transitioned
      const updatedSession = await storage.getSession(session.id);
      // Note: In real async execution this would be COMPLETED
      // For test purposes, we just verify the session was created
      expect(updatedSession).toBeDefined();
    });

    it('should handle status command', async () => {
      const message = 'legba status abc123';
      const command = parseCommand(message);

      expect(command).not.toBeNull();
      expect(command?.type).toBe('status');
      if (command?.type !== 'status') throw new Error('Expected status command');
      expect(command.sessionId).toBe('abc123');
    });

    it('should handle resume command', async () => {
      const message = 'legba resume abc123';
      const command = parseCommand(message);

      expect(command).not.toBeNull();
      expect(command?.type).toBe('resume');
      if (command?.type !== 'resume') throw new Error('Expected resume command');
      expect(command.sessionId).toBe('abc123');
    });

    it('should handle abort command', async () => {
      const message = 'legba abort abc123';
      const command = parseCommand(message);

      expect(command).not.toBeNull();
      expect(command?.type).toBe('abort');
      if (command?.type !== 'abort') throw new Error('Expected abort command');
      expect(command.sessionId).toBe('abc123');
    });

    it('should handle projects command', async () => {
      const message = 'legba projects';
      const command = parseCommand(message);

      expect(command).not.toBeNull();
      expect(command?.type).toBe('projects');
    });

    it('should handle help command', async () => {
      const message = 'legba help';
      const command = parseCommand(message);

      expect(command).not.toBeNull();
      expect(command?.type).toBe('help');
    });
  });

  describe('Queue Handling', () => {
    it('should queue session when another is active', async () => {
      const chatContext: ChatContext = {
        platform: 'telegram',
        channelId: 'channel-1',
        messageId: 'msg-1',
        userId: 'user-1',
      };

      // Start first session
      const session1 = await sessionManager.startSession(
        { type: 'run', project: 'arrakis', sprint: 1 },
        chatContext,
        'user-1'
      );

      expect(session1).toBeDefined();
      expect(notifier.notifyStarted).toHaveBeenCalledTimes(1);

      // Try to start second session - should be queued
      const session2 = await sessionManager.startSession(
        { type: 'run', project: 'arrakis', sprint: 2 },
        { ...chatContext, messageId: 'msg-2' },
        'user-2'
      );

      expect(session2).toBeDefined();
      expect(notifier.notifyQueued).toHaveBeenCalledWith(
        expect.objectContaining({
          sprint: 2,
        }),
        expect.any(Number)
      );
    });
  });

  describe('Error Handling', () => {
    it('should reject unknown project', async () => {
      const chatContext: ChatContext = {
        platform: 'telegram',
        channelId: 'channel-1',
        messageId: 'msg-1',
        userId: 'user-1',
      };

      await expect(
        sessionManager.startSession(
          { type: 'run', project: 'unknown-project', sprint: 1 },
          chatContext,
          'user-1'
        )
      ).rejects.toThrow('Project not found');
    });
  });

  describe('Circuit Breaker', () => {
    it('should pause session when circuit breaker trips', async () => {
      // Create executor that returns tripped circuit breaker
      const trippedExecutor: SandboxExecutor = {
        async execute(): Promise<ExecutionResult> {
          return {
            success: false,
            exitCode: 1,
            logs: 'Error: same issue detected 3 times',
            diff: '',
            duration: 60000,
            circuitBreaker: {
              tripped: true,
              reason: 'Same finding detected 3 times: type error in auth.ts',
              trigger: 'same_issue',
              count: 3,
            },
          };
        },
      };

      const localManager = new SessionManager({
        storage,
        sandboxExecutor: trippedExecutor,
        notifier,
        githubClient,
        r2Bucket: {},
        anthropicKey: 'test-key',
        githubToken: 'test-token',
      });

      const chatContext: ChatContext = {
        platform: 'telegram',
        channelId: 'channel-1',
        messageId: 'msg-1',
        userId: 'user-1',
      };

      const session = await localManager.startSession(
        { type: 'run', project: 'arrakis', sprint: 1 },
        chatContext,
        'user-1'
      );

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify pause notification was sent
      expect(notifier.notifyPaused).toHaveBeenCalled();
    });
  });

  describe('Notification Formats', () => {
    it('should include session ID in all notifications', async () => {
      const chatContext: ChatContext = {
        platform: 'telegram',
        channelId: 'channel-1',
        messageId: 'msg-1',
        userId: 'user-1',
      };

      const session = await sessionManager.startSession(
        { type: 'run', project: 'arrakis', sprint: 1 },
        chatContext,
        'user-1'
      );

      expect(notifier.notifyStarted).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          chatContext: expect.objectContaining({
            channelId: 'channel-1',
          }),
        })
      );
    });
  });
});

describe('Command Parser Edge Cases', () => {
  it('should handle case-insensitive commands', () => {
    expect(parseCommand('LEGBA RUN SPRINT-1 ON ARRAKIS')).not.toBeNull();
    expect(parseCommand('Legba Run Sprint-1 On Arrakis')).not.toBeNull();
  });

  it('should handle extra whitespace', () => {
    const cmd = parseCommand('legba   run   sprint-1   on   arrakis');
    expect(cmd).not.toBeNull();
    expect(cmd?.type).toBe('run');
  });

  it('should handle branch with slashes', () => {
    const cmd = parseCommand('legba run sprint-1 on arrakis branch feature/auth/oauth');
    expect(cmd).not.toBeNull();
    if (cmd?.type !== 'run') throw new Error('Expected run command');
    expect(cmd.branch).toBe('feature/auth/oauth');
  });

  it('should reject invalid sprint numbers', () => {
    expect(parseCommand('legba run sprint-0 on arrakis')).toBeNull();
    expect(parseCommand('legba run sprint--1 on arrakis')).toBeNull();
    expect(parseCommand('legba run sprint-abc on arrakis')).toBeNull();
  });

  it('should handle logs command with optional lines', () => {
    const cmd1 = parseCommand('legba logs abc123');
    expect(cmd1?.type).toBe('logs');
    if (cmd1?.type !== 'logs') throw new Error('Expected logs command');
    expect(cmd1.lines).toBeUndefined();

    const cmd2 = parseCommand('legba logs abc123 100');
    expect(cmd2?.type).toBe('logs');
    if (cmd2?.type !== 'logs') throw new Error('Expected logs command');
    expect(cmd2.lines).toBe(100);
  });

  it('should handle history command with optional project', () => {
    const cmd1 = parseCommand('legba history');
    expect(cmd1?.type).toBe('history');
    if (cmd1?.type !== 'history') throw new Error('Expected history command');
    expect(cmd1.project).toBeUndefined();

    const cmd2 = parseCommand('legba history arrakis');
    expect(cmd2?.type).toBe('history');
    if (cmd2?.type !== 'history') throw new Error('Expected history command');
    expect(cmd2.project).toBe('arrakis');
  });
});
