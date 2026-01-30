#!/usr/bin/env bash
# PostToolUse Hook - Outputs JSON reminder for GPT review
# Claude sees additionalContext; plain echo is invisible to Claude
#
# IMPORTANT: Hook must consume stdin to avoid hanging (hooks receive JSON input)
# The matcher is now just "Edit|Write" so we filter by file extension here.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../../.loa.config.yaml"

# Read stdin JSON input (contains tool_input.file_path)
INPUT=$(cat)

# Extract file path from JSON input
FILE_PATH=""
if command -v jq &>/dev/null; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
fi

# Check if file matches code patterns (skip non-code files)
if [[ -n "$FILE_PATH" ]]; then
  if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|rb|php|swift|kt|sh)$ ]]; then
    exit 0  # Not a code file, skip silently
  fi
fi

# Silent exit if yq missing
if ! command -v yq &>/dev/null; then
  exit 0
fi

# Silent exit if config missing
if [[ ! -f "$CONFIG_FILE" ]]; then
  exit 0
fi

# Check if GPT review is enabled
enabled=$(yq eval '.gpt_review.enabled // false' "$CONFIG_FILE" 2>/dev/null || echo "false")
if [[ "$enabled" != "true" ]]; then
  exit 0
fi

# GPT review is enabled - output JSON that Claude will see
# The additionalContext field is injected into Claude's conversation context
#
# Policy:
# - Sprint tasks (/implement, /run): MANDATORY per task (enforced by skill gate)
# - Ad-hoc changes: Optional for trivial changes, but encouraged for substantial ones
# - NEVER skip reviews just to save time or maintain velocity
# Fixed: 2026-01-29 - Matcher changed from regex to "Edit|Write", script filters by extension
cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Code modified. GPT review policy: If you're executing sprint tasks, GPT review is MANDATORY after each task - do NOT skip to save time. New files, API changes, and complex logic ALWAYS need review. Only skip for truly trivial changes (typos, import reordering). Judgment is based on CODE COMPLEXITY, not velocity. If you've made several code changes without GPT review, stop and run one now: Skill: gpt-review, Args: code <file>"
  }
}
EOF

exit 0
