/**
 * Legba Registry Types
 *
 * Represents the project registry stored in R2.
 */

/**
 * A registered project that Legba can operate on
 */
export interface Project {
  /** Unique identifier (slug) */
  id: string;

  /** Human-readable name */
  name: string;

  /** Git repository URL */
  repoUrl: string;

  /** Default branch (main/master) */
  defaultBranch: string;

  /** GitHub App installation ID */
  githubInstallationId: number;

  /** Path to .loa.config.yaml (default: root) */
  loaConfigPath?: string;

  /** Whether project accepts triggers */
  enabled: boolean;

  /** ISO timestamp when project was created */
  createdAt: string;

  /** ISO timestamp when project was last updated */
  updatedAt: string;
}

/**
 * Create a new project record
 */
export function createProject(
  id: string,
  name: string,
  repoUrl: string,
  defaultBranch: string,
  githubInstallationId: number,
  options?: {
    loaConfigPath?: string;
    enabled?: boolean;
  }
): Project {
  const now = new Date().toISOString();
  return {
    id,
    name,
    repoUrl,
    defaultBranch,
    githubInstallationId,
    loaConfigPath: options?.loaConfigPath,
    enabled: options?.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * The project registry stored in R2
 */
export interface ProjectRegistry {
  /** Schema version */
  version: '1.0.0';

  /** List of registered projects */
  projects: Project[];
}

/**
 * Create an empty registry
 */
export function createEmptyRegistry(): ProjectRegistry {
  return {
    version: '1.0.0',
    projects: [],
  };
}

/**
 * Find a project by ID
 */
export function findProject(
  registry: ProjectRegistry,
  id: string
): Project | undefined {
  return registry.projects.find((p) => p.id === id);
}

/**
 * Find a project by repository URL
 */
export function findProjectByRepo(
  registry: ProjectRegistry,
  repoUrl: string
): Project | undefined {
  return registry.projects.find((p) => p.repoUrl === repoUrl);
}

/**
 * Get all enabled projects
 */
export function getEnabledProjects(registry: ProjectRegistry): Project[] {
  return registry.projects.filter((p) => p.enabled);
}

/**
 * Queued session request
 */
export interface QueuedRequest {
  /** Request ID */
  id: string;

  /** Project ID */
  project: string;

  /** Sprint number */
  sprint: number;

  /** Branch name */
  branch: string;

  /** Chat context for notifications */
  chatContext: {
    platform: 'telegram' | 'discord';
    channelId: string;
    messageId: string;
    userId: string;
  };

  /** User who triggered */
  triggeredBy: string;

  /** ISO timestamp when queued */
  queuedAt: string;
}

/**
 * Session queue stored in R2
 */
export interface SessionQueue {
  /** Pending requests in FIFO order */
  pending: QueuedRequest[];

  /** Maximum queue depth */
  maxDepth: number;
}

/**
 * Create an empty queue
 */
export function createEmptyQueue(maxDepth: number = 10): SessionQueue {
  return {
    pending: [],
    maxDepth,
  };
}
