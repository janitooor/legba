#!/usr/bin/env bats
# Tests for GPT review skill integration
#
# Verifies that GPT review instructions are conditionally loaded.
# When enabled: context file created with gate instructions.
# When disabled: context file removed, skills don't have gates inline.

setup() {
    SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    SKILLS_DIR="$PROJECT_ROOT/.claude/skills"
    TEMPLATE_FILE="$PROJECT_ROOT/.claude/templates/gpt-review-instructions.md.template"
    TOGGLE_SCRIPT="$PROJECT_ROOT/.claude/scripts/toggle-gpt-review-context.sh"
    CONTEXT_FILE="$PROJECT_ROOT/.claude/context/gpt-review-active.md"
    FIXTURES_DIR="$PROJECT_ROOT/tests/fixtures/gpt-review"

    # Create temp directory for test-specific files
    TEST_DIR="${BATS_TEST_TMPDIR:-$(mktemp -d)}"
}

# =============================================================================
# Template file tests (gates live in template, not skills)
# =============================================================================

@test "GPT review template file exists" {
    [[ -f "$TEMPLATE_FILE" ]]
}

@test "template has PRD review invocation" {
    run grep -q "gpt-review-api.sh prd" "$TEMPLATE_FILE"
    [[ "$status" -eq 0 ]]
}

@test "template has SDD review invocation" {
    run grep -q "gpt-review-api.sh sdd" "$TEMPLATE_FILE"
    [[ "$status" -eq 0 ]]
}

@test "template has Sprint review invocation" {
    run grep -q "gpt-review-api.sh sprint" "$TEMPLATE_FILE"
    [[ "$status" -eq 0 ]]
}

@test "template has code review invocation" {
    run grep -q "gpt-review-api.sh code" "$TEMPLATE_FILE"
    [[ "$status" -eq 0 ]]
}

@test "template documents all verdicts" {
    run grep -q "APPROVED" "$TEMPLATE_FILE"
    [[ "$status" -eq 0 ]]
    run grep -q "CHANGES_REQUIRED" "$TEMPLATE_FILE"
    [[ "$status" -eq 0 ]]
    run grep -q "DECISION_NEEDED" "$TEMPLATE_FILE"
    [[ "$status" -eq 0 ]]
}

# =============================================================================
# Skill files should NOT have gates inline (token optimization)
# =============================================================================

@test "discovering-requirements skill exists" {
    [[ -f "$SKILLS_DIR/discovering-requirements/SKILL.md" ]]
}

@test "discovering-requirements does NOT have gpt_review_gate inline" {
    run grep -q "<gpt_review_gate>" "$SKILLS_DIR/discovering-requirements/SKILL.md"
    [[ "$status" -ne 0 ]]
}

@test "designing-architecture skill exists" {
    [[ -f "$SKILLS_DIR/designing-architecture/SKILL.md" ]]
}

@test "designing-architecture does NOT have gpt_review_gate inline" {
    run grep -q "<gpt_review_gate>" "$SKILLS_DIR/designing-architecture/SKILL.md"
    [[ "$status" -ne 0 ]]
}

@test "planning-sprints skill exists" {
    [[ -f "$SKILLS_DIR/planning-sprints/SKILL.md" ]]
}

@test "planning-sprints does NOT have gpt_review_gate inline" {
    run grep -q "<gpt_review_gate>" "$SKILLS_DIR/planning-sprints/SKILL.md"
    [[ "$status" -ne 0 ]]
}

@test "implementing-tasks skill exists" {
    [[ -f "$SKILLS_DIR/implementing-tasks/SKILL.md" ]]
}

@test "implementing-tasks does NOT have gpt_review_gate inline" {
    run grep -q "<gpt_review_gate" "$SKILLS_DIR/implementing-tasks/SKILL.md"
    [[ "$status" -ne 0 ]]
}

# =============================================================================
# Context toggle tests
# =============================================================================

@test "toggle script exists and is executable" {
    [[ -x "$TOGGLE_SCRIPT" ]]
}

@test "toggle creates context file when enabled" {
    # Setup test environment
    mkdir -p "$TEST_DIR/.claude/templates"
    mkdir -p "$TEST_DIR/.claude/context"
    mkdir -p "$TEST_DIR/.claude/scripts"
    cp "$TEMPLATE_FILE" "$TEST_DIR/.claude/templates/gpt-review-instructions.md.template"
    cp "$TOGGLE_SCRIPT" "$TEST_DIR/.claude/scripts/toggle-gpt-review-context.sh"

    # Create enabled config
    cp "$FIXTURES_DIR/configs/enabled.yaml" "$TEST_DIR/.loa.config.yaml"

    cd "$TEST_DIR"
    run .claude/scripts/toggle-gpt-review-context.sh
    [[ "$status" -eq 0 ]]
    [[ -f "$TEST_DIR/.claude/context/gpt-review-active.md" ]]
}

@test "toggle removes context file when disabled" {
    # Setup test environment
    mkdir -p "$TEST_DIR/.claude/templates"
    mkdir -p "$TEST_DIR/.claude/context"
    mkdir -p "$TEST_DIR/.claude/scripts"
    cp "$TEMPLATE_FILE" "$TEST_DIR/.claude/templates/gpt-review-instructions.md.template"
    cp "$TOGGLE_SCRIPT" "$TEST_DIR/.claude/scripts/toggle-gpt-review-context.sh"

    # Create a pre-existing context file
    echo "# Old content" > "$TEST_DIR/.claude/context/gpt-review-active.md"

    # Create disabled config
    cp "$FIXTURES_DIR/configs/disabled.yaml" "$TEST_DIR/.loa.config.yaml"

    cd "$TEST_DIR"
    run .claude/scripts/toggle-gpt-review-context.sh
    [[ "$status" -eq 0 ]]
    [[ ! -f "$TEST_DIR/.claude/context/gpt-review-active.md" ]]
}

@test "toggle removes context file when config missing" {
    # Setup test environment (no config file)
    mkdir -p "$TEST_DIR/.claude/templates"
    mkdir -p "$TEST_DIR/.claude/context"
    mkdir -p "$TEST_DIR/.claude/scripts"
    cp "$TOGGLE_SCRIPT" "$TEST_DIR/.claude/scripts/toggle-gpt-review-context.sh"

    # Create a pre-existing context file
    echo "# Old content" > "$TEST_DIR/.claude/context/gpt-review-active.md"

    cd "$TEST_DIR"
    run .claude/scripts/toggle-gpt-review-context.sh
    [[ "$status" -eq 0 ]]
    [[ ! -f "$TEST_DIR/.claude/context/gpt-review-active.md" ]]
}

# =============================================================================
# Static infrastructure tests
# =============================================================================

@test "gpt-review-api.sh script is executable" {
    [[ -x "$PROJECT_ROOT/.claude/scripts/gpt-review-api.sh" ]]
}

@test "/gpt-review command definition exists" {
    [[ -f "$PROJECT_ROOT/.claude/commands/gpt-review.md" ]]
}

@test "SessionStart hook runs toggle script" {
    run grep -q "toggle-gpt-review-context.sh" "$PROJECT_ROOT/.claude/settings.json"
    [[ "$status" -eq 0 ]]
}

@test "PostToolUse hook for code files exists" {
    run grep -q "auto-gpt-review-hook.sh" "$PROJECT_ROOT/.claude/settings.json"
    [[ "$status" -eq 0 ]]
}
