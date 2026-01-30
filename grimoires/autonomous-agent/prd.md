# PRD: Autonomous Agent Skill

**Project:** Loa Autonomous Agent Orchestrator  
**Author:** Legba  
**Date:** 2026-01-30  
**Status:** Draft  
**Stakeholder:** Jani (@janitooor)

---

## Executive Summary

Create a meta-orchestration skill that enables agents to work autonomously with the same rigor and discernment as a human expert. The skill ensures exhaustive compliance with all loa processes, mandatory quality gates, self-auditing, and continuous improvement.

## Problem Statement

Current autonomous agent work may:
- Skip loa process steps
- Submit PRs without thorough auditing
- Lack remediation loops for quality issues
- Miss deployment verification
- Fail to maintain structured memory across sessions

**User Impact:** PRs may be substandard. Work quality inconsistent. Trust in autonomous agents eroded.

## Goals

| Goal | Success Metric |
|------|----------------|
| Exhaustive loa compliance | 100% of skills invoked in correct order |
| Quality parity with human | Audit scores ≥4/5 on all dimensions |
| Zero-defect PRs | No PR rejected for quality issues |
| Full traceability | Complete trajectory log for every action |
| Continuous improvement | Learnings fed back after each cycle |

## Non-Goals

- Replacing human oversight (daily cost review remains)
- Autonomous deployment to production without approval
- Working outside the approved target repos

---

## Requirements

### FR-1: Exhaustive Process Orchestration

The skill MUST invoke loa skills in this exact sequence:

```
Phase 0: PREFLIGHT
├── Read NOTES.md (session continuity)
├── Check blockers
├── Verify System Zone integrity
└── Load attention budget state

Phase 1: DISCOVERY (if new work)
├── /ride (codebase grounding)
├── /discover (requirements gathering)
└── Output: grimoires/{project}/prd.md

Phase 2: DESIGN
├── /architect (system design)
├── /plan (sprint planning)
└── Output: grimoires/{project}/sdd.md, sprint.md

Phase 3: IMPLEMENTATION
├── /implement (code changes)
├── Apply Tool Result Clearing throughout
└── Output: Code changes, tests

Phase 4: QUALITY GATES (MANDATORY)
├── /audit (comprehensive audit)
├── IF audit_score < 4/5:
│   ├── /remedy (fix issues)
│   └── GOTO /audit (re-audit)
├── REPEAT until audit_score ≥ 4/5
└── Output: audit-report.md with PASS

Phase 5: SUBMISSION
├── Create PR with full context
├── Link audit report
└── Output: PR URL

Phase 6: DEPLOYMENT (if approved)
├── /deploy-production
├── /audit-deploy (verify deployment)
└── Output: deployment verification

Phase 7: LEARNING
├── Extract learnings to NOTES.md
├── Update MEMORY.md if significant
├── Feed back to continuous-learning
└── Output: Updated knowledge base
```

### FR-2: Mandatory Quality Gates

NO external action (PR, deploy) without passing audit:

| Gate | Trigger | Pass Criteria |
|------|---------|---------------|
| Pre-PR | Before PR creation | Audit score ≥4/5 all categories |
| Pre-Deploy | Before deployment | Audit-deploy passes |
| Post-Deploy | After deployment | Production verification |

### FR-3: Remediation Loops

```
WHILE audit_score < threshold:
    findings = analyze_audit_failures()
    FOR finding IN findings:
        IF finding.severity IN [CRITICAL, HIGH]:
            apply_fix(finding)
    re_run_audit()
    IF iterations > MAX_REMEDIATION_LOOPS:
        HALT_AND_ESCALATE()
```

**MAX_REMEDIATION_LOOPS:** 3 (escalate to human after 3 failed attempts)

### FR-4: Attention Budget Compliance

Every phase MUST:
- Track token usage
- Apply Tool Result Clearing at thresholds
- Log to trajectory
- Decay old context per Semantic Decay Protocol

### FR-5: Factual Grounding

Every claim MUST:
- Have `file:line` citation
- Be verifiable against source
- Flag assumptions with `[ASSUMPTION]`

### FR-6: Structured Memory

Maintain across sessions:
- `NOTES.md` - Session continuity, blockers, decisions
- `MEMORY.md` - Long-term learnings (main session only)
- `trajectory/*.jsonl` - Full audit trail

### FR-7: Trajectory Logging

Log every significant action:
```jsonl
{"ts":"ISO8601","agent":"autonomous-agent","phase":"N","action":"verb","input":"...","output":"...","tokens":N}
```

---

## User Stories

### US-1: Autonomous Sprint Execution
**As** an autonomous agent  
**I want** to execute a full sprint with quality gates  
**So that** my work matches human-level quality

**Acceptance Criteria:**
- All loa phases executed in order
- Audit passes before PR
- Full trajectory logged

### US-2: Self-Remediation
**As** an autonomous agent  
**I want** to automatically fix audit failures  
**So that** PRs are always high quality

**Acceptance Criteria:**
- Audit failures trigger remediation
- Re-audit after fixes
- Escalate after 3 attempts

### US-3: Deployment Verification
**As** an autonomous agent  
**I want** to verify deployments  
**So that** production issues are caught immediately

**Acceptance Criteria:**
- audit-deploy runs after deploy
- Failures trigger rollback recommendation
- Verification logged

---

## Technical Constraints

- MUST run within Clawdbot execution environment
- MUST respect token/cost budgets
- MUST NOT modify System Zone (`.claude/`)
- MUST use existing loa skills (no reimplementation)

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| All loa skills | ✅ Available | invoke via /command |
| Claude CLI | ✅ Available | For skill invocation |
| Trajectory logging | ✅ Implemented | In most skills |
| Audit skill | ✅ Available | auditing-security |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Infinite remediation loop | Medium | High | MAX_LOOPS = 3, then escalate |
| Token budget exhaustion | Medium | Medium | Attention budget tracking |
| Audit too strict | Low | Medium | Configurable thresholds |

---

## Open Questions

1. Should deployment require explicit human approval, or can audit-pass auto-deploy?
2. What's the right audit threshold? (Proposed: 4/5)
3. How to handle partial failures (some files pass, some don't)?

---

## Next Steps

1. `/architect` - Create SDD with detailed design
2. `/sprint-plan` - Break into implementable tasks
3. `/implement` - Build the skill
4. `/audit` - Self-audit before PR

---

*PRD prepared by Legba 🚪 following loa discovering-requirements process*
