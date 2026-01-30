# SDD: Autonomous Agent Skill

**Project:** Loa Autonomous Agent Orchestrator  
**Author:** Legba  
**Date:** 2026-01-30  
**PRD:** [prd.md](prd.md)  
**Status:** Draft

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTONOMOUS AGENT ORCHESTRATOR                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │   PREFLIGHT  │───▶│   DISCOVER   │───▶│   DESIGN     │───▶│ IMPLEMENT │ │
│  │   Phase 0    │    │   Phase 1    │    │   Phase 2    │    │  Phase 3  │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └─────┬─────┘ │
│                                                                     │       │
│                                                                     ▼       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │   LEARNING   │◀───│    DEPLOY    │◀───│    SUBMIT    │◀───│   AUDIT   │ │
│  │   Phase 7    │    │   Phase 6    │    │   Phase 5    │    │  Phase 4  │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └─────┬─────┘ │
│                                                                     │       │
│                           ┌─────────────────────────────────────────┘       │
│                           │                                                  │
│                           ▼                                                  │
│                    ┌─────────────┐                                           │
│                    │  REMEDIATE  │──── Loop until PASS ────┐                │
│                    │  (if fail)  │                         │                │
│                    └─────────────┘◀────────────────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Skill Structure

```
.claude/skills/autonomous-agent/
├── index.yaml              # Skill metadata and config
├── SKILL.md                # Core orchestration logic
└── resources/
    ├── phase-checklist.md  # Phase completion criteria
    ├── quality-gates.md    # Gate definitions and thresholds
    └── templates/
        ├── trajectory-entry.jsonl
        └── escalation-report.md
```

### 2. Skill Metadata (index.yaml)

```yaml
name: autonomous-agent
description: Meta-orchestrator for exhaustive loa process compliance
version: 1.0.0
author: Legba
command: /autonomous

context: fork  # Isolated context for long-running work

config:
  audit_threshold: 4  # Minimum score (out of 5)
  max_remediation_loops: 3
  require_human_deploy_approval: true
  attention_budget:
    single_search: 2000
    accumulated: 5000
    session_total: 15000

dependencies:
  - riding-codebase
  - discovering-requirements
  - designing-architecture
  - planning-sprints
  - implementing-tasks
  - auditing-security
  - deploying-infrastructure
  - continuous-learning

zones:
  system:
    path: .claude
    permission: none
  state:
    paths: [grimoires/loa, grimoires/*, .beads]
    permission: read-write
  app:
    paths: [src, lib, app]
    permission: read-write  # Needs write for implementation
```

### 3. Phase Definitions

#### Phase 0: Preflight

```markdown
## Phase 0: Preflight

### Inputs
- NOTES.md (if exists)
- WORKLEDGER.md
- Previous trajectory logs

### Actions
1. Load session continuity from NOTES.md
2. Check for unresolved blockers
3. Verify System Zone integrity
4. Initialize attention budget tracker
5. Load work item from WORKLEDGER.md

### Outputs
- Restored context
- Work item selected
- Trajectory entry logged

### Exit Criteria
- [ ] NOTES.md read (or created if missing)
- [ ] No blocking issues
- [ ] System Zone verified
- [ ] Work item identified
```

#### Phase 1: Discovery

```markdown
## Phase 1: Discovery

### Trigger
- New work item without existing PRD
- OR explicit /discover requested

### Actions
1. Run /ride if codebase not yet analyzed
2. Run /discover (discovering-requirements)
3. Generate PRD at grimoires/{project}/prd.md

### Quality Gate
- PRD completeness check
- All sections filled
- Source citations present

### Exit Criteria
- [ ] PRD exists and is complete
- [ ] Stakeholder requirements captured
- [ ] Technical constraints documented
```

#### Phase 2: Design

```markdown
## Phase 2: Design

### Inputs
- PRD from Phase 1

### Actions
1. Run /architect (designing-architecture)
2. Run /sprint-plan (planning-sprints)
3. Generate SDD and sprint.md

### Quality Gate
- SDD traces to PRD requirements
- Sprint tasks are atomic and testable

### Exit Criteria
- [ ] SDD exists with architecture diagrams
- [ ] Sprint tasks defined
- [ ] Dependencies identified
```

#### Phase 3: Implementation

```markdown
## Phase 3: Implementation

### Inputs
- SDD and sprint.md from Phase 2

### Actions
1. For each sprint task:
   a. Run /implement
   b. Apply Tool Result Clearing
   c. Log progress to trajectory
2. Run tests
3. Commit changes

### Quality Gate
- All tests pass
- Code follows style guidelines
- No security vulnerabilities introduced

### Exit Criteria
- [ ] All sprint tasks complete
- [ ] Tests passing
- [ ] Changes committed (not pushed)
```

#### Phase 4: Audit (MANDATORY)

```markdown
## Phase 4: Audit

### Inputs
- Implementation from Phase 3

### Actions
1. Run /audit (auditing-security)
2. Score all dimensions
3. Generate audit-report.md

### Quality Gate
- ALL dimension scores ≥ audit_threshold (default: 4/5)

### Exit Criteria
- [ ] Audit complete
- [ ] All scores ≥ threshold
- [ ] OR escalated after max remediation loops
```

#### Phase 4.5: Remediation Loop

```markdown
## Phase 4.5: Remediation

### Trigger
- Any audit dimension score < threshold

### Actions
1. Parse audit findings
2. Prioritize: CRITICAL > HIGH > MEDIUM
3. For each finding:
   a. Understand root cause
   b. Apply fix
   c. Verify fix locally
4. Re-run /audit
5. Repeat until pass OR max_loops reached

### Escalation
If loops >= max_remediation_loops:
1. Generate escalation-report.md
2. Notify human
3. HALT autonomous execution

### Exit Criteria
- [ ] All scores ≥ threshold
- [ ] OR escalation triggered
```

#### Phase 5: Submission

```markdown
## Phase 5: Submission

### Trigger
- Phase 4 audit PASSED

### Actions
1. Push branch to fork
2. Create PR with:
   - Summary from PRD
   - Changes from sprint
   - Link to audit-report.md
   - Trajectory summary
3. Log PR URL

### Exit Criteria
- [ ] Branch pushed
- [ ] PR created
- [ ] Audit report linked
```

#### Phase 6: Deployment

```markdown
## Phase 6: Deployment

### Trigger
- PR merged (detected via polling/webhook)
- AND require_human_deploy_approval == false
- OR explicit deploy approval received

### Actions
1. Run /deploy-production
2. Run /audit-deploy
3. Verify production state

### Quality Gate
- Deployment health checks pass
- No error rate increase
- Performance within bounds

### Rollback Trigger
- audit-deploy fails
- Error rate > threshold
- Performance degraded

### Exit Criteria
- [ ] Deployed successfully
- [ ] audit-deploy passed
- [ ] OR rollback executed
```

#### Phase 7: Learning

```markdown
## Phase 7: Learning

### Trigger
- After Phase 5 (PR submitted)
- OR after Phase 6 (deployed)

### Actions
1. Extract learnings:
   - What worked well
   - What failed/needed remediation
   - New patterns discovered
2. Update NOTES.md with learnings
3. If significant, update MEMORY.md
4. Feed to /continuous-learning
5. Archive trajectory

### Exit Criteria
- [ ] Learnings documented
- [ ] Trajectory archived
- [ ] Ready for next work item
```

---

## State Management

### Trajectory Log Schema

```typescript
interface TrajectoryEntry {
  ts: string;                    // ISO 8601 timestamp
  agent: "autonomous-agent";
  phase: 0 | 1 | 2 | 3 | 4 | 4.5 | 5 | 6 | 7;
  action: string;                // Verb describing action
  skill?: string;                // Invoked skill (if any)
  input?: object;                // Sanitized input
  output?: object;               // Sanitized output
  tokens_used?: number;
  attention_budget_remaining?: number;
  audit_score?: Record<string, number>;
  remediation_loop?: number;
  status: "started" | "completed" | "failed" | "escalated";
}
```

### Checkpoint Files

```
grimoires/{project}/
├── prd.md           # Phase 1 output
├── sdd.md           # Phase 2 output  
├── sprint.md        # Phase 2 output
├── audit-report.md  # Phase 4 output
├── escalation.md    # Phase 4.5 output (if needed)
└── trajectory/
    └── {date}.jsonl # Full audit trail
```

---

## Error Handling

| Error | Response |
|-------|----------|
| Skill invocation fails | Retry once, then log and continue if non-critical |
| Audit threshold not met | Enter remediation loop |
| Max remediation exceeded | Escalate to human |
| Token budget exceeded | Apply aggressive TRC, continue |
| Session budget exceeded | Checkpoint and yield |

---

## Security Considerations

- Never expose secrets in trajectory logs
- Sanitize all inputs/outputs before logging
- Respect System Zone (never modify `.claude/`)
- PR credentials handled by git credential helper

---

## Testing Strategy

1. **Unit Tests**: Each phase in isolation
2. **Integration Tests**: Full workflow with mock skills
3. **E2E Tests**: Real execution on test repo

---

*SDD prepared by Legba 🚪 following loa designing-architecture process*
