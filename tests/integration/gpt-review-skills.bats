#!/usr/bin/env bats
# Tests for GPT review skill integration
#
# Verifies that GPT review gates are dynamically injected into skill files
# based on config. When enabled: gates are injected. When disabled: removed.

setup() {
    SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    SKILLS_DIR="$PROJECT_ROOT/.claude/skills"
    INJECT_SCRIPT="$PROJECT_ROOT/.claude/scripts/inject-gpt-review-gates.sh"
    TOGGLE_SCRIPT="$PROJECT_ROOT/.claude/scripts/toggle-gpt-review-context.sh"
    FIXTURES_DIR="$PROJECT_ROOT/tests/fixtures/gpt-review"

    # Create temp directory for test-specific files
    TEST_DIR="${BATS_TEST_TMPDIR:-$(mktemp -d)}"

    # Backup original skill files
    for skill in discovering-requirements designing-architecture planning-sprints implementing-tasks; do
        cp "$SKILLS_DIR/$skill/SKILL.md" "$TEST_DIR/${skill}-SKILL.md.bak"
    done
}

teardown() {
    # Restore original skill files
    for skill in discovering-requirements designing-architecture planning-sprints implementing-tasks; do
        if [[ -f "$TEST_DIR/${skill}-SKILL.md.bak" ]]; then
            cp "$TEST_DIR/${skill}-SKILL.md.bak" "$SKILLS_DIR/$skill/SKILL.md"
        fi
    done
}

# =============================================================================
# Inject script tests
# =============================================================================

@test "inject script exists and is executable" {
    [[ -x "$INJECT_SCRIPT" ]]
}

@test "inject script adds gates when enabled" {
    # Setup: copy enabled config to project root
    cp "$FIXTURES_DIR/configs/enabled.yaml" "$PROJECT_ROOT/.loa.config.yaml"

    # Run inject
    run "$INJECT_SCRIPT"
    [[ "$status" -eq 0 ]]

    # Check gates were added
    grep -q "GPT_REVIEW_GATE_START" "$SKILLS_DIR/discovering-requirements/SKILL.md"
    grep -q "GPT_REVIEW_GATE_START" "$SKILLS_DIR/designing-architecture/SKILL.md"
    grep -q "GPT_REVIEW_GATE_START" "$SKILLS_DIR/planning-sprints/SKILL.md"
    grep -q "GPT_REVIEW_GATE_START" "$SKILLS_DIR/implementing-tasks/SKILL.md"

    # Cleanup
    rm -f "$PROJECT_ROOT/.loa.config.yaml"
}

@test "inject script removes gates when disabled" {
    # Setup: first add gates
    cp "$FIXTURES_DIR/configs/enabled.yaml" "$PROJECT_ROOT/.loa.config.yaml"
    "$INJECT_SCRIPT"

    # Verify gates exist
    grep -q "GPT_REVIEW_GATE_START" "$SKILLS_DIR/discovering-requirements/SKILL.md"

    # Now disable
    cp "$FIXTURES_DIR/configs/disabled.yaml" "$PROJECT_ROOT/.loa.config.yaml"
    run "$INJECT_SCRIPT"
    [[ "$status" -eq 0 ]]

    # Check gates were removed
    ! grep -q "GPT_REVIEW_GATE_START" "$SKILLS_DIR/discovering-requirements/SKILL.md"
    ! grep -q "GPT_REVIEW_GATE_START" "$SKILLS_DIR/designing-architecture/SKILL.md"
    ! grep -q "GPT_REVIEW_GATE_START" "$SKILLS_DIR/planning-sprints/SKILL.md"
    ! grep -q "GPT_REVIEW_GATE_START" "$SKILLS_DIR/implementing-tasks/SKILL.md"

    # Cleanup
    rm -f "$PROJECT_ROOT/.loa.config.yaml"
}

@test "skill files are IDENTICAL to original after gate removal" {
    # Store checksums of original files
    local orig_prd_checksum orig_sdd_checksum orig_sprint_checksum orig_impl_checksum
    orig_prd_checksum=$(md5 -q "$TEST_DIR/discovering-requirements-SKILL.md.bak")
    orig_sdd_checksum=$(md5 -q "$TEST_DIR/designing-architecture-SKILL.md.bak")
    orig_sprint_checksum=$(md5 -q "$TEST_DIR/planning-sprints-SKILL.md.bak")
    orig_impl_checksum=$(md5 -q "$TEST_DIR/implementing-tasks-SKILL.md.bak")

    # Add gates
    cp "$FIXTURES_DIR/configs/enabled.yaml" "$PROJECT_ROOT/.loa.config.yaml"
    "$INJECT_SCRIPT"

    # Verify gates were added
    grep -q "GPT_REVIEW_GATE_START" "$SKILLS_DIR/discovering-requirements/SKILL.md"

    # Remove gates
    cp "$FIXTURES_DIR/configs/disabled.yaml" "$PROJECT_ROOT/.loa.config.yaml"
    "$INJECT_SCRIPT"

    # Verify files are IDENTICAL to originals (byte-for-byte)
    local new_prd_checksum new_sdd_checksum new_sprint_checksum new_impl_checksum
    new_prd_checksum=$(md5 -q "$SKILLS_DIR/discovering-requirements/SKILL.md")
    new_sdd_checksum=$(md5 -q "$SKILLS_DIR/designing-architecture/SKILL.md")
    new_sprint_checksum=$(md5 -q "$SKILLS_DIR/planning-sprints/SKILL.md")
    new_impl_checksum=$(md5 -q "$SKILLS_DIR/implementing-tasks/SKILL.md")

    [[ "$orig_prd_checksum" == "$new_prd_checksum" ]]
    [[ "$orig_sdd_checksum" == "$new_sdd_checksum" ]]
    [[ "$orig_sprint_checksum" == "$new_sprint_checksum" ]]
    [[ "$orig_impl_checksum" == "$new_impl_checksum" ]]

    # Cleanup
    rm -f "$PROJECT_ROOT/.loa.config.yaml"
}

@test "injection only adds gate content - rest of skill unchanged" {
    # Store original line count and content checksum (excluding last line for trailing newline)
    local orig_lines orig_content
    orig_lines=$(wc -l < "$TEST_DIR/discovering-requirements-SKILL.md.bak")
    # Get content without potential trailing newline variance
    orig_content=$(head -n "$orig_lines" "$TEST_DIR/discovering-requirements-SKILL.md.bak" | md5 -q)

    # Add gates
    cp "$FIXTURES_DIR/configs/enabled.yaml" "$PROJECT_ROOT/.loa.config.yaml"
    "$INJECT_SCRIPT"

    # Verify gate was added
    grep -q "GPT_REVIEW_GATE_START" "$SKILLS_DIR/discovering-requirements/SKILL.md"

    # Get new line count
    local new_lines
    new_lines=$(wc -l < "$SKILLS_DIR/discovering-requirements/SKILL.md")

    # Gate should add ~17 lines (blank + START marker + content + END marker)
    local expected_min_lines=$((orig_lines + 15))
    [[ "$new_lines" -ge "$expected_min_lines" ]]

    # Original content should still be at the start (first N lines unchanged)
    local new_content
    new_content=$(head -n "$orig_lines" "$SKILLS_DIR/discovering-requirements/SKILL.md" | md5 -q)
    [[ "$orig_content" == "$new_content" ]]

    # Cleanup
    rm -f "$PROJECT_ROOT/.loa.config.yaml"
}

@test "gate markers are not present in any skill files at rest" {
    # Without any config manipulation, skill files should be clean
    # (This tests that the repo state is correct)
    ! grep -q "GPT_REVIEW_GATE_START" "$TEST_DIR/discovering-requirements-SKILL.md.bak"
    ! grep -q "GPT_REVIEW_GATE_START" "$TEST_DIR/designing-architecture-SKILL.md.bak"
    ! grep -q "GPT_REVIEW_GATE_START" "$TEST_DIR/planning-sprints-SKILL.md.bak"
    ! grep -q "GPT_REVIEW_GATE_START" "$TEST_DIR/implementing-tasks-SKILL.md.bak"
}

@test "inject script removes gates when config missing" {
    # Setup: first add gates
    cp "$FIXTURES_DIR/configs/enabled.yaml" "$PROJECT_ROOT/.loa.config.yaml"
    "$INJECT_SCRIPT"

    # Verify gates exist
    grep -q "GPT_REVIEW_GATE_START" "$SKILLS_DIR/discovering-requirements/SKILL.md"

    # Remove config
    rm -f "$PROJECT_ROOT/.loa.config.yaml"
    run "$INJECT_SCRIPT"
    [[ "$status" -eq 0 ]]

    # Check gates were removed
    ! grep -q "GPT_REVIEW_GATE_START" "$SKILLS_DIR/discovering-requirements/SKILL.md"
}

@test "injected PRD gate has correct invocation" {
    cp "$FIXTURES_DIR/configs/enabled.yaml" "$PROJECT_ROOT/.loa.config.yaml"
    "$INJECT_SCRIPT"

    grep -q "gpt-review-api.sh prd" "$SKILLS_DIR/discovering-requirements/SKILL.md"

    rm -f "$PROJECT_ROOT/.loa.config.yaml"
}

@test "injected SDD gate has correct invocation" {
    cp "$FIXTURES_DIR/configs/enabled.yaml" "$PROJECT_ROOT/.loa.config.yaml"
    "$INJECT_SCRIPT"

    grep -q "gpt-review-api.sh sdd" "$SKILLS_DIR/designing-architecture/SKILL.md"

    rm -f "$PROJECT_ROOT/.loa.config.yaml"
}

@test "injected Sprint gate has correct invocation" {
    cp "$FIXTURES_DIR/configs/enabled.yaml" "$PROJECT_ROOT/.loa.config.yaml"
    "$INJECT_SCRIPT"

    grep -q "gpt-review-api.sh sprint" "$SKILLS_DIR/planning-sprints/SKILL.md"

    rm -f "$PROJECT_ROOT/.loa.config.yaml"
}

@test "injected Code gate has correct invocation" {
    cp "$FIXTURES_DIR/configs/enabled.yaml" "$PROJECT_ROOT/.loa.config.yaml"
    "$INJECT_SCRIPT"

    grep -q "gpt-review-api.sh code" "$SKILLS_DIR/implementing-tasks/SKILL.md"

    rm -f "$PROJECT_ROOT/.loa.config.yaml"
}

@test "inject is idempotent - running twice doesn't duplicate gates" {
    cp "$FIXTURES_DIR/configs/enabled.yaml" "$PROJECT_ROOT/.loa.config.yaml"

    # Run twice
    "$INJECT_SCRIPT"
    "$INJECT_SCRIPT"

    # Count occurrences - should be exactly 1
    local count
    count=$(grep -c "GPT_REVIEW_GATE_START" "$SKILLS_DIR/discovering-requirements/SKILL.md")
    [[ "$count" -eq 1 ]]

    rm -f "$PROJECT_ROOT/.loa.config.yaml"
}

# =============================================================================
# SessionStart hook configuration tests
# =============================================================================

@test "inject script is registered in SessionStart hook" {
    grep -q "inject-gpt-review-gates.sh" "$PROJECT_ROOT/.claude/settings.json"
}

@test "toggle script is registered in SessionStart hook" {
    grep -q "toggle-gpt-review-context.sh" "$PROJECT_ROOT/.claude/settings.json"
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

@test "/toggle-gpt-review command definition exists" {
    [[ -f "$PROJECT_ROOT/.claude/commands/toggle-gpt-review.md" ]]
}

@test "PostToolUse hook for code files exists" {
    grep -q "auto-gpt-review-hook.sh" "$PROJECT_ROOT/.claude/settings.json"
}
