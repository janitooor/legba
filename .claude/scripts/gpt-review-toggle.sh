#!/usr/bin/env bash
# Toggle GPT review enabled/disabled in .loa.config.yaml
# Usage: gpt-review-toggle.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$ROOT_DIR/.loa.config.yaml"

# Check if yq is available
if ! command -v yq &>/dev/null; then
  echo "Error: yq is required but not installed" >&2
  exit 1
fi

# Check if config file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: Config file not found at $CONFIG_FILE" >&2
  exit 1
fi

# Get current state
current=$(yq eval '.gpt_review.enabled // false' "$CONFIG_FILE" 2>/dev/null || echo "false")

# Toggle it
if [[ "$current" == "true" ]]; then
  yq eval -i '.gpt_review.enabled = false' "$CONFIG_FILE"
  # Remove context file
  rm -f "$ROOT_DIR/.claude/context/gpt-review-active.md"
  echo "GPT Review: DISABLED"
else
  yq eval -i '.gpt_review.enabled = true' "$CONFIG_FILE"
  # Create context file
  "$SCRIPT_DIR/toggle-gpt-review-context.sh"
  echo "GPT Review: ENABLED"
fi

exit 0
