/**
 * Legba Circuit Breaker Detection
 *
 * Detects when Loa's circuit breaker trips from Claude Code output.
 */

/**
 * Circuit breaker detection result
 */
export interface CircuitBreakerResult {
  /** Whether the circuit breaker tripped */
  tripped: boolean;

  /** Reason for the trip (if tripped) */
  reason?: string;

  /** Type of circuit breaker that tripped */
  type?: 'same_issue' | 'no_progress' | 'timeout' | 'max_cycles';

  /** Additional context about the trip */
  context?: {
    /** Issue that repeated (for same_issue type) */
    repeatedIssue?: string;
    /** Number of cycles without progress (for no_progress type) */
    cyclesWithoutProgress?: number;
    /** Total cycles run */
    totalCycles?: number;
  };
}

/**
 * Patterns that indicate circuit breaker has tripped
 */
const PATTERNS = {
  // Same issue repeated 3 times
  sameIssue: [
    /circuit\s*breaker.*same\s*(issue|finding|error).*3\s*times?/i,
    /halting.*same\s*(issue|finding|error)\s*(3|three)\s*times?/i,
    /repeated\s*failure.*circuit\s*breaker/i,
    /same\s*finding\s*appeared\s*3\s*times/i,
  ],

  // No progress for 5 cycles
  noProgress: [
    /circuit\s*breaker.*no\s*progress.*5\s*cycles?/i,
    /halting.*no\s*(progress|file\s*changes?).*5\s*cycles?/i,
    /stalled.*no\s*progress/i,
    /5\s*cycles?\s*with(out)?\s*no\s*progress/i,
  ],

  // Timeout reached
  timeout: [
    /circuit\s*breaker.*timeout/i,
    /session\s*timeout.*exceeded/i,
    /maximum\s*runtime.*exceeded/i,
    /8\s*hours?\s*timeout/i,
  ],

  // Maximum cycles reached
  maxCycles: [
    /circuit\s*breaker.*max(imum)?\s*cycles?/i,
    /reached\s*max(imum)?\s*cycles?.*20/i,
    /20\s*cycles?\s*limit/i,
  ],

  // Generic circuit breaker trip
  generic: [
    /circuit\s*breaker\s*(has\s*)?(tripped|triggered|activated)/i,
    /run\s*mode.*halted/i,
    /autonomous\s*execution.*stopped/i,
  ],
};

/**
 * Extract repeated issue from output
 */
function extractRepeatedIssue(output: string): string | undefined {
  // Look for patterns like "Same issue: <description>"
  const match = output.match(/same\s*(issue|finding|error):\s*(.+?)(?:\n|$)/i);
  return match?.[2]?.trim();
}

/**
 * Extract cycle count from output
 */
function extractCycleCount(output: string): number | undefined {
  // Look for patterns like "Cycles: 15" or "Total cycles: 15"
  const match = output.match(/(?:total\s*)?cycles?:\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Detect if the circuit breaker has tripped from Claude Code output.
 *
 * @param output - The stdout/stderr output from Claude Code execution
 * @returns Circuit breaker detection result
 *
 * @example
 * detectCircuitBreaker('Circuit breaker tripped: same issue 3 times')
 * // => { tripped: true, reason: '...', type: 'same_issue' }
 *
 * @example
 * detectCircuitBreaker('Sprint completed successfully')
 * // => { tripped: false }
 */
export function detectCircuitBreaker(output: string): CircuitBreakerResult {
  // Check for same issue pattern
  for (const pattern of PATTERNS.sameIssue) {
    if (pattern.test(output)) {
      return {
        tripped: true,
        reason: 'Same issue appeared 3 times',
        type: 'same_issue',
        context: {
          repeatedIssue: extractRepeatedIssue(output),
          totalCycles: extractCycleCount(output),
        },
      };
    }
  }

  // Check for no progress pattern
  for (const pattern of PATTERNS.noProgress) {
    if (pattern.test(output)) {
      return {
        tripped: true,
        reason: 'No progress for 5 cycles',
        type: 'no_progress',
        context: {
          cyclesWithoutProgress: 5,
          totalCycles: extractCycleCount(output),
        },
      };
    }
  }

  // Check for timeout pattern
  for (const pattern of PATTERNS.timeout) {
    if (pattern.test(output)) {
      return {
        tripped: true,
        reason: 'Session timeout exceeded',
        type: 'timeout',
        context: {
          totalCycles: extractCycleCount(output),
        },
      };
    }
  }

  // Check for max cycles pattern
  for (const pattern of PATTERNS.maxCycles) {
    if (pattern.test(output)) {
      return {
        tripped: true,
        reason: 'Maximum cycles (20) reached',
        type: 'max_cycles',
        context: {
          totalCycles: 20,
        },
      };
    }
  }

  // Check for generic circuit breaker trip
  for (const pattern of PATTERNS.generic) {
    if (pattern.test(output)) {
      return {
        tripped: true,
        reason: 'Circuit breaker tripped',
        type: undefined,
        context: {
          totalCycles: extractCycleCount(output),
        },
      };
    }
  }

  // No circuit breaker detected
  return { tripped: false };
}

/**
 * Check if output indicates successful completion
 */
export function isSuccessfulCompletion(output: string): boolean {
  const successPatterns = [
    /sprint.*completed?\s*(successfully)?/i,
    /all\s*tasks?\s*completed?/i,
    /implementation\s*complete/i,
    /PR\s*created/i,
    /draft\s*PR.*ready/i,
  ];

  return successPatterns.some((p) => p.test(output));
}

/**
 * Format circuit breaker result for user notification
 */
export function formatCircuitBreakerMessage(result: CircuitBreakerResult): string {
  if (!result.tripped) {
    return '';
  }

  let message = `Circuit breaker tripped: ${result.reason}`;

  if (result.context?.repeatedIssue) {
    message += `\n\nRepeated issue: ${result.context.repeatedIssue}`;
  }

  if (result.context?.totalCycles) {
    message += `\n\nTotal cycles run: ${result.context.totalCycles}`;
  }

  message += '\n\nYou can:';
  message += '\n- `legba resume {session-id}` to continue';
  message += '\n- `legba abort {session-id}` to cancel';
  message += '\n- `legba logs {session-id}` to review logs';

  return message;
}
