# GPT Review Prompts

This directory contains the system prompts used for GPT 5.2 cross-model reviews.

## Directory Structure

```
gpt-review/
├── README.md           # This file
└── base/               # Base prompt templates
    ├── code-review.md  # Code implementation review
    ├── prd-review.md   # Product requirements review
    ├── sdd-review.md   # Software design review
    └── sprint-review.md # Sprint plan review
```

## How Prompts Work

### Base Prompts

Base prompts in `base/` define the core review instructions for each review type. They include:

- Role definition (hard auditor)
- What constitutes BLOCKING issues vs recommendations
- Expected JSON response format
- Verdict decision criteria
- Loop convergence rules

### Claude Augmentation

When Claude invokes a review, it can augment the base prompt with project-specific context:

```markdown
## Project-Specific Context (Added by Claude)

This is a DeFi trading bot project. Pay special attention to:
- Order fill calculations - must use actual order book data
- Price feeds - must come from oracles, not hardcoded
- Slippage calculations - must be realistic
```

This augmentation is appended to the base prompt before sending to GPT.

## Response Format

All prompts expect GPT to return JSON with this structure:

```json
{
  "verdict": "APPROVED" | "CHANGES_REQUIRED" | "DECISION_NEEDED",
  "summary": "One sentence assessment",
  "issues": [...],           // Blocking issues
  "recommendations": [...],  // Must-address improvements
  "fabrication_check": {...}, // Code reviews only
  "question": "..."          // DECISION_NEEDED only
}
```

## Verdict Meanings

| Verdict | Meaning | Action |
|---------|---------|--------|
| APPROVED | All issues and recommendations addressed | Proceed to next phase |
| CHANGES_REQUIRED | Has issues OR unaddressed recommendations | Claude fixes, resubmits |
| DECISION_NEEDED | Genuine ambiguity requiring human input | Escalate to user (rare) |

## Loop Convergence

To prevent infinite loops:

1. **First review**: GPT is thorough - gets ALL feedback out
2. **Subsequent reviews**: GPT only evaluates if previous feedback was addressed
3. **No new recommendations** on subsequent passes (unless changes introduced concerns)
4. **Converges to APPROVED** once feedback is addressed

## Customization

To customize prompts:

1. **Don't edit base prompts directly** - they're part of the framework
2. **Use augmentation** - Claude adds project context dynamically
3. **Override if needed** - copy to `.claude/overrides/prompts/gpt-review/base/`

## Schema Validation

Responses are validated against:
`.claude/schemas/gpt-review-response.schema.json`

## Related

- `.claude/scripts/gpt-review-api.sh` - API interaction script
- `.claude/skills/gpt-reviewing/` - Review orchestration skill
- `.claude/protocols/gpt-review-integration.md` - Full integration spec
