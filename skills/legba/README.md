# Legba - Autonomous Loa Sprint Execution

Legba is a [Moltbot](https://moltbot.ai) skill that enables chat-triggered autonomous sprint execution using the [Loa](https://github.com/0xHoneyJar/loa) framework on any project in your organization.

> **Named after Legba** - the Haitian Vodou Loa of crossroads and communication, as referenced in William Gibson's Sprawl trilogy. Legba opens the gateway between chat commands and autonomous code execution.

## Features

- **Chat-Triggered Sprints**: Execute Loa sprints from Telegram or Discord
- **Draft PR Delivery**: Changes delivered as draft PRs for review
- **Safety Guarantees**: Circuit breaker integration with human-in-the-loop pausing
- **Session Memory**: Project state (NOTES.md, grimoires/) persisted across sessions
- **Multi-Project**: Support any repository with a single installation

## Quick Start

### 1. Deploy Legba

Legba runs as a Moltbot skill on Cloudflare Workers:

```bash
cd skills/legba
pnpm install
pnpm build

# Add to your wrangler.toml
# See docs/deployment.md for full configuration
```

### 2. Configure Secrets

```bash
# Anthropic API key for Claude Code
wrangler secret put ANTHROPIC_API_KEY

# GitHub App credentials
wrangler secret put GITHUB_APP_ID
wrangler secret put GITHUB_APP_PRIVATE_KEY
wrangler secret put GITHUB_TOKEN
```

### 3. Register Projects

Initialize the registry with your first project:

```bash
npx tsx scripts/init-registry.ts
# Copy output to R2 bucket as registry.json
```

### 4. Start Using

In your chat (Telegram/Discord):

```
legba run sprint-1 on myproject
```

## Commands

| Command | Description |
|---------|-------------|
| `legba run sprint-N on {project}` | Execute sprint N |
| `legba run sprint-N on {project} branch {branch}` | Execute on specific branch |
| `legba status` | Show current session status |
| `legba status {session-id}` | Show specific session |
| `legba resume {session-id}` | Resume paused session |
| `legba abort {session-id}` | Cancel session |
| `legba projects` | List registered projects |
| `legba history {project}` | View session history |
| `legba logs {session-id}` | Retrieve session logs |
| `legba help` | Show help |

## Architecture

```
┌────────────────┐     ┌─────────────────┐     ┌───────────────┐
│  Chat Gateway  │────▶│  Legba Skill    │────▶│  Cloudflare   │
│  (Telegram/    │     │  (Command       │     │  Sandbox      │
│   Discord)     │     │   Router)       │     │  (Claude Code)│
└────────────────┘     └─────────────────┘     └───────────────┘
                              │                       │
                              ▼                       ▼
                       ┌─────────────────┐     ┌───────────────┐
                       │  R2 Storage     │     │  GitHub API   │
                       │  (State, Logs)  │     │  (Draft PRs)  │
                       └─────────────────┘     └───────────────┘
```

### Session States

```
QUEUED → STARTING → CLONING → RUNNING → COMPLETING → COMPLETED
                       │          │
                       │          ├──▶ PAUSED ──▶ (resume)
                       │          │
                       └──────────┴──▶ FAILED
                                  └──▶ ABORTED
```

## Configuration

### Project Registry

Projects are registered in `registry.json`:

```json
{
  "version": "1.0.0",
  "projects": [
    {
      "id": "myproject",
      "name": "My Project",
      "repoUrl": "https://github.com/org/myproject",
      "defaultBranch": "main",
      "githubInstallationId": 12345678,
      "enabled": true
    }
  ]
}
```

### Per-Project Config

Projects can customize Loa behavior via `.loa.config.yaml`:

```yaml
run_mode:
  enabled: true
  max_cycles: 20
  timeout_hours: 8

circuit_breaker:
  same_issue_limit: 3
  no_progress_limit: 5
```

## Safety Model

Legba implements a 4-layer safety model:

1. **ICE Layer**: All git operations wrapped with safety checks
2. **Circuit Breaker**: Auto-pause on repeated failures
3. **Opt-In**: Requires explicit enablement per project
4. **Visibility**: All changes delivered as draft PRs

### Circuit Breaker Triggers

| Trigger | Threshold |
|---------|-----------|
| Same issue | 3 occurrences |
| No progress | 5 cycles |
| Max cycles | 20 total |
| Timeout | 8 hours |

When triggered, sessions pause and notify the user for intervention.

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Type check
pnpm typecheck

# Build
pnpm build
```

## License

MIT

## Related

- [Loa Framework](https://github.com/0xHoneyJar/loa) - Agent-driven development
- [Moltbot](https://moltbot.ai) - AI assistant platform
- [Cloudflare Sandbox SDK](https://developers.cloudflare.com/sandbox-sdk/) - Isolated execution
