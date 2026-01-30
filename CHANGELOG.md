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
