# Feedback Protocol - Issue #48 Implementation

Defines how the autonomous-agent reports learnings upstream to Loa.

## Feedback Schema

```yaml
# grimoires/loa/feedback/{date}.yaml
metadata:
  agent: autonomous-agent
  operator: ai
  session: {session_id}
  timestamp: {ISO8601}

learnings:
  - id: L-{timestamp}-001
    type: gap | friction | pattern | improvement
    target: loa | clawdbot | registry | skill:{name}
    severity: low | medium | high | critical
    
    description: "Short description of the learning"
    
    evidence:
      - file: "path/to/file.ts"
        line: 45
        quote: "Exact text that demonstrates the issue"
      - observation: "What was observed during execution"
    
    context:
      phase: implementation
      skill: implementing-tasks
      work_item: W-004
      
    proposed_action: "What should be done"
    
    resolution:
      status: open | pr_submitted | merged | wontfix
      pr: "#123"
      
  - id: L-{timestamp}-002
    # ... more learnings
```

## Learning Types

| Type | Description | Example |
|------|-------------|---------|
| `gap` | Missing capability | "No recency weighting in memory search" |
| `friction` | Existing feature is awkward | "Audit threshold too strict for docs" |
| `pattern` | Recurring situation | "Always need to clear TRC after grep" |
| `improvement` | Enhancement idea | "Could batch similar searches" |

## Target Classification

| Target | When to Use |
|--------|-------------|
| `loa` | Core framework issue |
| `clawdbot` | Platform-specific issue |
| `registry` | Package/distribution issue |
| `skill:{name}` | Specific skill issue |

## Capture Points

Learnings are captured at these points in the autonomous flow:

### Phase 4.5: Remediation
```yaml
# When audit fails and needs fixing
- id: L-001
  type: friction
  target: skill:auditing-security
  description: "Audit dimension X consistently fails on docs-only changes"
  context:
    phase: quality
    remediation_loop: 2
```

### Phase 7: Learning
```yaml
# End-of-cycle reflection
- id: L-002
  type: pattern
  target: loa
  description: "Implementation always reveals gaps in PRD"
  proposed_action: "Auto-invoke /refine-prd after implementation"
```

### On Escalation
```yaml
# When max remediation loops exceeded
- id: L-003
  type: gap
  severity: high
  target: skill:auditing-security
  description: "Cannot remediate security finding X with current capabilities"
```

## Upstream Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FEEDBACK FLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Autonomous Agent]                                          │
│        │                                                     │
│        ▼                                                     │
│  grimoires/loa/feedback/{date}.yaml                         │
│        │                                                     │
│        ▼                                                     │
│  [Aggregator] ─── patterns ──▶ [Mother Construct]           │
│        │                              │                      │
│        │                              ▼                      │
│        │                     Issue/PR to Loa                 │
│        │                                                     │
│        └─── skill-specific ──▶ [Child Constructs]           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Integration with Trajectory

Feedback entries are also logged to trajectory for traceability:

```jsonl
{"ts":"...","agent":"autonomous-agent","phase":7,"action":"feedback_captured","learning_id":"L-001","type":"gap","target":"clawdbot"}
```

## Aggregation

When multiple agents generate similar feedback:

```yaml
# Aggregated pattern (detected by Loa)
pattern:
  id: P-001
  occurrences: 5
  agents: [legba, other-agent]
  common_learning:
    type: friction
    target: skill:auditing-security
    description: "Audit threshold 4/5 too strict"
  recommendation: "Add configurable threshold per change type"
```
