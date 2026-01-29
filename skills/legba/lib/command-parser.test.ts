/**
 * Command Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parseCommand, isLegbaMessage, formatCommand } from './command-parser.js';

describe('parseCommand', () => {
  describe('run command', () => {
    it('parses run command with project and sprint', () => {
      const result = parseCommand('legba run sprint-3 on myproject');
      expect(result).toEqual({
        type: 'run',
        project: 'myproject',
        sprint: 3,
        branch: undefined,
      });
    });

    it('parses run command with space instead of hyphen', () => {
      const result = parseCommand('legba run sprint 3 on myproject');
      expect(result).toEqual({
        type: 'run',
        project: 'myproject',
        sprint: 3,
        branch: undefined,
      });
    });

    it('parses run command with leading zeros', () => {
      const result = parseCommand('legba run sprint-03 on myproject');
      expect(result).toEqual({
        type: 'run',
        project: 'myproject',
        sprint: 3,
        branch: undefined,
      });
    });

    it('parses run command with branch', () => {
      const result = parseCommand('legba run sprint-2 on myproject branch feature/auth');
      expect(result).toEqual({
        type: 'run',
        project: 'myproject',
        sprint: 2,
        branch: 'feature/auth',
      });
    });

    it('is case insensitive', () => {
      const result = parseCommand('LEGBA RUN SPRINT-1 ON MyProject');
      expect(result).toEqual({
        type: 'run',
        project: 'MyProject',
        sprint: 1,
        branch: undefined,
      });
    });

    it('handles extra whitespace', () => {
      const result = parseCommand('  legba   run   sprint-1   on   project  ');
      expect(result).toEqual({
        type: 'run',
        project: 'project',
        sprint: 1,
        branch: undefined,
      });
    });
  });

  describe('status command', () => {
    it('parses status without session id', () => {
      const result = parseCommand('legba status');
      expect(result).toEqual({
        type: 'status',
        sessionId: undefined,
      });
    });

    it('parses status with session id', () => {
      const result = parseCommand('legba status abc123');
      expect(result).toEqual({
        type: 'status',
        sessionId: 'abc123',
      });
    });
  });

  describe('resume command', () => {
    it('parses resume command', () => {
      const result = parseCommand('legba resume abc123');
      expect(result).toEqual({
        type: 'resume',
        sessionId: 'abc123',
      });
    });
  });

  describe('abort command', () => {
    it('parses abort command', () => {
      const result = parseCommand('legba abort abc123');
      expect(result).toEqual({
        type: 'abort',
        sessionId: 'abc123',
      });
    });
  });

  describe('projects command', () => {
    it('parses projects command', () => {
      const result = parseCommand('legba projects');
      expect(result).toEqual({ type: 'projects' });
    });
  });

  describe('history command', () => {
    it('parses history command', () => {
      const result = parseCommand('legba history myproject');
      expect(result).toEqual({
        type: 'history',
        project: 'myproject',
      });
    });
  });

  describe('logs command', () => {
    it('parses logs command', () => {
      const result = parseCommand('legba logs abc123');
      expect(result).toEqual({
        type: 'logs',
        sessionId: 'abc123',
      });
    });
  });

  describe('help command', () => {
    it('parses explicit help command', () => {
      const result = parseCommand('legba help');
      expect(result).toEqual({ type: 'help' });
    });

    it('parses bare legba as help', () => {
      const result = parseCommand('legba');
      expect(result).toEqual({ type: 'help' });
    });
  });

  describe('unrecognized input', () => {
    it('returns null for unrecognized command', () => {
      expect(parseCommand('hello world')).toBeNull();
    });

    it('returns null for partial command', () => {
      expect(parseCommand('legba run')).toBeNull();
    });

    it('returns null for invalid syntax', () => {
      expect(parseCommand('legba run sprint on project')).toBeNull();
    });
  });
});

describe('isLegbaMessage', () => {
  it('returns true for legba prefix', () => {
    expect(isLegbaMessage('legba run sprint-1 on test')).toBe(true);
  });

  it('returns true for /legba prefix', () => {
    expect(isLegbaMessage('/legba help')).toBe(true);
  });

  it('returns true with leading whitespace', () => {
    expect(isLegbaMessage('  legba help')).toBe(true);
  });

  it('returns false for non-legba messages', () => {
    expect(isLegbaMessage('hello world')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isLegbaMessage('LEGBA help')).toBe(true);
  });
});

describe('formatCommand', () => {
  it('formats run command', () => {
    expect(formatCommand({ type: 'run', project: 'test', sprint: 3 }))
      .toBe('legba run sprint-3 on test');
  });

  it('formats run command with branch', () => {
    expect(formatCommand({ type: 'run', project: 'test', sprint: 2, branch: 'dev' }))
      .toBe('legba run sprint-2 on test branch dev');
  });

  it('formats status command', () => {
    expect(formatCommand({ type: 'status' })).toBe('legba status');
  });

  it('formats status command with id', () => {
    expect(formatCommand({ type: 'status', sessionId: 'abc' }))
      .toBe('legba status abc');
  });

  it('formats resume command', () => {
    expect(formatCommand({ type: 'resume', sessionId: 'abc' }))
      .toBe('legba resume abc');
  });

  it('formats abort command', () => {
    expect(formatCommand({ type: 'abort', sessionId: 'abc' }))
      .toBe('legba abort abc');
  });

  it('formats projects command', () => {
    expect(formatCommand({ type: 'projects' })).toBe('legba projects');
  });

  it('formats history command', () => {
    expect(formatCommand({ type: 'history', project: 'test' }))
      .toBe('legba history test');
  });

  it('formats logs command', () => {
    expect(formatCommand({ type: 'logs', sessionId: 'abc' }))
      .toBe('legba logs abc');
  });

  it('formats help command', () => {
    expect(formatCommand({ type: 'help' })).toBe('legba help');
  });
});
