# SDD: Memory Recency Weighting

**Project:** Clawdbot Memory Enhancement  
**Author:** Legba  
**Date:** 2026-01-31  
**PRD:** [prd.md](prd.md)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Memory Search Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Query ──▶ Embed ──▶ Vector Search ──┐                      │
│                                       │                      │
│                      Keyword Search ──┼──▶ Hybrid Merge     │
│                                       │         │            │
│                                       │         ▼            │
│                           [NEW] ──────┴──▶ Recency Weight   │
│                                             │                │
│                                             ▼                │
│                                        Final Results         │
└─────────────────────────────────────────────────────────────┘
```

## File Changes

### 1. `src/memory/memory-schema.ts`

Add `createdAt` to chunk metadata:

```typescript
// BEFORE
export interface MemoryChunk {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  embedding: number[];
}

// AFTER
export interface MemoryChunk {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  embedding: number[];
  createdAt: number;  // Unix timestamp (ms)
}
```

### 2. `src/memory/sync-memory-files.ts`

Track file mtime during sync:

```typescript
// In syncFile() function
const stats = await fs.stat(filePath);
const createdAt = stats.mtimeMs;

// Pass to chunk creation
chunks.forEach(chunk => {
  chunk.createdAt = createdAt;
});
```

### 3. `src/memory/hybrid.ts`

Add recency calculation and apply in merge:

```typescript
// NEW: Recency weight calculation
export function calculateRecencyWeight(
  createdAtMs: number,
  halfLifeDays: number = 30,
  floor: number = 0.1
): number {
  const ageMs = Date.now() - createdAtMs;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const decay = Math.exp(-ageDays / halfLifeDays);
  return Math.max(floor, decay);
}

// MODIFY: mergeHybridResults()
export function mergeHybridResults(params: {
  vector: HybridVectorResult[];
  keyword: HybridKeywordResult[];
  vectorWeight: number;
  textWeight: number;
  recencyHalfLifeDays?: number;  // NEW
  recencyFloor?: number;         // NEW
}): Array<{...}> {
  
  // ... existing merge logic ...
  
  // Apply recency weight
  const halfLife = params.recencyHalfLifeDays ?? 30;
  const floor = params.recencyFloor ?? 0.1;
  
  for (const entry of byId.values()) {
    const hybridScore = entry.vectorScore * params.vectorWeight 
                      + entry.textScore * params.textWeight;
    
    const recencyWeight = calculateRecencyWeight(
      entry.createdAt, 
      halfLife, 
      floor
    );
    
    entry.finalScore = hybridScore * recencyWeight;
  }
  
  // Sort by finalScore
  return [...byId.values()]
    .sort((a, b) => b.finalScore - a.finalScore)
    .map(r => ({...}));
}
```

### 4. `src/memory/manager.ts`

Pass config to merge function:

```typescript
// In search() method
const results = mergeHybridResults({
  vector: vectorResults,
  keyword: keywordResults,
  vectorWeight: this.config.vectorWeight ?? 0.7,
  textWeight: this.config.textWeight ?? 0.3,
  recencyHalfLifeDays: this.config.recencyHalfLifeDays,  // NEW
  recencyFloor: this.config.recencyFloor,                 // NEW
});
```

### 5. Config Schema

Add to memory config options:

```typescript
interface MemoryConfig {
  // ... existing ...
  recencyHalfLifeDays?: number;  // default: 30
  recencyFloor?: number;         // default: 0.1
}
```

## Database Migration

Add `created_at` column to chunks table:

```sql
ALTER TABLE memory_chunks 
ADD COLUMN created_at INTEGER DEFAULT 0;

-- Backfill existing chunks with current time
UPDATE memory_chunks 
SET created_at = strftime('%s', 'now') * 1000 
WHERE created_at = 0;
```

## Test Plan

### Unit Tests

```typescript
describe('calculateRecencyWeight', () => {
  it('returns 1.0 for brand new memory', () => {
    expect(calculateRecencyWeight(Date.now())).toBeCloseTo(1.0);
  });
  
  it('returns ~0.5 at half-life', () => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    expect(calculateRecencyWeight(thirtyDaysAgo, 30)).toBeCloseTo(0.5, 1);
  });
  
  it('respects floor for very old memories', () => {
    const yearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    expect(calculateRecencyWeight(yearAgo, 30, 0.1)).toBe(0.1);
  });
});

describe('mergeHybridResults with recency', () => {
  it('ranks recent memory higher than old with same relevance', () => {
    // ... test implementation
  });
});
```

### Integration Tests

1. Index memory files with known dates
2. Search and verify recent files rank higher
3. Verify old files still appear (above floor)
4. Verify performance within latency budget

## Rollout Plan

1. **Feature flag**: `MEMORY_RECENCY_ENABLED=true`
2. **Default off** in first release
3. **Opt-in** via config
4. **Default on** after validation period

## Risks

| Risk | Mitigation |
|------|------------|
| Migration fails | Graceful fallback to `createdAt = 0` (no recency) |
| Performance regression | Benchmark before/after, simple math only |
| Unexpected ranking changes | Feature flag for rollback |

---

*Designed by Legba 🚪 for Clawdbot contribution*
