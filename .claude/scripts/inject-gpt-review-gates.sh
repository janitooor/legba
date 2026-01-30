#!/usr/bin/env bash
# Inject or remove GPT review gates from skill files based on config
# Called by SessionStart hook

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$ROOT_DIR/.loa.config.yaml"
SKILLS_DIR="$ROOT_DIR/.claude/skills"

# Gate markers - use XML-style tags, NOT HTML comments (Claude ignores HTML comments!)
START_MARKER="<gpt_review_gate>"
END_MARKER="</gpt_review_gate>"

# Gate content for each skill - IMPERATIVE language so Claude doesn't skip
# Injected BEFORE </workflow> tag to be part of the workflow, not an afterthought

PRD_GATE="$START_MARKER

### Phase 9: GPT Cross-Model Review

Run the GPT review skill on the PRD:

/gpt-review prd

Handle the verdict before proceeding to the next phase.

$END_MARKER"

SDD_GATE="$START_MARKER

### Phase 5: GPT Cross-Model Review

Run the GPT review skill on the SDD:

/gpt-review sdd

Handle the verdict before proceeding to sprint planning.

$END_MARKER"

SPRINT_GATE="$START_MARKER

### Phase 5: GPT Cross-Model Review

Run the GPT review skill on the sprint plan:

/gpt-review sprint

Handle the verdict before proceeding to implementation.

$END_MARKER"

CODE_GATE="$START_MARKER

### Post-Task: GPT Cross-Model Review

Run the GPT review skill on modified files:

/gpt-review code <modified-file>

Handle the verdict before proceeding to the next task.

$END_MARKER"

# Remove gate from a skill file
remove_gate() {
  local file="$1"
  if [[ -f "$file" ]] && grep -q "$START_MARKER" "$file"; then
    # Remove everything between markers (inclusive)
    sed -i.bak "/$START_MARKER/,/$END_MARKER/d" "$file"
    rm -f "${file}.bak"
  fi
}

# Add gate to a skill file - inject BEFORE </workflow> so it's part of the workflow
add_gate() {
  local file="$1"
  local gate="$2"

  # First remove any existing gate
  remove_gate "$file"

  if [[ -f "$file" ]]; then
    # Check if file has </workflow> tag
    if grep -q '</workflow>' "$file"; then
      # Insert gate BEFORE </workflow> so it's part of the workflow phases
      # Write gate to temp file, then use sed to insert
      local gate_file="${file}.gate.tmp"
      local temp_file="${file}.tmp"
      printf '%s\n' "$gate" > "$gate_file"

      # Use awk to insert gate content before </workflow>
      awk -v gatefile="$gate_file" '
        /<\/workflow>/ {
          while ((getline line < gatefile) > 0) print line
          close(gatefile)
        }
        { print }
      ' "$file" > "$temp_file"

      mv "$temp_file" "$file"
      rm -f "$gate_file"
    else
      # No workflow tag - append to end (fallback)
      printf '\n%s\n' "$gate" >> "$file"
    fi
  fi
}

# Check if yq is available
if ! command -v yq &>/dev/null; then
  exit 0
fi

# Check if config file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
  # No config - remove gates
  remove_gate "$SKILLS_DIR/discovering-requirements/SKILL.md"
  remove_gate "$SKILLS_DIR/designing-architecture/SKILL.md"
  remove_gate "$SKILLS_DIR/planning-sprints/SKILL.md"
  remove_gate "$SKILLS_DIR/implementing-tasks/SKILL.md"
  exit 0
fi

# Check if GPT review is enabled
enabled=$(yq eval '.gpt_review.enabled // false' "$CONFIG_FILE" 2>/dev/null || echo "false")

if [[ "$enabled" == "true" ]]; then
  # Add gates to skills
  add_gate "$SKILLS_DIR/discovering-requirements/SKILL.md" "$PRD_GATE"
  add_gate "$SKILLS_DIR/designing-architecture/SKILL.md" "$SDD_GATE"
  add_gate "$SKILLS_DIR/planning-sprints/SKILL.md" "$SPRINT_GATE"
  add_gate "$SKILLS_DIR/implementing-tasks/SKILL.md" "$CODE_GATE"
else
  # Remove gates from skills
  remove_gate "$SKILLS_DIR/discovering-requirements/SKILL.md"
  remove_gate "$SKILLS_DIR/designing-architecture/SKILL.md"
  remove_gate "$SKILLS_DIR/planning-sprints/SKILL.md"
  remove_gate "$SKILLS_DIR/implementing-tasks/SKILL.md"
fi

exit 0
