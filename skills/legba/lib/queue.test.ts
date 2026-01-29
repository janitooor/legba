/**
 * Session Queue Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SessionQueue } from './queue.js';
import type { QueuedRequest } from '../types/index.js';
import type { Storage } from './storage.js';

/**
 * Create mock storage for testing
 */
function createMockStorage(): Storage {
  const queue: QueuedRequest[] = [];
  const maxDepth = 10;

  return {
    async enqueue(request: QueuedRequest) {
      if (queue.length >= maxDepth) {
        return -1;
      }
      queue.push(request);
      return queue.length;
    },
    async dequeue() {
      return queue.shift() ?? null;
    },
    async getQueuePosition(requestId: string) {
      const index = queue.findIndex((r) => r.id === requestId);
      return index >= 0 ? index + 1 : -1;
    },
    // Stubs for other methods
    async saveSession() {},
    async getSession() { return null; },
    async listSessions() { return []; },
    async appendLog() {},
    async getLog() { return ''; },
    async getRegistry() { return null; },
    async saveRegistry() {},
    async getProject() { return null; },
    async saveProject() {},
    async getProjectState() { return null; },
    async saveProjectState() {},
  } as Storage;
}

describe('SessionQueue', () => {
  let storage: Storage;
  let queue: SessionQueue;

  beforeEach(() => {
    storage = createMockStorage();
    queue = new SessionQueue(storage);
  });

  describe('enqueue', () => {
    it('should add requests to queue', async () => {
      const request: QueuedRequest = {
        id: 'req-1',
        project: 'test-project',
        sprint: 1,
        branch: 'main',
        chatContext: {
          platform: 'telegram',
          channelId: 'ch-1',
          messageId: 'msg-1',
          userId: 'user-1',
        },
        triggeredBy: 'user-1',
        queuedAt: new Date().toISOString(),
      };

      const position = await queue.enqueue(request);
      expect(position).toBe(1);
    });

    it('should return incrementing positions', async () => {
      for (let i = 1; i <= 3; i++) {
        const request: QueuedRequest = {
          id: `req-${i}`,
          project: 'test-project',
          sprint: i,
          branch: 'main',
          chatContext: {
            platform: 'telegram',
            channelId: 'ch-1',
            messageId: `msg-${i}`,
            userId: 'user-1',
          },
          triggeredBy: 'user-1',
          queuedAt: new Date().toISOString(),
        };

        const position = await queue.enqueue(request);
        expect(position).toBe(i);
      }
    });
  });

  describe('dequeue', () => {
    it('should return null for empty queue', async () => {
      const result = await queue.dequeue();
      expect(result).toBeNull();
    });

    it('should return requests in FIFO order', async () => {
      const requests: QueuedRequest[] = [];
      for (let i = 1; i <= 3; i++) {
        const request: QueuedRequest = {
          id: `req-${i}`,
          project: 'test-project',
          sprint: i,
          branch: 'main',
          chatContext: {
            platform: 'telegram',
            channelId: 'ch-1',
            messageId: `msg-${i}`,
            userId: 'user-1',
          },
          triggeredBy: 'user-1',
          queuedAt: new Date().toISOString(),
        };
        requests.push(request);
        await queue.enqueue(request);
      }

      for (let i = 0; i < 3; i++) {
        const result = await queue.dequeue();
        expect(result?.id).toBe(requests[i].id);
      }

      expect(await queue.dequeue()).toBeNull();
    });
  });

  describe('getPosition', () => {
    it('should return -1 for non-existent request', async () => {
      const position = await queue.getPosition('non-existent');
      expect(position).toBe(-1);
    });

    it('should return correct position', async () => {
      for (let i = 1; i <= 3; i++) {
        const request: QueuedRequest = {
          id: `req-${i}`,
          project: 'test-project',
          sprint: i,
          branch: 'main',
          chatContext: {
            platform: 'telegram',
            channelId: 'ch-1',
            messageId: `msg-${i}`,
            userId: 'user-1',
          },
          triggeredBy: 'user-1',
          queuedAt: new Date().toISOString(),
        };
        await queue.enqueue(request);
      }

      expect(await queue.getPosition('req-1')).toBe(1);
      expect(await queue.getPosition('req-2')).toBe(2);
      expect(await queue.getPosition('req-3')).toBe(3);
    });

    it('should update position after dequeue', async () => {
      for (let i = 1; i <= 3; i++) {
        const request: QueuedRequest = {
          id: `req-${i}`,
          project: 'test-project',
          sprint: i,
          branch: 'main',
          chatContext: {
            platform: 'telegram',
            channelId: 'ch-1',
            messageId: `msg-${i}`,
            userId: 'user-1',
          },
          triggeredBy: 'user-1',
          queuedAt: new Date().toISOString(),
        };
        await queue.enqueue(request);
      }

      await queue.dequeue(); // Remove req-1

      expect(await queue.getPosition('req-1')).toBe(-1);
      expect(await queue.getPosition('req-2')).toBe(1);
      expect(await queue.getPosition('req-3')).toBe(2);
    });
  });

  describe('getEstimatedWait', () => {
    it('should calculate wait time based on position', () => {
      expect(queue.getEstimatedWait(1)).toBe(30);
      expect(queue.getEstimatedWait(2)).toBe(60);
      expect(queue.getEstimatedWait(5)).toBe(150);
    });
  });

  describe('getPositionWithWait', () => {
    it('should return null for non-existent request', async () => {
      const result = await queue.getPositionWithWait('non-existent');
      expect(result).toBeNull();
    });

    it('should return position and estimated wait', async () => {
      const request: QueuedRequest = {
        id: 'req-1',
        project: 'test-project',
        sprint: 1,
        branch: 'main',
        chatContext: {
          platform: 'telegram',
          channelId: 'ch-1',
          messageId: 'msg-1',
          userId: 'user-1',
        },
        triggeredBy: 'user-1',
        queuedAt: new Date().toISOString(),
      };
      await queue.enqueue(request);

      const result = await queue.getPositionWithWait('req-1');
      expect(result).toEqual({
        position: 1,
        estimatedWaitMinutes: 30,
      });
    });
  });

  describe('maxDepth', () => {
    it('should return configured max depth', () => {
      expect(queue.getMaxDepth()).toBe(10);

      const customQueue = new SessionQueue(storage, { maxDepth: 5 });
      expect(customQueue.getMaxDepth()).toBe(5);
    });
  });
});
