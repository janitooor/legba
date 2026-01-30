# Legba Work Ledger

> Planned work, priorities, and schedule for autonomous improvement work.

## Standing Directive

> "Work on yourself, Clawdbot/moltbot, and loa. Submit PRs. Show what you can achieve autonomously."
> — Jani, 2026-01-30

---

## Active Work

| ID | Task | Target | Status | PR |
|----|------|--------|--------|-----|
| W-001 | LLM-as-Judge Auditor | loa | 🟡 In Review | [#69](https://github.com/0xHoneyJar/loa/pull/69) |
| W-002 | Memory Recency Weighting | Clawdbot | 🟢 Implemented | - |

---

## Backlog

| ID | Task | Target | Priority | Research Source |
|----|------|--------|----------|-----------------|
| W-003 | Tool Result Clearing integration | loa | High | loa protocols |
| W-004 | Semantic chunking for memory | Clawdbot | Medium | Architecture analysis |
| W-005 | Session auto-extract | Clawdbot | Medium | Hesam thread |
| W-006 | Memory consolidation job | Clawdbot | Low | loa patterns |
| W-007 | BitNet local fallback | Clawdbot | Low | Microsoft BitNet |
| W-008 | Reflection loops (Ch 4) | loa | Medium | Agentic Design Patterns |
| W-009 | A2A handoffs (Ch 15) | loa | Low | Agentic Design Patterns |

---

## Work Schedule

### Daily Rhythm
- **Heartbeat checks**: Every 6 hours (cron)
- **Research scout**: 1x daily (morning UTC)
- **PR work**: Active items first
- **Backlog grooming**: After completing active work

### This Week (2026-01-30 → 02-05)

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Thu 30 | ✅ LLM-Judge PR | PR #69 submitted |
| Fri 31 | Memory recency design | PRD + SDD |
| Sat 01 | Memory implementation | Experiment branch |
| Sun 02 | Testing + PR | PR to Clawdbot |
| Mon 03 | Tool Result Clearing | Scope assessment |
| Tue 04 | TRC implementation | PR to loa |
| Wed 05 | Review + backlog | Plan next week |

---

## Completed

| ID | Task | Target | Completed | PR |
|----|------|--------|-----------|-----|
| - | Research lab setup | Self | 2026-01-30 | - |
| - | Staging environment | Self | 2026-01-30 | - |
| - | QMD indexing | Self | 2026-01-30 | - |
| - | Clawdbot /ride analysis | Research | 2026-01-30 | - |

---

## Notes

- PRs exclude CI files (`.github/workflows/`) - add warning in PR description
- Use loa process: PRD → SDD → Sprint → Implement → Audit → PR
- One experiment = One PR (clean, traceable)
- Test in staging before production PRs

---

*Last updated: 2026-02-01T06:00:00Z*
