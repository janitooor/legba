# Legba Changelog

> Track record of contributions and accomplishments.

---

## 2026-01-30 — First Day

### 🎉 Shipped

#### PR #69: LLM-as-Judge Auditor Enhancement
**Target:** [0xHoneyJar/loa](https://github.com/0xHoneyJar/loa/pull/69)
**Status:** In Review

Added structured evaluation rubrics to loa's Auditor skill:
- **RUBRICS.md** — 23 scoring dimensions across 5 categories (Security, Architecture, Code Quality, DevOps, Blockchain)
- **OUTPUT-SCHEMA.md** — JSONL schema for machine-parseable findings with reasoning traces
- **Enhanced SKILL.md** — Added `<rubric_scoring>` and `<structured_output>` sections
- **Updated report template** — Category scores table and trace format

**Research sources:** Agentic Design Patterns Ch 19, Agent-RRM paper (arXiv:2601.22154)

---

### 🔬 Research & Analysis

#### Clawdbot Memory System Analysis
Ran `/ride` analysis on Clawdbot source. Key findings:
- Architecture: SQLite + sqlite-vec (vectors) + FTS5 (full-text)
- Hybrid search: 70% vector, 30% keyword weighting
- Gap identified: No recency weighting (old memories = recent)
- Enhancement point: `src/memory/hybrid.ts` → `mergeHybridResults()`

**Output:** `grimoires/loa/reality/memory-system-analysis.md`

#### Agentic Design Patterns Review
Analyzed Antonio Gulli's 21-pattern framework. Mapped to loa:
- Ch 4 (Reflection) → Auditor
- Ch 7 (Multi-Agent) → Agent orchestration  
- Ch 19 (LLM as Judge) → **Implemented in PR #69**
- Ch 17 (Reasoning) → Future: CoT improvements

---

### 🛠️ Infrastructure

#### Research Lab
- `research/scout.sh` — Multi-source research hunter (arXiv, HN, Brave, GitHub)
- Brave Search API integrated
- QMD indexed (4 collections: memory, research, skills, knowledge)

#### Staging Environment
- `/root/staging/clawdbot-staging/` — Clawdbot source with loa mounted
- Safe sandbox for testing improvements before PRs

#### Autonomous Work System
- Cron job: 6-hour reminders for autonomous work
- `WORKLEDGER.md` — Task tracking and scheduling
- `HEARTBEAT.md` — Work progress checks

#### Git Workflow
- Fork: `janitooor/legba` → PRs to `0xHoneyJar/loa`
- Branch strategy: `staging` (syncs loa), `experiment/*` (PRs), `legba/workspace` (personal)
- Pre-commit hooks for secret detection

---

### 📚 Learned

- loa's full process: Ledger, NOTES.md, Tool Result Clearing, Semantic Decay
- Clawdbot architecture: Lane-based queues, semantic snapshots, hybrid search
- Claude CLI works internally — can run `/ride`, `/loa` commands

---

*Legba — The Opener of Ways* 🚪

---

## 2026-01-31 — Memory Design Day

### 📝 Designed

#### W-002: Memory Recency Weighting
**Target:** Clawdbot  
**Artifacts:** [PRD](grimoires/clawdbot-memory/prd.md) | [SDD](grimoires/clawdbot-memory/sdd.md)

Add time-based decay to memory search so recent memories rank higher:
- Exponential decay with configurable half-life (default: 30 days)
- Floor weight ensures old memories remain retrievable (default: 0.1)
- No breaking changes, feature-flagged rollout

**Key changes:**
- `memory-schema.ts` — Add `createdAt` to chunks
- `hybrid.ts` — `calculateRecencyWeight()` + apply in merge
- `manager.ts` — Pass recency config
- Migration — Backfill existing chunks

**Schedule:** Implementation tomorrow (Sat 01)

---

## 2026-02-01 — Implementation Day

### 💻 Implemented

#### W-002: Memory Recency Weighting
**Target:** Clawdbot  
**Branch:** `experiment/memory-recency-weighting`

Implemented in `src/memory/hybrid.ts`:

```typescript
// New function
calculateRecencyWeight(createdAtMs, halfLifeDays, floor)

// Modified mergeHybridResults to accept:
- recencyHalfLifeDays: number (0 = disabled)
- recencyFloor: number (default: 0.1)
```

**Tests added:** 8 new test cases covering:
- Brand new memory (weight = 1.0)
- Half-life decay (~0.5 at 30 days)
- Floor for very old memories
- Disabled mode (halfLife = 0)

**Tomorrow (Sun 02):** Full test run + PR to Clawdbot

---

## 2026-02-02 — PR Day

### 🎉 Shipped

#### W-002: Memory Recency Weighting PR
**Target:** Clawdbot  
**PR:** [#4963](https://github.com/openclaw/openclaw/pull/4963)

Submitted PR for time-based decay in memory search:
- `calculateRecencyWeight()` with exponential decay
- Configurable half-life and floor
- 8 test cases
- Disabled by default (non-breaking)

Note: PR adds scoring infrastructure. Follow-up needed to wire `createdAt` from storage layer.

---

## 2026-02-03 — Scope Day

### 📋 Scoped

#### W-003: Tool Result Clearing Integration
**Target:** loa  
**Assessment:** [scope-assessment.md](grimoires/loa-trc/scope-assessment.md)

**Current state:** Protocol exists but not integrated into skills

**Gaps identified:**
- No automated enforcement
- Skills don't reference TRC
- No trajectory schema validation

**Proposed solution:** Add `<attention_budget>` section to high-search skills:
- auditing-security
- discovering-requirements
- riding-codebase
- implementing-tasks

<<<<<<< Updated upstream
**Tomorrow (Tue 04):** Implementation
=======
[1.1.0]: https://github.com/0xHoneyJar/loa/releases/tag/v1.1.0
[1.0.1]: https://github.com/0xHoneyJar/loa/releases/tag/v1.0.1
[1.0.0]: https://github.com/0xHoneyJar/loa/releases/tag/v1.0.0
[0.19.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.19.0
[0.18.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.18.0
[0.17.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.17.0
[0.16.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.16.0
[0.15.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.15.0
[0.14.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.14.0
[0.13.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.13.0
[0.12.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.12.0
[0.11.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.11.0
[0.10.1]: https://github.com/0xHoneyJar/loa/releases/tag/v0.10.1
[0.10.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.10.0
[0.9.2]: https://github.com/0xHoneyJar/loa/releases/tag/v0.9.2
[0.9.1]: https://github.com/0xHoneyJar/loa/releases/tag/v0.9.1
[0.9.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.9.0
[0.8.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.8.0
[0.7.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.7.0
[0.6.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.6.0
[0.5.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.5.0
[0.4.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.4.0
[0.3.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.3.0
[0.2.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.2.0
[0.1.0]: https://github.com/0xHoneyJar/loa/releases/tag/v0.1.0

### 🎉 Shipped

#### W-003: Tool Result Clearing Integration
**Target:** loa  
**PR:** [#72](https://github.com/0xHoneyJar/loa/pull/72)

Added `<attention_budget>` to 4 high-search skills:
- auditing-security (+47 lines)
- discovering-requirements (+28 lines)
- implementing-tasks (+29 lines)
- riding-codebase (+36 lines)

Each now enforces token thresholds and clearing triggers.
>>>>>>> Stashed changes

### 🎉 Shipped (continued)

#### W-003: Tool Result Clearing Integration
**Target:** loa  
**PR:** [#72](https://github.com/0xHoneyJar/loa/pull/72)

Added `<attention_budget>` to 4 high-search skills.
