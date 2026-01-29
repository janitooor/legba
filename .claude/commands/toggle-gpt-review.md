# /toggle-gpt-review Command

Toggle GPT cross-model review on or off.

## Usage

```bash
/toggle-gpt-review
```

## Execution

Run the toggle script:

```bash
.claude/scripts/gpt-review-toggle.sh
```

The script handles everything:
- Adds `gpt_review.enabled` to config if missing
- Flips the value: `true` → `false` or `false` → `true`
- Creates/removes the context file
- Reports: `GPT Review: ENABLED` or `GPT Review: DISABLED`

## After Toggling

Restart your Claude session for the context file changes to take effect.
