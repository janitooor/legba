# Legba Troubleshooting Guide

Common issues and solutions for Legba.

## Error Codes

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| E001 | Project not found | Project ID doesn't exist in registry | Check project name with `legba projects` |
| E002 | Project disabled | Project has `enabled: false` | Enable project in registry |
| E003 | Session already active | Another session is running | Wait or abort current session |
| E004 | Queue full | Queue reached max depth | Wait for current sessions to complete |
| E005 | GitHub App not installed | Missing installation ID | Install GitHub App on repository |
| E006 | Clone failed | Git clone error | Check repo access and URL |
| E007 | Circuit breaker tripped | Repeated failures detected | Review logs, fix issue, then resume |
| E008 | Session timeout | Exceeded 8 hour limit | Session was taking too long |
| E009 | Session not found | Invalid session ID | Check session ID is correct |
| E010 | Invalid session state | Operation not allowed in state | Check current state with `legba status` |
| E011 | Storage error | R2 operation failed | Retry or check R2 bucket |
| E012 | GitHub API error | GitHub API failure | Check rate limits, retry |

## Common Issues

### "Project not found" when running sprint

**Cause**: The project hasn't been registered in the registry.

**Solution**:
1. Check registered projects: `legba projects`
2. Add project to registry.json in R2
3. Ensure project ID matches exactly (case-sensitive)

### Session stuck in CLONING state

**Cause**: Git clone is failing or taking too long.

**Possible causes**:
- Repository URL incorrect
- GitHub token lacks access
- Network issues in sandbox
- Large repository

**Solution**:
1. Check session logs: `legba logs {session-id}`
2. Verify repository URL in registry
3. Check GitHub token permissions
4. For large repos, ensure shallow clone is configured

### Circuit breaker keeps triggering

**Cause**: The sprint is hitting the same error repeatedly.

**Common triggers**:
- Same type error appearing 3+ times
- No progress after 5 cycles
- Loa finding the same issue repeatedly

**Solution**:
1. Get logs: `legba logs {session-id}`
2. Identify the repeated error
3. Fix the issue manually or update sprint plan
4. Resume: `legba resume {session-id}`

### "Session already active" error

**Cause**: Legba only allows one session per project at a time.

**Solution**:
1. Check current session: `legba status`
2. Wait for it to complete, or
3. Abort if necessary: `legba abort {session-id}`
4. New request will be queued if queue isn't full

### Draft PR not created

**Cause**: Session completed but PR creation failed.

**Possible causes**:
- GitHub App permissions insufficient
- Installation ID incorrect
- Branch already exists
- No changes to commit

**Solution**:
1. Check session logs for GitHub errors
2. Verify GitHub App has Contents and Pull Requests write access
3. Verify installation ID in registry
4. Check if changes were actually made

### Notifications not received

**Cause**: Messages aren't reaching the chat channel.

**Possible causes**:
- Channel ID incorrect in chat context
- Bot lacks permission to post
- Message format invalid for platform

**Solution**:
1. Verify Moltbot is in the channel
2. Check channel ID in session record
3. Review worker logs for notification errors

### Session paused unexpectedly

**Cause**: Circuit breaker detected a problem.

**What to do**:
1. Check the pause reason in status: `legba status {session-id}`
2. Review logs: `legba logs {session-id}`
3. Fix the underlying issue
4. Resume: `legba resume {session-id}`

### R2 storage errors

**Cause**: R2 bucket operations failing.

**Possible causes**:
- Bucket doesn't exist
- Binding name mismatch
- Quota exceeded
- Network issues

**Solution**:
1. Verify bucket exists: `wrangler r2 bucket list`
2. Check binding name in wrangler.toml matches `LEGBA_R2`
3. Check R2 usage in Cloudflare dashboard
4. Retry the operation

## Debugging

### View Worker Logs

```bash
wrangler tail
```

### Check Session State

```bash
# Via R2
wrangler r2 object get legba-state/sessions/{id}/session.json

# Via chat
legba status {session-id}
```

### Check Registry

```bash
wrangler r2 object get legba-state/registry.json
```

### Check Queue

```bash
wrangler r2 object get legba-state/queue/pending.json
```

### Manual Session Cleanup

If a session is stuck and can't be aborted:

```bash
# Get the session
wrangler r2 object get legba-state/sessions/{id}/session.json > session.json

# Edit to set state to ABORTED
# Update session.json

# Upload back
wrangler r2 object put legba-state/sessions/{id}/session.json --file=session.json
```

## Performance Issues

### Slow sandbox startup

Cold starts can take 30-60 seconds. This is normal for the first execution.

**Mitigations**:
- Keep worker warm with periodic health checks
- Use shallow clones for large repositories
- Ensure minimal dependencies

### Long execution times

Sprint execution can take 30+ minutes depending on complexity.

**Tips**:
- Break large sprints into smaller ones
- Ensure sprint tasks are well-defined
- Monitor progress via logs

### High R2 usage

Large logs can consume R2 storage quickly.

**Mitigations**:
- Implement log rotation (future feature)
- Periodically clean old sessions
- Archive completed sessions

## Getting Help

1. Check logs: `legba logs {session-id}`
2. Check status: `legba status {session-id}`
3. Review error code table above
4. Check Cloudflare worker logs
5. File an issue if problem persists
