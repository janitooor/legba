/**
 * Circuit Breaker Detection Tests
 */

import { describe, it, expect } from 'vitest';
import {
  detectCircuitBreaker,
  isSuccessfulCompletion,
  formatCircuitBreakerMessage,
} from './circuit-breaker.js';

describe('detectCircuitBreaker', () => {
  describe('same issue detection', () => {
    it('detects "same issue 3 times" pattern', () => {
      const result = detectCircuitBreaker(
        'Circuit breaker tripped: same issue 3 times'
      );
      expect(result.tripped).toBe(true);
      expect(result.type).toBe('same_issue');
      expect(result.reason).toContain('Same issue');
    });

    it('detects "same finding appeared 3 times" pattern', () => {
      const result = detectCircuitBreaker(
        'Halting: same finding appeared 3 times - type error in auth.ts'
      );
      expect(result.tripped).toBe(true);
      expect(result.type).toBe('same_issue');
    });

    it('extracts repeated issue from output', () => {
      const result = detectCircuitBreaker(
        'Circuit breaker: same issue 3 times\nSame issue: Failed to compile TypeScript'
      );
      expect(result.context?.repeatedIssue).toBe('Failed to compile TypeScript');
    });
  });

  describe('no progress detection', () => {
    it('detects "no progress 5 cycles" pattern', () => {
      const result = detectCircuitBreaker(
        'Circuit breaker triggered: no progress for 5 cycles'
      );
      expect(result.tripped).toBe(true);
      expect(result.type).toBe('no_progress');
      expect(result.context?.cyclesWithoutProgress).toBe(5);
    });

    it('detects "stalled no progress" pattern', () => {
      const result = detectCircuitBreaker(
        'Execution stalled - no progress detected'
      );
      expect(result.tripped).toBe(true);
      expect(result.type).toBe('no_progress');
    });
  });

  describe('timeout detection', () => {
    it('detects timeout pattern', () => {
      const result = detectCircuitBreaker(
        'Circuit breaker: session timeout exceeded'
      );
      expect(result.tripped).toBe(true);
      expect(result.type).toBe('timeout');
    });

    it('detects "8 hours timeout" pattern', () => {
      const result = detectCircuitBreaker(
        'Maximum runtime reached: 8 hours timeout'
      );
      expect(result.tripped).toBe(true);
      expect(result.type).toBe('timeout');
    });
  });

  describe('max cycles detection', () => {
    it('detects max cycles pattern', () => {
      const result = detectCircuitBreaker(
        'Circuit breaker: maximum cycles reached'
      );
      expect(result.tripped).toBe(true);
      expect(result.type).toBe('max_cycles');
      expect(result.context?.totalCycles).toBe(20);
    });

    it('detects "20 cycles limit" pattern', () => {
      const result = detectCircuitBreaker(
        'Halting: reached 20 cycles limit'
      );
      expect(result.tripped).toBe(true);
      expect(result.type).toBe('max_cycles');
    });
  });

  describe('generic detection', () => {
    it('detects generic circuit breaker trip', () => {
      const result = detectCircuitBreaker(
        'Circuit breaker has tripped'
      );
      expect(result.tripped).toBe(true);
    });

    it('detects "run mode halted" pattern', () => {
      const result = detectCircuitBreaker(
        'Run mode halted due to error'
      );
      expect(result.tripped).toBe(true);
    });
  });

  describe('no trip detection', () => {
    it('returns tripped=false for normal output', () => {
      const result = detectCircuitBreaker(
        'Sprint completed successfully!\nPR created: https://github.com/...'
      );
      expect(result.tripped).toBe(false);
    });

    it('returns tripped=false for empty output', () => {
      const result = detectCircuitBreaker('');
      expect(result.tripped).toBe(false);
    });

    it('returns tripped=false for unrelated content', () => {
      const result = detectCircuitBreaker(
        'Running tests...\nAll tests passed\nImplementation complete'
      );
      expect(result.tripped).toBe(false);
    });
  });

  describe('cycle count extraction', () => {
    it('extracts cycle count from output', () => {
      const result = detectCircuitBreaker(
        'Circuit breaker tripped: same issue 3 times\nTotal cycles: 15'
      );
      expect(result.context?.totalCycles).toBe(15);
    });

    it('handles missing cycle count', () => {
      const result = detectCircuitBreaker(
        'Circuit breaker tripped: same issue 3 times'
      );
      expect(result.context?.totalCycles).toBeUndefined();
    });
  });
});

describe('isSuccessfulCompletion', () => {
  it('detects "sprint completed" pattern', () => {
    expect(isSuccessfulCompletion('Sprint completed successfully!')).toBe(true);
  });

  it('detects "sprint complete" pattern', () => {
    expect(isSuccessfulCompletion('Sprint 3 complete')).toBe(true);
  });

  it('detects "all tasks completed" pattern', () => {
    expect(isSuccessfulCompletion('All tasks completed')).toBe(true);
  });

  it('detects "PR created" pattern', () => {
    expect(isSuccessfulCompletion('PR created: https://github.com/...')).toBe(true);
  });

  it('detects "draft PR ready" pattern', () => {
    expect(isSuccessfulCompletion('Draft PR ready for review')).toBe(true);
  });

  it('returns false for non-completion output', () => {
    expect(isSuccessfulCompletion('Running tests...')).toBe(false);
  });

  it('returns false for circuit breaker output', () => {
    expect(isSuccessfulCompletion('Circuit breaker tripped')).toBe(false);
  });
});

describe('formatCircuitBreakerMessage', () => {
  it('returns empty string for non-tripped result', () => {
    expect(formatCircuitBreakerMessage({ tripped: false })).toBe('');
  });

  it('includes reason in message', () => {
    const result = {
      tripped: true,
      reason: 'Same issue appeared 3 times',
      type: 'same_issue' as const,
    };
    const message = formatCircuitBreakerMessage(result);
    expect(message).toContain('Same issue appeared 3 times');
  });

  it('includes repeated issue if available', () => {
    const result = {
      tripped: true,
      reason: 'Same issue appeared 3 times',
      type: 'same_issue' as const,
      context: {
        repeatedIssue: 'TypeScript compilation error',
      },
    };
    const message = formatCircuitBreakerMessage(result);
    expect(message).toContain('TypeScript compilation error');
  });

  it('includes action hints', () => {
    const result = {
      tripped: true,
      reason: 'Test failure',
      type: 'same_issue' as const,
    };
    const message = formatCircuitBreakerMessage(result);
    expect(message).toContain('legba resume');
    expect(message).toContain('legba abort');
    expect(message).toContain('legba logs');
  });
});
