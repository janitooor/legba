#!/usr/bin/env bash
# Inject or remove GPT review gates from skill files based on config
# Called by SessionStart hook

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$ROOT_DIR/.loa.config.yaml"
SKILLS_DIR="$ROOT_DIR/.claude/skills"

# Gate markers
START_MARKER="<!-- GPT_REVIEW_GATE_START -->"
END_MARKER="<!-- GPT_REVIEW_GATE_END -->"

# Gate content for each skill
PRD_GATE="$START_MARKER
<gpt_review_gate>
## GPT Review Gate (Post-PRD)

After generating \`grimoires/loa/prd.md\`, run GPT cross-model review:

\`\`\`bash
.claude/scripts/gpt-review-api.sh prd grimoires/loa/prd.md
\`\`\`

**Handle verdict:**
- \`SKIPPED\`: Continue (review disabled)
- \`APPROVED\`: Continue to next phase
- \`CHANGES_REQUIRED\`: Fix issues, re-run with \`--iteration 2 --previous <findings.json>\`
- \`DECISION_NEEDED\`: Ask user, then re-run
</gpt_review_gate>
$END_MARKER"

SDD_GATE="$START_MARKER
<gpt_review_gate>
## GPT Review Gate (Post-SDD)

After generating \`grimoires/loa/sdd.md\`, run GPT cross-model review:

\`\`\`bash
.claude/scripts/gpt-review-api.sh sdd grimoires/loa/sdd.md
\`\`\`

**Handle verdict:**
- \`SKIPPED\`: Continue (review disabled)
- \`APPROVED\`: Continue to next phase
- \`CHANGES_REQUIRED\`: Fix issues, re-run with \`--iteration 2 --previous <findings.json>\`
- \`DECISION_NEEDED\`: Ask user, then re-run
</gpt_review_gate>
$END_MARKER"

SPRINT_GATE="$START_MARKER
<gpt_review_gate>
## GPT Review Gate (Post-Sprint Plan)

After generating \`grimoires/loa/sprint.md\`, run GPT cross-model review:

\`\`\`bash
.claude/scripts/gpt-review-api.sh sprint grimoires/loa/sprint.md
\`\`\`

**Handle verdict:**
- \`SKIPPED\`: Continue (review disabled)
- \`APPROVED\`: Continue to implementation
- \`CHANGES_REQUIRED\`: Fix issues, re-run with \`--iteration 2 --previous <findings.json>\`
- \`DECISION_NEEDED\`: Ask user, then re-run
</gpt_review_gate>
$END_MARKER"

CODE_GATE="$START_MARKER
<gpt_review_gate>
## GPT Review Gate (Post-Task)

After completing each task, run GPT cross-model review on modified files:

\`\`\`bash
.claude/scripts/gpt-review-api.sh code <modified-file>
\`\`\`

**Handle verdict:**
- \`SKIPPED\`: Continue (review disabled)
- \`APPROVED\`: Continue to next task
- \`CHANGES_REQUIRED\`: Fix issues, re-run with \`--iteration 2 --previous <findings.json>\`
</gpt_review_gate>
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

# Add gate to a skill file
add_gate() {
  local file="$1"
  local gate="$2"

  # First remove any existing gate
  remove_gate "$file"

  # Append gate to end of file
  if [[ -f "$file" ]]; then
    echo "" >> "$file"
    echo "$gate" >> "$file"
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
