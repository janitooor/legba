# Structured Notes - Issue #23 Implementation

Defines how the autonomous-agent creates and manages structured notes.

## Note Format

When synthesizing tool results or capturing observations:

```yaml
# grimoires/loa/notes/NOTE-{id}.md
---
id: NOTE-{timestamp}-{seq}
created: {ISO8601}
agent: autonomous-agent
context:
  phase: {current_phase}
  skill: {active_skill}
  work_item: {work_item_id}
  file: {current_file}  # if applicable
  
type: observation | synthesis | decision | blocker | question
priority: low | medium | high | critical
status: active | addressed | expired | dismissed

relates_to:
  - NOTE-{other_id}
  - GAP-{id}
  
expiry:
  check_after: {date}  # Review after this date
  auto_expire_days: {days}  # Auto-dismiss after N days
---

{note_content}
```

## Note Types

| Type | Purpose | Default Expiry |
|------|---------|----------------|
| `observation` | Something noticed during work | 14 days |
| `synthesis` | TRC summary of search results | 7 days |
| `decision` | Choice made and rationale | Never |
| `blocker` | Something preventing progress | Until resolved |
| `question` | Needs human input | 7 days |

## TRC Integration

When Tool Result Clearing synthesizes to notes:

```yaml
---
id: NOTE-20260130-001
type: synthesis
context:
  phase: implementation
  skill: implementing-tasks
source: tool-result-clearing
expiry:
  auto_expire_days: 7  # TRC notes are transient
---

## Search: "JWT validation entry points"

**Results**: 47 files found, 3 high-signal

**Key Files**:
- `/src/auth/jwt.ts:45-67` - Primary validation logic
- `/src/auth/middleware.ts:12-35` - Request interception

**Patterns Found**: JWT validated via async function, middleware applies globally

**Ready for**: Implementation of token refresh
```

## Decision Notes

When making significant choices:

```yaml
---
id: NOTE-20260130-002
type: decision
priority: high
status: active
expiry:
  check_after: null  # Decisions don't expire
---

## Decision: Use exponential decay for recency weighting

**Context**: Implementing memory recency (W-002)

**Options Considered**:
1. Linear decay - Simple but harsh on old content
2. Exponential decay - Smooth, configurable half-life
3. Step function - Abrupt, hard to tune

**Choice**: Exponential decay with configurable half-life

**Rationale**:
- Mathematically elegant
- Single parameter to tune (half-life)
- Floor ensures old content still retrievable

**Reversibility**: Easy to change formula later
```

## Auto-Cleanup Rules

Notes are automatically managed:

```yaml
# .loa.config.yaml
notes:
  auto_cleanup:
    enabled: true
    
    # Synthesis notes expire quickly
    synthesis:
      expire_after_days: 7
      
    # Observations need review
    observation:
      check_after_days: 14
      expire_after_days: 30
      
    # Decisions never auto-expire
    decision:
      expire_after_days: null
      
    # Blockers persist until resolved
    blocker:
      expire_after_days: null
      require_resolution: true
```

## Viability Check

During heartbeat or session start:

```markdown
1. Load notes with `check_after < today`
2. For each note:
   - Still relevant? → Update check_after
   - Addressed? → Mark as addressed
   - Stale? → Mark as expired
3. Archive expired notes to `notes/archive/`
```

## Note Relationships

Notes can relate to each other:

```yaml
---
id: NOTE-003
relates_to:
  - NOTE-001  # Earlier observation
  - NOTE-002  # Related decision
  - GAP-001   # Connected gap
---

Same root cause as NOTE-001 - the auth flow lacks proper error handling.
Decision in NOTE-002 to use exponential retry should address this.
```

## Integration with Trajectory

Note creation logged:

```jsonl
{"ts":"...","agent":"autonomous-agent","action":"note_created","note_id":"NOTE-003","type":"observation"}
{"ts":"...","agent":"autonomous-agent","action":"note_expired","note_id":"NOTE-001","reason":"auto_expire"}
```

## Multiplayer Support

For team collaboration (future):

```yaml
---
id: NOTE-004
visibility: team  # personal | team | public
mentions:
  - @zkSoju  # Notify this person
assignee: @legba
---

Need input on auth flow design. @zkSoju thoughts on OAuth vs JWT?
```
