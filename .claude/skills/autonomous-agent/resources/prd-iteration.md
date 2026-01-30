# PRD Iteration Loop - Issue #29 Implementation

Defines how the autonomous-agent iterates on PRD after sprint completion.

## Problem

Linear flow (PRD → SDD → Sprint → Done) doesn't account for:
- Implementation revealing new requirements
- Edge cases not in original PRD
- Better approaches discovered during work

## Solution: Phase 7 PRD Check

After completing a work item, Phase 7 (Learning) includes a PRD iteration check:

```
Phase 7: Learning
├── 7.1 Extract learnings
├── 7.2 Update memory
├── 7.3 Archive trajectory
├── 7.4 PRD Iteration Check (NEW)
│   ├── Did implementation reveal gaps?
│   ├── Are there unmet requirements?
│   └── Should /refine-prd be invoked?
└── 7.5 Prepare next work item
```

## PRD Iteration Check

### Trigger Conditions

| Condition | Action |
|-----------|--------|
| Audit findings mention "missing requirement" | Flag for PRD review |
| Implementation added unplanned features | Flag for PRD update |
| Remediation required >2 loops | Analyze root cause |
| User feedback during work | Capture for PRD |

### Check Process

```markdown
1. Parse trajectory for implementation deviations
2. Compare delivered vs PRD requirements
3. Identify:
   - Gaps: Requirements not fully met
   - Additions: Features not in PRD
   - Discoveries: Better approaches found
4. Decide: Iterate or proceed?
```

### Decision Tree

```
                    ┌─────────────────┐
                    │ PRD Check       │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         [No gaps]    [Minor gaps]    [Major gaps]
              │              │              │
              ▼              ▼              ▼
          Proceed      Log to       Invoke /refine-prd
          to next      NOTES.md     or escalate
          work item    for future
```

## /refine-prd Integration

When major gaps detected, invoke PRD refinement:

```yaml
# Phase 7.4 PRD Iteration
prd_iteration:
  enabled: true
  
  # When to trigger automatic refinement
  auto_refine_triggers:
    - implementation_revealed_gaps: true
    - audit_found_missing_requirements: true
    - remediation_loops_exceeded: 2
    
  # What /refine-prd should do
  refinement_scope:
    - read_existing: grimoires/{project}/prd.md
    - read_implementation: src/**/*
    - read_trajectory: grimoires/{project}/trajectory/*.jsonl
    - preserve_architecture: grimoires/{project}/sdd.md
    
  # Output
  output:
    type: delta  # Don't rewrite, add revision
    format: |
      ## PRD Revision {version} - {date}
      
      ### Gaps Addressed
      - {gap_description}
      
      ### New Requirements
      - {new_requirement}
      
      ### Rationale
      {why_this_change}
```

## Structured Gap Capture

During implementation, capture gaps in structured format:

```yaml
# grimoires/{project}/gaps.yaml
gaps:
  - id: GAP-001
    discovered_during: implementation
    sprint_task: task-3
    description: "PRD said 'add auth' but didn't specify OAuth vs JWT"
    resolution: "Implemented JWT, should document in PRD"
    
  - id: GAP-002
    discovered_during: audit
    finding_id: SEC-003
    description: "PRD missing rate limiting requirement"
    resolution: "Added rate limiting, PRD needs update"
```

## Integration Points

### With Trajectory

```jsonl
{"ts":"...","phase":7,"action":"prd_check","gaps_found":2,"decision":"refine"}
{"ts":"...","phase":7,"action":"prd_refine_invoked","gaps":["GAP-001","GAP-002"]}
```

### With Feedback Protocol

Gaps also flow upstream:

```yaml
learnings:
  - id: L-PRD-001
    type: pattern
    target: loa
    description: "Implementation consistently reveals auth-related gaps"
    proposed_action: "PRD template should have auth checklist"
```

### With NOTES.md

Minor gaps logged for future:

```markdown
## PRD Gaps (for next iteration)

- [ ] GAP-001: OAuth vs JWT not specified - resolved with JWT
- [ ] GAP-002: Rate limiting missing - added during impl
```

## Exit Criteria

Phase 7 PRD check complete when:
- [ ] Gaps identified and classified
- [ ] Major gaps: /refine-prd invoked OR escalated
- [ ] Minor gaps: Logged to NOTES.md
- [ ] Feedback captured for upstream
