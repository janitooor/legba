# Legba Deployment Guide

This guide covers deploying Legba as a Moltbot skill on Cloudflare Workers.

## Prerequisites

- [Cloudflare Workers](https://workers.cloudflare.com/) account
- [Moltbot](https://moltbot.ai) instance
- [GitHub App](https://docs.github.com/en/apps) for PR creation
- [Anthropic API](https://www.anthropic.com/api) key

## 1. R2 Bucket Setup

Create an R2 bucket for Legba state:

```bash
wrangler r2 bucket create legba-state
```

## 2. GitHub App Setup

Create a GitHub App for Legba:

1. Go to **Settings → Developer settings → GitHub Apps → New GitHub App**

2. Configure the app:
   - **Name**: `Legba Sprint Executor`
   - **Homepage URL**: Your organization's URL
   - **Webhook**: Disable (not needed)

3. Set permissions:
   - **Repository permissions**:
     - Contents: Read & Write
     - Pull requests: Read & Write
     - Metadata: Read-only
   - **No organization or account permissions needed**

4. Generate and download the private key

5. Install the app on target repositories

6. Note the App ID and Installation IDs

## 3. Secrets Configuration

Set up required secrets:

```bash
# Anthropic API key for Claude Code execution
wrangler secret put ANTHROPIC_API_KEY
# Enter your key when prompted

# GitHub App ID
wrangler secret put GITHUB_APP_ID
# Enter app ID (numeric)

# GitHub App private key (base64 encoded)
cat private-key.pem | base64 | wrangler secret put GITHUB_APP_PRIVATE_KEY

# GitHub personal access token (for cloning)
wrangler secret put GITHUB_TOKEN
```

## 4. Wrangler Configuration

Add Legba to your `wrangler.toml`:

```toml
# Add to existing moltworker config

[[r2_buckets]]
binding = "LEGBA_R2"
bucket_name = "legba-state"

# Sandbox execution requires paid plan
[sandbox]
enabled = true
```

## 5. Skill Registration

Register Legba with Moltbot:

```yaml
# In your moltbot skills config
skills:
  - name: legba
    path: ./skills/legba
    triggers:
      - "^legba\\s+"
      - "^/legba\\s*"
```

## 6. Registry Initialization

Initialize the project registry:

```bash
cd skills/legba
npx tsx scripts/init-registry.ts > registry.json

# Upload to R2
wrangler r2 object put legba-state/registry.json --file=registry.json
```

## 7. Deploy

Deploy the worker:

```bash
wrangler deploy
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | Yes |
| `GITHUB_APP_ID` | GitHub App ID | Yes |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key (base64) | Yes |
| `GITHUB_TOKEN` | GitHub PAT for cloning | Yes |

## R2 Structure

Legba uses the following R2 structure:

```
legba-state/
├── registry.json           # Project registry
├── queue/
│   └── pending.json        # Session queue
├── sessions/
│   └── {session-id}/
│       ├── session.json    # Session record
│       └── logs/
│           ├── stdout.log
│           ├── stderr.log
│           └── claude-output.log
├── state/
│   └── {project}/          # Project state (NOTES.md, etc.)
└── worktrees/
    └── {project}/
        └── {branch}/       # Git worktrees
```

## Monitoring

### Logs

View worker logs:

```bash
wrangler tail
```

### Session Logs

Retrieve session logs via R2:

```bash
wrangler r2 object get legba-state/sessions/{session-id}/logs/claude-output.log
```

Or via chat:

```
legba logs {session-id}
```

## Troubleshooting

### Session stuck in STARTING

- Check Cloudflare Sandbox quotas
- Verify R2 bucket permissions
- Check worker logs for errors

### GitHub App errors

- Verify installation ID is correct
- Check app permissions include Contents and Pull Requests
- Ensure private key is properly base64 encoded

### Circuit breaker triggering

- Review session logs for repeated errors
- Check Loa configuration in target project
- May need manual intervention to resolve blockers

## Security Considerations

1. **Secrets**: Never commit secrets. Use `wrangler secret`.

2. **R2 Access**: R2 bucket should only be accessible by the worker.

3. **GitHub App**: Use minimal required permissions.

4. **Sandbox Isolation**: Each execution runs in an isolated sandbox.

5. **Draft PRs**: All changes go through draft PRs for review.

## Scaling

Legba is designed for single-session execution per project to avoid conflicts. For high-volume usage:

1. Increase queue depth in registry
2. Consider multiple worker deployments per project
3. Monitor R2 usage for large logs
