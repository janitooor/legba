# Changelog

All notable changes to Legba will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-30

### Added

- **Core Skill Infrastructure**
  - Moltbot skill interface implementation
  - Command parser supporting 10 command patterns
  - Session state machine with 9 states

- **Sandbox Execution**
  - Cloudflare Sandbox SDK integration
  - Headless Claude Code execution
  - R2-mounted persistent worktrees

- **Session Management**
  - Full session lifecycle orchestration
  - Queue management for concurrent requests
  - Circuit breaker detection and auto-pause

- **GitHub Integration**
  - GitHub App authentication
  - Draft PR creation from session diffs
  - PR comments with session summaries

- **Notifications**
  - Chat notifications for all state transitions
  - Support for Telegram and Discord via Moltbot
  - Formatted messages with session details

- **Project Registry**
  - Multi-project support via R2 registry
  - Project enable/disable controls
  - Registry CRUD operations

- **Error Handling**
  - Comprehensive error codes (E001-E012)
  - User-friendly error messages with hints
  - Retry logic for transient failures

- **Documentation**
  - README with quick start guide
  - Deployment guide
  - Troubleshooting guide

### Commands

| Command | Description |
|---------|-------------|
| `legba run sprint-N on {project}` | Execute a sprint |
| `legba run sprint-N on {project} branch {branch}` | Execute on branch |
| `legba status` | Show current session |
| `legba status {id}` | Show specific session |
| `legba resume {id}` | Resume paused session |
| `legba abort {id}` | Cancel session |
| `legba projects` | List projects |
| `legba history {project}` | View history |
| `legba logs {id}` | Get session logs |
| `legba help` | Show help |

### Safety Features

- 4-layer safety model (ICE, Circuit Breaker, Opt-In, Visibility)
- All changes delivered as draft PRs
- Human-in-the-loop for circuit breaker events
- Session timeout after 8 hours

### Dependencies

- `@cloudflare/sandbox-sdk` ^1.0.0
- `@octokit/app` ^14.0.0
- `@octokit/rest` ^20.0.0
- `hono` ^4.0.0
- `uuid` ^9.0.0

---

## [Unreleased]

### Planned

- Admin commands for registry management
- Scheduled sprint execution (cron triggers)
- Multi-session support with isolation
- Log rotation and archival
- Metrics and observability dashboard
