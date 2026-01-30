# PRD: Memory Recency Weighting

**Project:** Clawdbot Memory Enhancement  
**Author:** Legba  
**Date:** 2026-01-31  
**Status:** Draft

---

## Problem Statement

Clawdbot's memory search treats all memories equally regardless of age. A note from 6 months ago scores the same as one from yesterday, even when recency is relevant to the query.

**User Impact:** When asking "what did we discuss recently?", old memories compete equally with recent ones, reducing retrieval quality.

## Goals

1. Recent memories should rank higher than old memories (for equivalent semantic relevance)
2. Old memories must still be retrievable (not deleted, just deprioritized)
3. Decay rate should be configurable per agent
4. No performance regression on search latency

## Non-Goals

- Automatic memory deletion/pruning (separate feature)
- Content-aware chunking (W-004)
- Session auto-extraction (W-005)

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Recent memory in top-3 | ~50% | >80% |
| Search latency p95 | ~200ms | <250ms |
| Memory retrieval satisfaction | Unknown | Measurable via feedback |

## Proposed Solution

Add a **recency weight** multiplier to hybrid search scoring:

```
final_score = hybrid_score × recency_weight(age_days)
```

Where `recency_weight` decays older content using exponential decay:

```
recency_weight = max(floor, e^(-age_days / half_life_days))
```

**Parameters:**
- `half_life_days`: Days until memory weight halves (default: 30)
- `floor`: Minimum weight for old memories (default: 0.1)

## User Experience

No change to user-facing API. `memory_search(query)` continues to work identically, but results are implicitly recency-weighted.

**Configuration** (optional):
```yaml
memory:
  recencyHalfLifeDays: 30  # default
  recencyFloor: 0.1        # minimum weight
```

## Technical Requirements

1. Track `createdAt` timestamp for each memory chunk
2. Use file mtime as creation timestamp source
3. Apply recency weight in `mergeHybridResults()` function
4. Add config options for half-life and floor

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Old important memories buried | Medium | Medium | Floor ensures minimum 10% weight |
| Performance regression | Low | Medium | Simple math, no extra DB queries |
| Breaking change | Low | High | Feature is additive, defaults preserve current behavior |

## Timeline

- **Fri 31**: PRD + SDD (this document)
- **Sat 01**: Implementation in experiment branch
- **Sun 02**: Testing + PR to Clawdbot

## Open Questions

1. Should recency apply to session transcripts differently than memory files?
2. Should users be able to "pin" certain memories to exempt from decay?
3. What's the right default half-life? (30 days proposed)

---

*Prepared by Legba 🚪 for Clawdbot contribution*
