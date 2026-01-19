# GPT 5.2 Cross-Model Review Integration Protocol

This protocol defines how GPT 5.2 is integrated as an internal reviewer within Loa's existing phases.

## Overview

GPT 5.2 reviews Claude's outputs **INTERNALLY** within each phase. There are no new user-facing commands. The user experience is unchanged except:
- Phases may take slightly longer
- Output quality is higher (bugs, fabrication, and blind spots caught)

## Key Principles

1. **Internal Integration** - GPT review happens INSIDE existing skills, not as a separate phase
2. **Minimal User Intervention** - CHANGES_REQUIRED loops automatically; user only involved for DECISION_NEEDED
3. **Loop Convergence** - First pass is thorough, subsequent passes only evaluate previous feedback
4. **Recommendations Must Be Addressed** - Claude has discretion on HOW, but must address before APPROVED

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    EXISTING COMMAND                          │
│                                                              │
│  ┌─────────────────┐                                        │
│  │ 1. Primary Work │  Claude does main task (write code,    │
│  │                 │  draft PRD, design SDD, plan sprint)   │
│  └────────┬────────┘                                        │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                        │
│  │ 2. GPT Review   │  If gpt_review.enabled &&              │
│  │    (Internal)   │  gpt_review.phases.<phase> == true     │
│  └────────┬────────┘                                        │
│           │                                                  │
│      ┌────┴────┐                                            │
│      │ Verdict │                                            │
│      └────┬────┘                                            │
│           │                                                  │
│   ┌───────┼───────┬───────────────┐                         │
│   │       │       │               │                         │
│   ▼       │       ▼               ▼                         │
│ APPROVED  │  CHANGES_REQUIRED  DECISION_NEEDED              │
│   │       │       │               │                         │
│   │       │       ▼               ▼                         │
│   │       │  Claude fixes     Ask user                      │
│   │       │  automatically    the question                  │
│   │       │       │               │                         │
│   │       │       └───────────────┘                         │
│   │       │               │                                  │
│   │       └───────────────┘                                  │
│   │               │                                          │
│   │               ▼                                          │
│   │       [Re-review loop]                                   │
│   │                                                          │
│   ▼                                                          │
│  ┌─────────────────┐                                        │
│  │ 3. Write Output │  Final output written only after       │
│  │                 │  GPT approval                          │
│  └─────────────────┘                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Skill Modification Pattern

Each skill that supports GPT review follows this pattern:

### 1. Check if Enabled

```bash
# Check master toggle
enabled=$(yq eval '.gpt_review.enabled // false' .loa.config.yaml)

# Check phase-specific toggle
phase_enabled=$(yq eval '.gpt_review.phases.<phase> // false' .loa.config.yaml)

# Check API key is available
if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "GPT review skipped: OPENAI_API_KEY not set"
  enabled="false"
fi
```

### 2. Prepare Review Context

```bash
# For code reviews:
git diff HEAD~1 --unified=5 > /tmp/review-content.txt

# For document reviews:
cat grimoires/loa/<document>.md > /tmp/review-content.txt
```

### 3. Create Augmentation

The augmentation provides project-specific context to GPT:

```markdown
## Project Context

**Type:** [Project type from PRD]
**Domain:** [Domain-specific considerations]

## Current Task

**Task:** [Task description]
**Acceptance Criteria:**
- [Criteria 1]
- [Criteria 2]

## Key Constraints

- [Constraint 1]
- [Constraint 2]
```

### 4. Call GPT Review API

```bash
.claude/scripts/gpt-review-api.sh <type> /tmp/review-content.txt /tmp/augmentation.md
```

Where `<type>` is one of: `prd`, `sdd`, `sprint`, `code`

### 5. Handle Response

Parse JSON response and handle verdict:

```json
{
  "verdict": "APPROVED | CHANGES_REQUIRED | DECISION_NEEDED",
  "summary": "One sentence assessment",
  "issues": [...],
  "recommendations": [...],
  "fabrication_check": {...},
  "question": "Only for DECISION_NEEDED"
}
```

## Verdict Meanings

| Verdict | Meaning | Action |
|---------|---------|--------|
| APPROVED | All issues addressed, recommendations resolved | Write final output, proceed |
| CHANGES_REQUIRED | Has blocking issues OR unaddressed recommendations | Claude fixes automatically, re-review |
| DECISION_NEEDED | Genuine ambiguity requiring human input | Ask user the specific question |

## Loop Convergence Rules

To prevent infinite loops:

1. **First review**: GPT is thorough - gets ALL issues and recommendations out in one pass
2. **Subsequent reviews**: GPT ONLY evaluates if previous feedback was addressed
3. **No new recommendations** on subsequent passes (unless changes introduced new concerns)
4. **Converge to APPROVED** once previous feedback is satisfactorily addressed

## API Configuration

Configuration in `.loa.config.yaml`:

```yaml
gpt_review:
  enabled: true
  api_key_env: "OPENAI_API_KEY"
  timeout_seconds: 300
  max_retries: 3
  models:
    documents: "gpt-5.2"     # High reasoning for PRD, SDD, Sprint reviews
    code: "gpt-5.2-codex"     # Code-optimized for implementation reviews
  phases:
    prd: true
    sdd: true
    sprint: true
    implementation: true
  enforcement: strict        # strict | warn | disabled
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `GPT_REVIEW_MODEL` | No | Override model for all reviews |
| `GPT_REVIEW_TIMEOUT` | No | Override timeout in seconds |
| `GPT_REVIEW_DISABLED` | No | Set to "true" to disable |

## Prompt System

### Base Prompts

Located in `.claude/prompts/gpt-review/base/`:
- `code-review.md` - Code implementation review
- `prd-review.md` - Product requirements review
- `sdd-review.md` - Software design review
- `sprint-review.md` - Sprint plan review

### Augmentation

Claude adds project-specific context to base prompts:
- Project type and domain
- Current task description
- Acceptance criteria
- Domain-specific constraints

## Troubleshooting

### GPT Review Not Running

1. Check `gpt_review.enabled` in `.loa.config.yaml`
2. Check phase-specific toggle (e.g., `gpt_review.phases.implementation`)
3. Verify `OPENAI_API_KEY` is set: `echo $OPENAI_API_KEY`
4. Check enforcement level isn't "disabled"

### Timeout Errors

1. Increase `timeout_seconds` in config
2. Or set `GPT_REVIEW_TIMEOUT` environment variable
3. For large diffs, consider breaking into smaller chunks

### Rate Limiting

1. Script has built-in retry with exponential backoff
2. If persistent, check OpenAI API usage limits
3. Consider reducing review frequency temporarily

### Invalid Responses

1. Check `gpt-review-api.sh` exit code (5 = invalid response)
2. Response must include valid `verdict` field
3. Check prompt templates for formatting issues

## Related Files

- `.claude/scripts/gpt-review-api.sh` - API interaction script
- `.claude/prompts/gpt-review/` - Prompt templates
- `.claude/schemas/gpt-review-response.schema.json` - Response validation
- `.claude/protocols/feedback-loops.md` - Feedback loop integration

## Phase-Specific Integration

### /plan-and-analyze (PRD)
- Skill: `discovering-requirements`
- Review type: `prd`
- Trigger: Before writing `grimoires/loa/prd.md`

### /architect (SDD)
- Skill: `designing-architecture`
- Review type: `sdd`
- Trigger: Before writing `grimoires/loa/sdd.md`

### /sprint-plan (Sprint)
- Skill: `planning-sprints`
- Review type: `sprint`
- Trigger: Before writing `grimoires/loa/sprint.md`

### /implement (Code)
- Skill: `implementing-tasks`
- Review type: `code`
- Trigger: After code written, before writing `reviewer.md`

## End-to-End Testing

### Prerequisites

1. Set `OPENAI_API_KEY` environment variable
2. Ensure `.loa.config.yaml` has `gpt_review.enabled: true`
3. Enable desired phases in `gpt_review.phases.*`

### Test 1: PRD Review (`/plan-and-analyze`)

```bash
# 1. Start a new project or use test directory
mkdir -p /tmp/test-gpt-review && cd /tmp/test-gpt-review

# 2. Initialize Loa
# (mount or copy .claude directory)

# 3. Run /plan-and-analyze
# The skill should:
# - Conduct discovery interview
# - Draft PRD
# - Call gpt-review-api.sh prd <draft> <augmentation>
# - Handle verdict (loop if CHANGES_REQUIRED)
# - Write prd.md with GPT review metadata

# 4. Verify prd.md includes:
grep -A5 "GPT Review Status" grimoires/loa/prd.md
# Expected: "GPT Review Status: APPROVED"
```

### Test 2: SDD Review (`/architect`)

```bash
# 1. Ensure prd.md exists from Test 1

# 2. Run /architect
# The skill should:
# - Read PRD
# - Design architecture
# - Draft SDD
# - Call gpt-review-api.sh sdd <draft> <augmentation>
# - Handle verdict
# - Write sdd.md with GPT review metadata

# 3. Verify sdd.md includes:
grep -A5 "GPT Review Status" grimoires/loa/sdd.md
# Expected: "GPT Review Status: APPROVED"
```

### Test 3: Sprint Review (`/sprint-plan`)

```bash
# 1. Ensure prd.md and sdd.md exist

# 2. Run /sprint-plan
# The skill should:
# - Read PRD and SDD
# - Plan sprints
# - Draft sprint.md
# - Call gpt-review-api.sh sprint <draft> <augmentation>
# - Handle verdict
# - Write sprint.md with GPT review metadata

# 3. Verify sprint.md includes:
grep -A5 "GPT Review Status" grimoires/loa/sprint.md
# Expected: "GPT Review Status: APPROVED"
```

### Test 4: Code Review (`/implement sprint-1`)

```bash
# 1. Ensure sprint.md exists with sprint-1 tasks

# 2. Run /implement sprint-1
# The skill should:
# - Read sprint tasks
# - Implement code
# - Call gpt-review-api.sh code <diff> <augmentation>
# - Handle verdict (loop if CHANGES_REQUIRED)
# - Write reviewer.md with GPT review section

# 3. Verify reviewer.md includes:
grep -A5 "## GPT Review" grimoires/loa/a2a/sprint-1/reviewer.md
# Expected:
# **Status:** APPROVED
# **Iterations:** N
# **Model:** gpt-5.2-codex
```

### Test 5: CHANGES_REQUIRED Loop

To test automatic fix-and-resubmit behavior:

```bash
# 1. Create code with a known issue (e.g., hardcoded value)
# 2. Run /implement
# 3. Verify:
#    - First review returns CHANGES_REQUIRED
#    - Claude fixes the issue automatically
#    - Second review returns APPROVED
#    - reviewer.md shows Iterations: 2

# Check trajectory logs for review iterations
cat grimoires/loa/a2a/trajectory/implementing-tasks-$(date +%Y-%m-%d).jsonl | grep gpt_review
```

### Test 6: DECISION_NEEDED Escalation

To test user escalation:

```bash
# 1. Create ambiguous requirements that GPT cannot resolve
# 2. Run /implement
# 3. Verify:
#    - GPT returns DECISION_NEEDED with question
#    - User is asked the specific question
#    - After user response, review continues
#    - Final verdict is APPROVED
```

### Test 7: API Error Handling

```bash
# 1. Test timeout handling
export GPT_REVIEW_TIMEOUT=5  # Very short timeout
# Run a phase and verify graceful degradation

# 2. Test missing API key
unset OPENAI_API_KEY
# Run a phase and verify skip message

# 3. Test rate limiting
# Run multiple phases quickly and verify retry behavior
```

### Test 8: No Regressions

Verify existing workflow works without GPT review:

```bash
# 1. Disable GPT review
yq -i '.gpt_review.enabled = false' .loa.config.yaml

# 2. Run full workflow
# /plan-and-analyze -> /architect -> /sprint-plan -> /implement sprint-1

# 3. Verify:
#    - All phases complete successfully
#    - No GPT review metadata in outputs
#    - Timing is faster (no API calls)
```

### Verification Checklist

After running tests, verify:

- [ ] PRD includes GPT review metadata at end
- [ ] SDD includes GPT review metadata at end
- [ ] Sprint plan includes GPT review metadata at end
- [ ] reviewer.md includes GPT Review section
- [ ] Trajectory logs include gpt_review actions
- [ ] CHANGES_REQUIRED triggers automatic fix loop
- [ ] DECISION_NEEDED escalates to user correctly
- [ ] API errors handled gracefully
- [ ] Disabled review skips all GPT calls
- [ ] No regressions in existing workflow
