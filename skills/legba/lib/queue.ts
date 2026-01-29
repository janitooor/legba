/**
 * Legba Session Queue
 *
 * Manages session queue for single-concurrency constraint.
 */

import type { QueuedRequest } from '../types/index.js';
import type { Storage } from './storage.js';

/**
 * Queue configuration
 */
export interface QueueConfig {
  maxDepth: number;
}

/**
 * Queue position result
 */
export interface QueuePosition {
  position: number;
  estimatedWaitMinutes: number;
}

/**
 * Default queue configuration
 */
const DEFAULT_CONFIG: QueueConfig = {
  maxDepth: 10,
};

/**
 * Session Queue
 *
 * FIFO queue for pending sessions when another is active.
 */
export class SessionQueue {
  private storage: Storage;
  private config: QueueConfig;

  constructor(storage: Storage, config: Partial<QueueConfig> = {}) {
    this.storage = storage;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a request to the queue
   *
   * @returns Queue position (1-based) or -1 if queue is full
   */
  async enqueue(request: QueuedRequest): Promise<number> {
    return this.storage.enqueue(request);
  }

  /**
   * Remove and return the next request from the queue
   */
  async dequeue(): Promise<QueuedRequest | null> {
    return this.storage.dequeue();
  }

  /**
   * Get the position of a request in the queue
   *
   * @returns Position (1-based) or -1 if not found
   */
  async getPosition(requestId: string): Promise<number> {
    return this.storage.getQueuePosition(requestId);
  }

  /**
   * Get estimated wait time based on position
   *
   * Assumes ~30 minutes per session on average
   */
  getEstimatedWait(position: number): number {
    const avgSessionMinutes = 30;
    return position * avgSessionMinutes;
  }

  /**
   * Get queue position with estimated wait
   */
  async getPositionWithWait(requestId: string): Promise<QueuePosition | null> {
    const position = await this.getPosition(requestId);
    if (position < 0) {
      return null;
    }

    return {
      position,
      estimatedWaitMinutes: this.getEstimatedWait(position),
    };
  }

  /**
   * Check if queue is full
   */
  async isFull(): Promise<boolean> {
    const position = await this.storage.getQueuePosition('_check_');
    // If we get -1, the queue doesn't exist or is empty
    // We need to check actual length
    // For now, rely on enqueue returning -1 when full
    return false;
  }

  /**
   * Get the maximum queue depth
   */
  getMaxDepth(): number {
    return this.config.maxDepth;
  }
}

/**
 * Create a session queue
 */
export function createSessionQueue(
  storage: Storage,
  config?: Partial<QueueConfig>
): SessionQueue {
  return new SessionQueue(storage, config);
}
