#!/usr/bin/env npx tsx
/**
 * Initialize Legba Registry
 *
 * Creates the initial project registry with a bootstrap project.
 *
 * Usage:
 *   npx tsx scripts/init-registry.ts
 *
 * This script is designed to be run once to set up the registry.
 * Projects can then be managed via the admin commands or API.
 */

import { createEmptyRegistry, createProject, type ProjectRegistry, type Project } from '../types/index.js';

/**
 * Bootstrap project configuration
 *
 * Modify this for your initial test project.
 */
const BOOTSTRAP_PROJECT: Project = createProject(
  'legba-test',
  'Legba Test Project',
  'https://github.com/0xHoneyJar/legba-test',
  'main',
  0, // GitHub App installation ID - update after installation
  {
    loaConfigPath: '.loa.config.yaml',
    enabled: true,
  }
);

/**
 * Generate initial registry JSON
 */
function generateRegistry(): ProjectRegistry {
  const registry = createEmptyRegistry();
  registry.projects.push(BOOTSTRAP_PROJECT);
  return registry;
}

/**
 * Main entry point
 */
function main(): void {
  const registry = generateRegistry();

  console.log('Legba Registry Initialization');
  console.log('=============================');
  console.log('');
  console.log('Generated registry.json:');
  console.log('');
  console.log(JSON.stringify(registry, null, 2));
  console.log('');
  console.log('To use this registry:');
  console.log('');
  console.log('1. Copy the JSON above to your R2 bucket as registry.json');
  console.log('2. Update the githubInstallationId after installing the GitHub App');
  console.log('3. Modify project settings as needed');
  console.log('');
  console.log('Adding new projects:');
  console.log('');
  console.log('Projects can be added by:');
  console.log('- Editing registry.json directly in R2');
  console.log('- Using the admin API (coming soon)');
  console.log('- Using the admin skill command (coming soon)');
  console.log('');
  console.log('Project Schema:');
  console.log('');
  console.log('  {');
  console.log('    "id": "project-slug",');
  console.log('    "name": "Human Readable Name",');
  console.log('    "repoUrl": "https://github.com/org/repo",');
  console.log('    "defaultBranch": "main",');
  console.log('    "githubInstallationId": 12345678,');
  console.log('    "loaConfigPath": ".loa.config.yaml",');
  console.log('    "enabled": true,');
  console.log('    "createdAt": "2026-01-30T00:00:00.000Z",');
  console.log('    "updatedAt": "2026-01-30T00:00:00.000Z"');
  console.log('  }');
}

main();
