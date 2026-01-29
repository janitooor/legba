/**
 * Error Handling Tests
 */

import { describe, it, expect } from 'vitest';
import {
  LegbaError,
  isLegbaError,
  wrapError,
  withRetry,
  ErrorCodes,
} from './errors.js';

describe('LegbaError', () => {
  describe('constructor', () => {
    it('should create error with code', () => {
      const error = new LegbaError('E001');
      expect(error.code).toBe('E001');
      expect(error.message).toBe('Project not found');
      expect(error.hint).toBe('Check the project name with `legba projects`');
    });

    it('should create error with details', () => {
      const error = new LegbaError('E001', 'Project "xyz" does not exist');
      expect(error.details).toBe('Project "xyz" does not exist');
    });

    it('should be an instance of Error', () => {
      const error = new LegbaError('E001');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('LegbaError');
    });
  });

  describe('toUserMessage', () => {
    it('should format error for user', () => {
      const error = new LegbaError('E001');
      const message = error.toUserMessage();

      expect(message).toContain('**Error E001**');
      expect(message).toContain('Project not found');
      expect(message).toContain('*Hint*');
    });

    it('should include details when present', () => {
      const error = new LegbaError('E001', 'Project "xyz" does not exist');
      const message = error.toUserMessage();

      expect(message).toContain('Project "xyz" does not exist');
    });
  });
});

describe('isLegbaError', () => {
  it('should return true for LegbaError', () => {
    const error = new LegbaError('E001');
    expect(isLegbaError(error)).toBe(true);
  });

  it('should return false for other errors', () => {
    expect(isLegbaError(new Error('test'))).toBe(false);
    expect(isLegbaError('error')).toBe(false);
    expect(isLegbaError(null)).toBe(false);
    expect(isLegbaError(undefined)).toBe(false);
  });
});

describe('wrapError', () => {
  it('should return LegbaError as-is', () => {
    const error = new LegbaError('E001');
    expect(wrapError(error)).toBe(error);
  });

  it('should wrap not found errors as E009', () => {
    const error = wrapError(new Error('Session not found'));
    expect(error.code).toBe('E009');
  });

  it('should wrap timeout errors as E008', () => {
    const error = wrapError(new Error('Request timeout'));
    expect(error.code).toBe('E008');
  });

  it('should wrap GitHub errors as E012', () => {
    const error = wrapError(new Error('GitHub API rate limit'));
    expect(error.code).toBe('E012');
  });

  it('should wrap storage errors as E011', () => {
    const error = wrapError(new Error('R2 bucket error'));
    expect(error.code).toBe('E011');
  });

  it('should wrap unknown errors as E011', () => {
    const error = wrapError(new Error('Something went wrong'));
    expect(error.code).toBe('E011');
  });

  it('should handle non-Error objects', () => {
    const error = wrapError('string error');
    expect(error).toBeInstanceOf(LegbaError);
    expect(error.details).toBe('string error');
  });
});

describe('withRetry', () => {
  it('should return result on success', async () => {
    const result = await withRetry(async () => 'success');
    expect(result).toBe('success');
  });

  it('should retry on transient failure', async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Transient error');
        }
        return 'success';
      },
      3,
      10
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should throw after max attempts', async () => {
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error('Persistent error');
        },
        3,
        10
      )
    ).rejects.toThrow('Persistent error');

    expect(attempts).toBe(3);
  });

  it('should not retry non-retryable errors', async () => {
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new LegbaError('E001');
        },
        3,
        10
      )
    ).rejects.toThrow('Project not found');

    expect(attempts).toBe(1);
  });

  it('should retry retryable LegbaErrors', async () => {
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new LegbaError('E011'); // Storage error - retryable
        },
        3,
        10
      )
    ).rejects.toThrow();

    expect(attempts).toBe(3);
  });
});

describe('ErrorCodes', () => {
  it('should have all documented error codes', () => {
    const expectedCodes = [
      'E001', 'E002', 'E003', 'E004', 'E005',
      'E006', 'E007', 'E008', 'E009', 'E010',
      'E011', 'E012',
    ];

    for (const code of expectedCodes) {
      expect(ErrorCodes[code as keyof typeof ErrorCodes]).toBeDefined();
      expect(ErrorCodes[code as keyof typeof ErrorCodes].message).toBeDefined();
      expect(ErrorCodes[code as keyof typeof ErrorCodes].hint).toBeDefined();
    }
  });

  it('should have unique messages', () => {
    const messages = Object.values(ErrorCodes).map((e) => e.message);
    const unique = new Set(messages);
    expect(unique.size).toBe(messages.length);
  });
});
