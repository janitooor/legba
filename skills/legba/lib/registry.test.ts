/**
 * Registry Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Registry } from './registry.js';
import { LegbaError } from './errors.js';
import type { Storage } from './storage.js';
import type { Project, ProjectRegistry } from '../types/index.js';

/**
 * Create mock storage for testing
 */
function createMockStorage(): Storage {
  const projects: Project[] = [
    {
      id: 'test-project',
      name: 'Test Project',
      repoUrl: 'https://github.com/test/test-project',
      defaultBranch: 'main',
      githubInstallationId: 12345,
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'disabled-project',
      name: 'Disabled Project',
      repoUrl: 'https://github.com/test/disabled-project',
      defaultBranch: 'main',
      githubInstallationId: 12346,
      enabled: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  return {
    async getRegistry(): Promise<ProjectRegistry> {
      return {
        version: '1.0.0',
        projects: [...projects],
      };
    },
    async saveRegistry(registry: ProjectRegistry) {
      projects.length = 0;
      projects.push(...registry.projects);
    },
    async getProject(id: string) {
      return projects.find((p) => p.id === id) ?? null;
    },
    async upsertProject(project: Project) {
      const index = projects.findIndex((p) => p.id === project.id);
      if (index >= 0) {
        projects[index] = project;
      } else {
        projects.push(project);
      }
    },
    async removeProject(id: string) {
      const index = projects.findIndex((p) => p.id === id);
      if (index < 0) return false;
      projects.splice(index, 1);
      return true;
    },
    // Stubs for other methods
    async saveSession() {},
    async getSession() { return null; },
    async listSessions() { return []; },
    async appendLog() {},
    async getLogs() { return ''; },
    async getLog() { return ''; },
    async enqueue() { return 1; },
    async dequeue() { return null; },
    async getQueuePosition() { return 0; },
    async getQueue() { return { pending: [], maxDepth: 10 }; },
    async saveQueue() {},
    async saveProjectState() {},
    async getProjectState() { return new Map(); },
    async hasProjectState() { return false; },
    async deleteSession() {},
  } as Storage;
}

describe('Registry', () => {
  let storage: Storage;
  let registry: Registry;

  beforeEach(() => {
    storage = createMockStorage();
    registry = new Registry(storage);
  });

  describe('getProjects', () => {
    it('should return all projects', async () => {
      const projects = await registry.getProjects();
      expect(projects).toHaveLength(2);
      expect(projects[0].id).toBe('test-project');
      expect(projects[1].id).toBe('disabled-project');
    });
  });

  describe('getEnabledProjects', () => {
    it('should return only enabled projects', async () => {
      const projects = await registry.getEnabledProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('test-project');
    });
  });

  describe('getProject', () => {
    it('should return project by ID', async () => {
      const project = await registry.getProject('test-project');
      expect(project).not.toBeNull();
      expect(project?.name).toBe('Test Project');
    });

    it('should return null for non-existent project', async () => {
      const project = await registry.getProject('non-existent');
      expect(project).toBeNull();
    });
  });

  describe('requireProject', () => {
    it('should return project when found', async () => {
      const project = await registry.requireProject('test-project');
      expect(project.name).toBe('Test Project');
    });

    it('should throw E001 when not found', async () => {
      await expect(registry.requireProject('non-existent')).rejects.toThrow(
        LegbaError
      );
      await expect(registry.requireProject('non-existent')).rejects.toMatchObject({
        code: 'E001',
      });
    });
  });

  describe('addProject', () => {
    it('should add a new project', async () => {
      const project = await registry.addProject({
        id: 'new-project',
        name: 'New Project',
        repoUrl: 'https://github.com/test/new-project',
        defaultBranch: 'main',
        githubInstallationId: 99999,
      });

      expect(project.id).toBe('new-project');
      expect(project.enabled).toBe(true);

      const fetched = await registry.getProject('new-project');
      expect(fetched).not.toBeNull();
    });

    it('should throw when project already exists', async () => {
      await expect(
        registry.addProject({
          id: 'test-project', // Already exists
          name: 'Duplicate',
          repoUrl: 'https://github.com/test/duplicate',
          defaultBranch: 'main',
          githubInstallationId: 99999,
        })
      ).rejects.toThrow(LegbaError);
    });
  });

  describe('updateProject', () => {
    it('should update project fields', async () => {
      const updated = await registry.updateProject('test-project', {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.id).toBe('test-project'); // ID unchanged
    });

    it('should throw for non-existent project', async () => {
      await expect(
        registry.updateProject('non-existent', { name: 'Test' })
      ).rejects.toThrow(LegbaError);
    });
  });

  describe('enableProject / disableProject', () => {
    it('should enable a disabled project', async () => {
      const project = await registry.enableProject('disabled-project');
      expect(project.enabled).toBe(true);
    });

    it('should disable an enabled project', async () => {
      const project = await registry.disableProject('test-project');
      expect(project.enabled).toBe(false);
    });
  });

  describe('removeProject', () => {
    it('should remove existing project', async () => {
      const result = await registry.removeProject('test-project');
      expect(result).toBe(true);

      const project = await registry.getProject('test-project');
      expect(project).toBeNull();
    });

    it('should return false for non-existent project', async () => {
      const result = await registry.removeProject('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('validateForExecution', () => {
    it('should return project when valid', async () => {
      const project = await registry.validateForExecution('test-project');
      expect(project.id).toBe('test-project');
    });

    it('should throw E001 for non-existent project', async () => {
      await expect(
        registry.validateForExecution('non-existent')
      ).rejects.toMatchObject({ code: 'E001' });
    });

    it('should throw E002 for disabled project', async () => {
      await expect(
        registry.validateForExecution('disabled-project')
      ).rejects.toMatchObject({ code: 'E002' });
    });
  });

  describe('findByRepoUrl', () => {
    it('should find project by repo URL', async () => {
      const project = await registry.findByRepoUrl(
        'https://github.com/test/test-project'
      );
      expect(project).not.toBeNull();
      expect(project?.id).toBe('test-project');
    });

    it('should return null for unknown URL', async () => {
      const project = await registry.findByRepoUrl(
        'https://github.com/test/unknown'
      );
      expect(project).toBeNull();
    });
  });

  describe('search', () => {
    it('should find projects by ID', async () => {
      const results = await registry.search('test');
      expect(results).toHaveLength(2); // both contain 'test'
    });

    it('should find projects by name', async () => {
      const results = await registry.search('disabled');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('disabled-project');
    });

    it('should be case-insensitive', async () => {
      const results = await registry.search('TEST');
      expect(results).toHaveLength(2);
    });

    it('should return empty for no matches', async () => {
      const results = await registry.search('xyz123');
      expect(results).toHaveLength(0);
    });
  });
});
