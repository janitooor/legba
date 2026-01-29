---
name: legba
description: Autonomous Loa sprint execution via Moltbot
version: 1.0.0
triggers:
  - "^legba\\s+"
  - "^/legba\\s*"
platforms:
  - telegram
  - discord
requires:
  - sandbox
  - r2
---

# Legba

Autonomous Loa sprint execution platform. Named after the Haitian Vodou Loa of roads and communication - *"the master of pathways who opens gateways between realms"*.

## Commands

| Command | Description |
|---------|-------------|
| `legba run sprint-N on {project}` | Execute sprint N on project |
| `legba run sprint-N on {project} branch {branch}` | Execute sprint on specific branch |
| `legba status` | Show current session status |
| `legba status {session-id}` | Show specific session status |
| `legba resume {session-id}` | Resume paused session |
| `legba abort {session-id}` | Abort session |
| `legba projects` | List registered projects |
| `legba history {project}` | Show session history |
| `legba logs {session-id}` | Retrieve session logs |
| `legba help` | Show this help |

## Examples

```
legba run sprint-3 on myproject
legba run sprint-2 on myproject branch feature/auth
legba status
legba resume abc123
legba projects
```

## Configuration

Projects are registered in `registry.json` in the R2 bucket. Each project specifies:

- `id`: Unique identifier (slug)
- `name`: Human-readable name
- `repoUrl`: Git repository URL
- `defaultBranch`: Default branch (main/master)
- `githubInstallationId`: GitHub App installation ID
- `enabled`: Whether project accepts triggers

## Session States

| State | Description |
|-------|-------------|
| QUEUED | Waiting for sandbox availability |
| STARTING | Sandbox container booting |
| CLONING | Repository checkout in progress |
| RUNNING | Claude Code + Loa executing |
| PAUSED | Circuit breaker tripped, awaiting user |
| COMPLETING | Creating PR, persisting state |
| COMPLETED | Session finished successfully |
| FAILED | Unrecoverable error |
| ABORTED | User cancelled |

## Error Codes

| Code | Description | User Action |
|------|-------------|-------------|
| E001 | Project not found | Check `legba projects` |
| E002 | Project disabled | Contact admin |
| E003 | Session already active | Wait or `legba abort` |
| E004 | Queue full | Try again later |
| E005 | GitHub App not installed | Install app on repo |
| E006 | Clone failed | Check repo access |
| E007 | Circuit breaker tripped | `legba resume` or `legba abort` |
| E008 | Session timeout | Review logs, retry |

## Architecture

Legba is implemented as a Moltbot skill that:

1. Receives commands via Telegram/Discord
2. Validates device pairing
3. Spawns Cloudflare Sandbox containers
4. Executes Claude Code with Loa `/run` commands
5. Persists state to R2
6. Creates draft PRs on GitHub
7. Notifies users of completion/failure

## Requirements

- Cloudflare Workers Paid plan
- Cloudflare R2 bucket
- GitHub App installed on target repos
- Anthropic API key
