/**
 * Legba Registry Management
 *
 * Provides registry CRUD operations on top of storage layer.
 */

import type { Storage } from './storage.js';
import type { Project, ProjectRegistry } from '../types/index.js';
import { createProject, createEmptyRegistry } from '../types/index.js';
import { LegbaError } from './errors.js';

/**
 * Registry Manager
 *
 * Provides high-level registry operations with validation.
 */
export class Registry {
  constructor(private storage: Storage) {}

  /**
   * Get all projects
   */
  async getProjects(): Promise<Project[]> {
    const registry = await this.storage.getRegistry();
    return registry.projects;
  }

  /**
   * Get enabled projects only
   */
  async getEnabledProjects(): Promise<Project[]> {
    const registry = await this.storage.getRegistry();
    return registry.projects.filter((p) => p.enabled);
  }

  /**
   * Get a single project by ID
   */
  async getProject(id: string): Promise<Project | null> {
    return this.storage.getProject(id);
  }

  /**
   * Get a project or throw if not found
   */
  async requireProject(id: string): Promise<Project> {
    const project = await this.getProject(id);
    if (!project) {
      throw new LegbaError('E001');
    }
    return project;
  }

  /**
   * Add a new project
   */
  async addProject(params: {
    id: string;
    name: string;
    repoUrl: string;
    defaultBranch: string;
    githubInstallationId: number;
    loaConfigPath?: string;
    enabled?: boolean;
  }): Promise<Project> {
    // Check if project already exists
    const existing = await this.getProject(params.id);
    if (existing) {
      throw new LegbaError('E003', `Project "${params.id}" already exists`);
    }

    // Validate GitHub installation
    // TODO: Verify installation ID is valid via GitHub API

    const project = createProject(
      params.id,
      params.name,
      params.repoUrl,
      params.defaultBranch,
      params.githubInstallationId,
      {
        loaConfigPath: params.loaConfigPath,
        enabled: params.enabled,
      }
    );

    await this.storage.upsertProject(project);
    return project;
  }

  /**
   * Update an existing project
   */
  async updateProject(
    id: string,
    updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Project> {
    const existing = await this.requireProject(id);

    const updated: Project = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.storage.upsertProject(updated);
    return updated;
  }

  /**
   * Enable a project
   */
  async enableProject(id: string): Promise<Project> {
    return this.updateProject(id, { enabled: true });
  }

  /**
   * Disable a project
   */
  async disableProject(id: string): Promise<Project> {
    return this.updateProject(id, { enabled: false });
  }

  /**
   * Remove a project
   */
  async removeProject(id: string): Promise<boolean> {
    const existing = await this.getProject(id);
    if (!existing) {
      return false;
    }

    return this.storage.removeProject(id);
  }

  /**
   * Validate project for execution
   *
   * Checks:
   * - Project exists
   * - Project is enabled
   * - GitHub App is installed
   */
  async validateForExecution(id: string): Promise<Project> {
    const project = await this.getProject(id);

    if (!project) {
      throw new LegbaError('E001');
    }

    if (!project.enabled) {
      throw new LegbaError('E002');
    }

    if (!project.githubInstallationId) {
      throw new LegbaError('E005');
    }

    // TODO: Validate GitHub installation is still valid
    // await this.validateGitHubInstallation(project.githubInstallationId);

    return project;
  }

  /**
   * Find project by repository URL
   */
  async findByRepoUrl(repoUrl: string): Promise<Project | null> {
    const projects = await this.getProjects();
    return projects.find((p) => p.repoUrl === repoUrl) ?? null;
  }

  /**
   * Search projects by name or ID
   */
  async search(query: string): Promise<Project[]> {
    const projects = await this.getProjects();
    const lower = query.toLowerCase();

    return projects.filter(
      (p) =>
        p.id.toLowerCase().includes(lower) ||
        p.name.toLowerCase().includes(lower)
    );
  }
}

/**
 * Create a registry manager
 */
export function createRegistry(storage: Storage): Registry {
  return new Registry(storage);
}
