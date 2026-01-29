/**
 * Legba Session State Machine
 *
 * Manages session state transitions with clear invariants.
 */

import { SessionState, TERMINAL_STATES, isTerminalState } from '../types/index.js';

/**
 * Valid state transitions
 *
 * Maps each state to the states it can transition to.
 */
const TRANSITIONS: Record<SessionState, SessionState[]> = {
  QUEUED: ['STARTING', 'ABORTED'],
  STARTING: ['CLONING', 'FAILED', 'ABORTED'],
  CLONING: ['RUNNING', 'FAILED', 'ABORTED'],
  RUNNING: ['PAUSED', 'COMPLETING', 'FAILED', 'ABORTED'],
  PAUSED: ['RUNNING', 'ABORTED'],
  COMPLETING: ['COMPLETED', 'FAILED', 'ABORTED'],
  COMPLETED: [], // Terminal state
  FAILED: [], // Terminal state
  ABORTED: [], // Terminal state
};

/**
 * Error thrown when an invalid state transition is attempted
 */
export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: SessionState,
    public readonly to: SessionState
  ) {
    super(`Invalid transition from ${from} to ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

/**
 * Session State Machine
 *
 * Enforces valid state transitions and provides helpers for state management.
 */
export class SessionStateMachine {
  private _state: SessionState;

  /**
   * Create a new state machine
   *
   * @param initialState - The starting state (default: QUEUED)
   */
  constructor(initialState: SessionState = 'QUEUED') {
    this._state = initialState;
  }

  /**
   * Get the current state
   */
  get state(): SessionState {
    return this._state;
  }

  /**
   * Check if a transition to the target state is valid
   *
   * @param to - The target state
   * @returns true if the transition is valid
   */
  canTransition(to: SessionState): boolean {
    return TRANSITIONS[this._state].includes(to);
  }

  /**
   * Get all valid transitions from the current state
   *
   * @returns Array of states that can be transitioned to
   */
  getValidTransitions(): SessionState[] {
    return [...TRANSITIONS[this._state]];
  }

  /**
   * Transition to a new state
   *
   * @param to - The target state
   * @throws InvalidTransitionError if the transition is not valid
   */
  transition(to: SessionState): void {
    if (!this.canTransition(to)) {
      throw new InvalidTransitionError(this._state, to);
    }
    this._state = to;
  }

  /**
   * Try to transition to a new state
   *
   * @param to - The target state
   * @returns true if the transition succeeded, false otherwise
   */
  tryTransition(to: SessionState): boolean {
    if (!this.canTransition(to)) {
      return false;
    }
    this._state = to;
    return true;
  }

  /**
   * Check if the current state is terminal
   */
  isTerminal(): boolean {
    return isTerminalState(this._state);
  }

  /**
   * Check if the session can be aborted from the current state
   */
  canAbort(): boolean {
    return this.canTransition('ABORTED');
  }

  /**
   * Check if the session can be resumed (only from PAUSED)
   */
  canResume(): boolean {
    return this._state === 'PAUSED' && this.canTransition('RUNNING');
  }
}

/**
 * Check if a transition between two states is valid
 *
 * @param from - The source state
 * @param to - The target state
 * @returns true if the transition is valid
 */
export function isValidTransition(from: SessionState, to: SessionState): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Get valid transitions from a given state
 *
 * @param state - The source state
 * @returns Array of states that can be transitioned to
 */
export function getValidTransitions(state: SessionState): SessionState[] {
  return [...TRANSITIONS[state]];
}

/**
 * Get the expected next states in the happy path
 */
export function getHappyPath(): SessionState[] {
  return ['QUEUED', 'STARTING', 'CLONING', 'RUNNING', 'COMPLETING', 'COMPLETED'];
}

/**
 * Get all possible states
 */
export function getAllStates(): SessionState[] {
  return Object.keys(TRANSITIONS) as SessionState[];
}

/**
 * Get terminal states
 */
export function getTerminalStates(): SessionState[] {
  return [...TERMINAL_STATES];
}
