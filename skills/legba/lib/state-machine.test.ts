/**
 * State Machine Tests
 */

import { describe, it, expect } from 'vitest';
import {
  SessionStateMachine,
  InvalidTransitionError,
  isValidTransition,
  getValidTransitions,
  getHappyPath,
  getAllStates,
  getTerminalStates,
} from './state-machine.js';
import type { SessionState } from '../types/index.js';

describe('SessionStateMachine', () => {
  describe('initialization', () => {
    it('starts in QUEUED state by default', () => {
      const sm = new SessionStateMachine();
      expect(sm.state).toBe('QUEUED');
    });

    it('can be initialized with a specific state', () => {
      const sm = new SessionStateMachine('RUNNING');
      expect(sm.state).toBe('RUNNING');
    });
  });

  describe('canTransition', () => {
    it('allows valid transitions', () => {
      const sm = new SessionStateMachine('QUEUED');
      expect(sm.canTransition('STARTING')).toBe(true);
      expect(sm.canTransition('ABORTED')).toBe(true);
    });

    it('disallows invalid transitions', () => {
      const sm = new SessionStateMachine('QUEUED');
      expect(sm.canTransition('RUNNING')).toBe(false);
      expect(sm.canTransition('COMPLETED')).toBe(false);
    });

    it('disallows transitions from terminal states', () => {
      const sm = new SessionStateMachine('COMPLETED');
      expect(sm.canTransition('QUEUED')).toBe(false);
      expect(sm.canTransition('RUNNING')).toBe(false);
    });
  });

  describe('transition', () => {
    it('transitions to valid states', () => {
      const sm = new SessionStateMachine('QUEUED');
      sm.transition('STARTING');
      expect(sm.state).toBe('STARTING');
    });

    it('throws on invalid transitions', () => {
      const sm = new SessionStateMachine('QUEUED');
      expect(() => sm.transition('COMPLETED')).toThrow(InvalidTransitionError);
    });

    it('error contains from and to states', () => {
      const sm = new SessionStateMachine('QUEUED');
      try {
        sm.transition('COMPLETED');
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidTransitionError);
        expect((e as InvalidTransitionError).from).toBe('QUEUED');
        expect((e as InvalidTransitionError).to).toBe('COMPLETED');
      }
    });
  });

  describe('tryTransition', () => {
    it('returns true and transitions on valid transition', () => {
      const sm = new SessionStateMachine('QUEUED');
      const result = sm.tryTransition('STARTING');
      expect(result).toBe(true);
      expect(sm.state).toBe('STARTING');
    });

    it('returns false and does not transition on invalid transition', () => {
      const sm = new SessionStateMachine('QUEUED');
      const result = sm.tryTransition('COMPLETED');
      expect(result).toBe(false);
      expect(sm.state).toBe('QUEUED');
    });
  });

  describe('getValidTransitions', () => {
    it('returns valid transitions for QUEUED', () => {
      const sm = new SessionStateMachine('QUEUED');
      expect(sm.getValidTransitions()).toEqual(['STARTING', 'ABORTED']);
    });

    it('returns valid transitions for RUNNING', () => {
      const sm = new SessionStateMachine('RUNNING');
      expect(sm.getValidTransitions()).toEqual(['PAUSED', 'COMPLETING', 'FAILED', 'ABORTED']);
    });

    it('returns empty array for terminal states', () => {
      const sm = new SessionStateMachine('COMPLETED');
      expect(sm.getValidTransitions()).toEqual([]);
    });
  });

  describe('isTerminal', () => {
    it('returns true for terminal states', () => {
      expect(new SessionStateMachine('COMPLETED').isTerminal()).toBe(true);
      expect(new SessionStateMachine('FAILED').isTerminal()).toBe(true);
      expect(new SessionStateMachine('ABORTED').isTerminal()).toBe(true);
    });

    it('returns false for non-terminal states', () => {
      expect(new SessionStateMachine('QUEUED').isTerminal()).toBe(false);
      expect(new SessionStateMachine('RUNNING').isTerminal()).toBe(false);
      expect(new SessionStateMachine('PAUSED').isTerminal()).toBe(false);
    });
  });

  describe('canAbort', () => {
    it('returns true for abortable states', () => {
      expect(new SessionStateMachine('QUEUED').canAbort()).toBe(true);
      expect(new SessionStateMachine('RUNNING').canAbort()).toBe(true);
      expect(new SessionStateMachine('PAUSED').canAbort()).toBe(true);
    });

    it('returns false for terminal states', () => {
      expect(new SessionStateMachine('COMPLETED').canAbort()).toBe(false);
      expect(new SessionStateMachine('FAILED').canAbort()).toBe(false);
      expect(new SessionStateMachine('ABORTED').canAbort()).toBe(false);
    });
  });

  describe('canResume', () => {
    it('returns true only for PAUSED state', () => {
      expect(new SessionStateMachine('PAUSED').canResume()).toBe(true);
    });

    it('returns false for non-PAUSED states', () => {
      expect(new SessionStateMachine('QUEUED').canResume()).toBe(false);
      expect(new SessionStateMachine('RUNNING').canResume()).toBe(false);
      expect(new SessionStateMachine('COMPLETED').canResume()).toBe(false);
    });
  });

  describe('happy path traversal', () => {
    it('can traverse the happy path', () => {
      const sm = new SessionStateMachine();
      expect(sm.state).toBe('QUEUED');

      sm.transition('STARTING');
      expect(sm.state).toBe('STARTING');

      sm.transition('CLONING');
      expect(sm.state).toBe('CLONING');

      sm.transition('RUNNING');
      expect(sm.state).toBe('RUNNING');

      sm.transition('COMPLETING');
      expect(sm.state).toBe('COMPLETING');

      sm.transition('COMPLETED');
      expect(sm.state).toBe('COMPLETED');
      expect(sm.isTerminal()).toBe(true);
    });
  });

  describe('pause/resume flow', () => {
    it('can pause and resume', () => {
      const sm = new SessionStateMachine('RUNNING');

      sm.transition('PAUSED');
      expect(sm.state).toBe('PAUSED');
      expect(sm.canResume()).toBe(true);

      sm.transition('RUNNING');
      expect(sm.state).toBe('RUNNING');
    });
  });

  describe('abort from any non-terminal state', () => {
    const nonTerminalStates: SessionState[] = [
      'QUEUED', 'STARTING', 'CLONING', 'RUNNING', 'PAUSED', 'COMPLETING'
    ];

    nonTerminalStates.forEach((state) => {
      it(`can abort from ${state}`, () => {
        const sm = new SessionStateMachine(state);
        expect(sm.canAbort()).toBe(true);
        sm.transition('ABORTED');
        expect(sm.state).toBe('ABORTED');
      });
    });
  });
});

describe('isValidTransition', () => {
  it('validates transitions correctly', () => {
    expect(isValidTransition('QUEUED', 'STARTING')).toBe(true);
    expect(isValidTransition('QUEUED', 'COMPLETED')).toBe(false);
  });
});

describe('getValidTransitions', () => {
  it('returns correct transitions', () => {
    expect(getValidTransitions('RUNNING')).toContain('PAUSED');
    expect(getValidTransitions('RUNNING')).toContain('COMPLETING');
    expect(getValidTransitions('COMPLETED')).toHaveLength(0);
  });
});

describe('getHappyPath', () => {
  it('returns the expected happy path', () => {
    expect(getHappyPath()).toEqual([
      'QUEUED', 'STARTING', 'CLONING', 'RUNNING', 'COMPLETING', 'COMPLETED'
    ]);
  });
});

describe('getAllStates', () => {
  it('returns all 9 states', () => {
    const states = getAllStates();
    expect(states).toHaveLength(9);
    expect(states).toContain('QUEUED');
    expect(states).toContain('COMPLETED');
    expect(states).toContain('PAUSED');
  });
});

describe('getTerminalStates', () => {
  it('returns the 3 terminal states', () => {
    const states = getTerminalStates();
    expect(states).toHaveLength(3);
    expect(states).toContain('COMPLETED');
    expect(states).toContain('FAILED');
    expect(states).toContain('ABORTED');
  });
});
