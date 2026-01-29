/**
 * Legba GitHub Client
 *
 * Handles GitHub App authentication and PR creation.
 */

import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
import type { Project } from '../types/index.js';

/**
 * GitHub App configuration
 */
export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
}

/**
 * Parameters for creating a draft PR
 */
export interface PRParams {
  project: Project;
  sessionId: string;
  sprint: number;
  branch: string;
  diff: string;
  summary: string;
  triggeredBy: string;
  duration: number;
}

/**
 * Result of PR creation
 */
export interface PRResult {
  url: string;
  number: number;
}

/**
 * GitHub Client
 *
 * Uses GitHub App authentication for fine-grained permissions.
 */
export class GitHubClient {
  private app: App;

  constructor(config: GitHubAppConfig) {
    this.app = new App({
      appId: config.appId,
      privateKey: config.privateKey,
    });
  }

  /**
   * Get an authenticated Octokit instance for an installation
   */
  private async getOctokit(installationId: number): Promise<Octokit> {
    return (await this.app.getInstallationOctokit(installationId)) as unknown as Octokit;
  }

  /**
   * Create a draft PR with session changes
   */
  async createDraftPR(params: PRParams): Promise<PRResult> {
    const octokit = await this.getOctokit(params.project.githubInstallationId);
    const { owner, repo } = this.parseRepoUrl(params.project.repoUrl);

    // 1. Get the default branch ref
    const { data: defaultBranch } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch: params.project.defaultBranch,
    });

    // 2. Create a new branch for the PR
    const branchName = `legba/sprint-${params.sprint}-${params.sessionId.slice(0, 8)}`;

    try {
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: defaultBranch.commit.sha,
      });
    } catch (error: any) {
      // Branch might already exist from a previous attempt
      if (error.status !== 422) {
        throw error;
      }
    }

    // 3. Apply the diff to the branch
    await this.applyDiffToBranch(octokit, owner, repo, branchName, params.diff);

    // 4. Create the draft PR
    const { data: pr } = await octokit.rest.pulls.create({
      owner,
      repo,
      title: `[Legba] Sprint ${params.sprint} - ${params.project.name}`,
      body: this.buildPRBody(params),
      head: branchName,
      base: params.project.defaultBranch,
      draft: true,
    });

    // 5. Add session summary as comment
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pr.number,
      body: this.buildSessionSummary(params),
    });

    return {
      url: pr.html_url,
      number: pr.number,
    };
  }

  /**
   * Apply a diff to a branch by creating/updating files
   */
  private async applyDiffToBranch(
    octokit: Octokit,
    owner: string,
    repo: string,
    branch: string,
    diff: string
  ): Promise<void> {
    // Parse the diff to extract file changes
    const changes = this.parseDiff(diff);

    for (const change of changes) {
      try {
        if (change.type === 'delete') {
          // Delete file
          const { data: existing } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: change.path,
            ref: branch,
          });

          if ('sha' in existing) {
            await octokit.rest.repos.deleteFile({
              owner,
              repo,
              path: change.path,
              message: `Delete ${change.path} (Legba)`,
              sha: existing.sha,
              branch,
            });
          }
        } else {
          // Create or update file
          let sha: string | undefined;

          try {
            const { data: existing } = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: change.path,
              ref: branch,
            });

            if ('sha' in existing) {
              sha = existing.sha;
            }
          } catch {
            // File doesn't exist, will create
          }

          await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: change.path,
            message: `${change.type === 'add' ? 'Add' : 'Update'} ${change.path} (Legba)`,
            content: Buffer.from(change.content).toString('base64'),
            sha,
            branch,
          });
        }
      } catch (error) {
        console.error(`Failed to apply change to ${change.path}:`, error);
        // Continue with other files
      }
    }
  }

  /**
   * Parse a unified diff into file changes
   */
  private parseDiff(diff: string): Array<{
    path: string;
    type: 'add' | 'modify' | 'delete';
    content: string;
  }> {
    const changes: Array<{
      path: string;
      type: 'add' | 'modify' | 'delete';
      content: string;
    }> = [];

    // Simple diff parsing - extract file paths and content
    const fileDiffs = diff.split(/^diff --git/m).filter(Boolean);

    for (const fileDiff of fileDiffs) {
      // Extract file path
      const pathMatch = fileDiff.match(/a\/(.+?) b\//);
      if (!pathMatch) continue;

      const path = pathMatch[1];

      // Determine change type
      let type: 'add' | 'modify' | 'delete' = 'modify';
      if (fileDiff.includes('new file mode')) {
        type = 'add';
      } else if (fileDiff.includes('deleted file mode')) {
        type = 'delete';
      }

      // Extract content for add/modify (reconstruct from + lines)
      if (type !== 'delete') {
        const lines = fileDiff.split('\n');
        const contentLines: string[] = [];
        let inContent = false;

        for (const line of lines) {
          if (line.startsWith('@@')) {
            inContent = true;
            continue;
          }
          if (inContent) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
              contentLines.push(line.slice(1));
            } else if (line.startsWith(' ')) {
              contentLines.push(line.slice(1));
            }
          }
        }

        changes.push({
          path,
          type,
          content: contentLines.join('\n'),
        });
      } else {
        changes.push({
          path,
          type,
          content: '',
        });
      }
    }

    return changes;
  }

  /**
   * Parse owner and repo from a repository URL
   */
  private parseRepoUrl(url: string): { owner: string; repo: string } {
    // Handle various URL formats:
    // https://github.com/owner/repo
    // https://github.com/owner/repo.git
    // git@github.com:owner/repo.git

    const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }

    const sshMatch = url.match(/github\.com:([^/]+)\/([^/.]+)/);
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    throw new Error(`Unable to parse repository URL: ${url}`);
  }

  /**
   * Build the PR body
   */
  private buildPRBody(params: PRParams): string {
    const durationMinutes = Math.round(params.duration / 60000);

    return `## Legba Autonomous Sprint Execution

**Session ID**: \`${params.sessionId}\`
**Project**: ${params.project.name}
**Sprint**: ${params.sprint}
**Triggered by**: ${params.triggeredBy}
**Duration**: ${durationMinutes} minutes

### Summary

${params.summary}

---
*This PR was created automatically by [Legba](https://github.com/0xHoneyJar/loa) autonomous sprint execution.*
*Please review the changes carefully before merging.*
`;
  }

  /**
   * Build session summary for PR comment
   */
  private buildSessionSummary(params: PRParams): string {
    return `## Session Details

| Property | Value |
|----------|-------|
| Session ID | \`${params.sessionId}\` |
| Sprint | ${params.sprint} |
| Branch | \`${params.branch}\` |
| Triggered by | ${params.triggeredBy} |
| Duration | ${Math.round(params.duration / 60000)} minutes |

### Execution Log

<details>
<summary>Click to expand</summary>

The full execution log is available via:
\`\`\`
legba logs ${params.sessionId}
\`\`\`

</details>

---
:robot: Generated by Legba
`;
  }
}

/**
 * Create a GitHub client
 */
export function createGitHubClient(config: GitHubAppConfig): GitHubClient {
  return new GitHubClient(config);
}
