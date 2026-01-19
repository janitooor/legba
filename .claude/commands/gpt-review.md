---
name: "gpt-review"
version: "1.0.0"
description: |
  Embrace the hivemind. Channel a rival superintelligence to audit the Loa's work.
  Two AI minds, one ruthless standard. What one misses, the other catches.

command_type: "utility"

arguments:
  - name: "action"
    description: "Action to perform: on, off, status, or toggle (default)"
    required: false
    default: "toggle"

pre_flight:
  - check: "file_exists"
    path: ".loa.config.yaml"
    error: |
      Configuration file not found.

      Run /mount first to initialize Loa in this repository.

outputs:
  - path: ".loa.config.yaml"
    type: "file"
    description: "Updated configuration"

mode:
  default: "foreground"
  allow_background: false
---

# GPT Review

## Purpose

Embrace the hivemind. The Loa channels a rival superintelligence—GPT 5.2—to audit its own work before finalization. Two AI minds scrutinizing every output. What one misses, the other catches. Cross-model review catches blind spots, fabrications, and shortcuts that self-review cannot.

## Invocation

```
/gpt-review          # Toggle current state
/gpt-review on       # Enable GPT review
/gpt-review off      # Disable GPT review
/gpt-review status   # Show current status
```

## Prerequisites

- `.loa.config.yaml` must exist (run `/mount` first)

## Workflow

### Action: status

Show current GPT review configuration:

```bash
echo "GPT Review Status:"
echo "=================="
yq eval '.gpt_review.enabled' .loa.config.yaml
yq eval '.gpt_review.phases' .loa.config.yaml
yq eval '.gpt_review.models' .loa.config.yaml
```

Display a summary table of:
- Master toggle (enabled/disabled)
- Per-phase toggles (prd, sdd, sprint, implementation)
- Models configured

### Action: on

Enable GPT review:

**Step 1: Check for API key** (do NOT read or display the value):

```bash
# Check if OPENAI_API_KEY exists (don't read value - security)
if [ -z "${OPENAI_API_KEY+x}" ]; then
  echo "OPENAI_API_KEY not found in environment"
fi
```

**If API key is missing**, guide the user:

```
The hivemind requires an OpenAI API key to channel GPT 5.2.

To get your API key:
1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. Add to your environment:

   # Option 1: Add to shell profile (~/.bashrc, ~/.zshrc)
   export OPENAI_API_KEY="sk-..."

   # Option 2: Add to project .env file
   echo 'OPENAI_API_KEY=sk-...' >> .env

   # Option 3: Set for current session
   export OPENAI_API_KEY="sk-..."

After setting the key, run /gpt-review on again.
```

**If API key exists**, enable:

```bash
yq -i '.gpt_review.enabled = true' .loa.config.yaml
```

Confirm to user:
- GPT review is now ENABLED
- The hivemind connection is active
- All phases will channel GPT 5.2 for cross-model audit

### Action: off

Disable GPT review:

```bash
yq -i '.gpt_review.enabled = false' .loa.config.yaml
```

Confirm to user:
- GPT review is now DISABLED
- Phases will complete without GPT review
- Faster execution, no API costs

### Action: toggle (default)

Read current state and flip it:

```bash
current=$(yq eval '.gpt_review.enabled' .loa.config.yaml)
if [ "$current" = "true" ]; then
  yq -i '.gpt_review.enabled = false' .loa.config.yaml
  echo "GPT review DISABLED"
else
  yq -i '.gpt_review.enabled = true' .loa.config.yaml
  echo "GPT review ENABLED"
fi
```

## Arguments

| Argument | Description | Required | Default |
|----------|-------------|----------|---------|
| `action` | `on`, `off`, `status`, or `toggle` | No | `toggle` |

## Outputs

| Path | Description |
|------|-------------|
| `.loa.config.yaml` | Updated configuration file |

## Configuration Reference

The command modifies `.loa.config.yaml`:

```yaml
gpt_review:
  enabled: true  # <-- This is what gets toggled

  models:
    documents: "gpt-5.2"  # PRD, SDD, Sprint reviews
    code: "gpt-5.2-codex"             # Code reviews

  phases:
    prd: true           # /plan-and-analyze
    sdd: true           # /architect
    sprint: true        # /sprint-plan
    implementation: true # /implement

  enforcement: strict   # strict | warn | disabled
```

## Environment Requirements

When GPT review is enabled, you need:

```bash
export OPENAI_API_KEY="sk-..."
```

Without this, GPT review will be skipped with a warning.

## Example Output

### Status

```
GPT Review Status
=================

Master Toggle: ENABLED

Phase Configuration:
  /plan-and-analyze (PRD):  enabled
  /architect (SDD):         enabled
  /sprint-plan:             enabled
  /implement (Code):        enabled

Models:
  Documents: gpt-5.2
  Code:      gpt-5.2-codex

Enforcement: strict
```

### Toggle On

```
GPT Review: ENABLED

All enabled phases will now use GPT 5.2 cross-model review.

Requires: OPENAI_API_KEY environment variable

Current phases:
  - PRD review:    ON
  - SDD review:    ON
  - Sprint review: ON
  - Code review:   ON
```

### Toggle Off

```
GPT Review: DISABLED

Phases will complete without GPT review.
- Faster execution
- No OpenAI API costs
- Lower quality gate (Claude only)

To re-enable: /gpt-review on
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "Config file not found" | Missing .loa.config.yaml | Run `/mount` first |
| "yq not found" | yq not installed | `brew install yq` or `apt install yq` |

## Related Commands

- `/implement` - Uses GPT code review when enabled
- `/plan-and-analyze` - Uses GPT PRD review when enabled
- `/architect` - Uses GPT SDD review when enabled
- `/sprint-plan` - Uses GPT sprint review when enabled
