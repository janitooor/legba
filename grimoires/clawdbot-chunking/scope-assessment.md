# W-004: Semantic Chunking for Memory - Scope Assessment

**Date:** 2026-01-31  
**Author:** Legba  
**Target:** Clawdbot  
**Status:** Scoped

---

## Current State Analysis

### What Exists (v1.0)

| Component | Location | Status |
|-----------|----------|--------|
| Chunking config | `memory-search.ts:L54-55` | ✅ Configurable |
| Chunking logic | `internal.ts:L175-236` | ⚠️ Naive implementation |
| Default tokens | 400 (≈1600 chars) | ✅ Reasonable size |
| Default overlap | 80 (≈320 chars) | ✅ Some context preserved |

### Current `chunkMarkdown()` Algorithm

```typescript
// internal.ts:L175-236
function chunkMarkdown(content, chunking) {
  const maxChars = Math.max(32, chunking.tokens * 4);
  const overlapChars = Math.max(0, chunking.overlap * 4);
  
  // Simply splits on newlines until maxChars reached
  // Long lines get split arbitrarily
  // No awareness of:
  //   - Markdown headers (##, ###)
  //   - Code blocks (```)
  //   - Date patterns (## 2026-01-31)
  //   - Paragraph boundaries
}
```

### Problems Identified

| Problem | Impact | Example |
|---------|--------|---------|
| Mid-paragraph splits | Loses semantic context | "I decided to..." // chunk boundary // "...use Redis" |
| No header awareness | Topics get mixed | Header A content + Header B content in same chunk |
| Code block splits | Broken code snippets | Function split at arbitrary line |
| Date entry splits | Daily notes fragmented | Date header separated from content |
| Long lines split arbitrarily | Random breaks | Line >1600 chars split mid-word |

### Memory File Patterns (Observed)

Typical `MEMORY.md` structure:
```markdown
# MEMORY.md - Long-term Memory

## Preferences
- Jani prefers X
- Default to Y

## Projects
### Project A
Details about A...

### Project B  
Details about B...

## Decisions
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-30 | Used Redis | Performance needs |
```

Typical `memory/YYYY-MM-DD.md` structure:
```markdown
# 2026-01-31

## Morning standup
- Discussed X
- Decided Y

## Research: Topic
Found that...

## Code: Feature
```typescript
// Implementation notes
```
```

## Proposed Solution

### Semantic Chunking Strategy

Replace naive character-based chunking with structure-aware chunking:

```typescript
function chunkMarkdownSemantic(content, config) {
  // 1. Parse markdown into blocks
  const blocks = parseMarkdownBlocks(content);
  
  // 2. Group blocks by semantic boundaries
  // - Headers define section starts
  // - Code blocks are atomic
  // - Tables are atomic
  // - Paragraphs are atomic
  
  // 3. Combine small blocks until maxTokens
  // - Never split a code block
  // - Prefer breaking at headers
  // - Keep related content together
  
  // 4. Apply overlap at semantic boundaries
  // - Include previous header in overlap
  // - Don't split overlap mid-sentence
}
```

### Boundary Priorities

| Priority | Boundary Type | Split? |
|----------|---------------|--------|
| 1 | Markdown headers (##) | Yes - strong |
| 2 | Horizontal rules (---) | Yes - strong |
| 3 | Empty lines (paragraphs) | Yes - medium |
| 4 | List boundaries | Yes - weak |
| 5 | Code block end | Yes - weak |
| 6 | Sentence end (. ! ?) | Fallback |
| 7 | Mid-sentence | Never (prefer overflow) |

### Configuration Additions

```yaml
memory:
  chunking:
    tokens: 400        # existing
    overlap: 80        # existing
    # New options:
    semantic: true     # Enable semantic chunking (default: true)
    preserveHeaders: true  # Include parent header in each chunk
    minChunkTokens: 50     # Minimum chunk size
```

## Implementation Plan

### Phase 1: Block Parser (2-3 hours)

Create `parseMarkdownBlocks()` that identifies:
- Headers (with level)
- Code blocks (with language)
- Tables
- Paragraphs
- Lists

Output: Array of `{ type, content, line, level? }`

### Phase 2: Semantic Chunker (3-4 hours)

Implement `chunkMarkdownSemantic()`:
1. Use block parser output
2. Combine blocks respecting boundaries
3. Apply smart overlap (include context)
4. Return chunks with `startLine`, `endLine`, `text`, `hash`

### Phase 3: Integration (1-2 hours)

- Add config options
- Make semantic chunking default
- Maintain backward compatibility (config flag)
- Add tests

### Phase 4: Testing (2-3 hours)

- Unit tests for block parser
- Integration tests for chunker
- Regression tests on real MEMORY.md files
- Performance benchmarks

## Effort Estimate

| Phase | Effort | Risk |
|-------|--------|------|
| Block Parser | 2-3 hours | Low |
| Semantic Chunker | 3-4 hours | Medium |
| Integration | 1-2 hours | Low |
| Testing | 2-3 hours | Low |
| **Total** | **8-12 hours** | Medium |

## Success Criteria

1. ✅ Code blocks never split mid-block
2. ✅ Headers always start new chunks (or lead chunks)
3. ✅ Paragraphs stay intact unless too large
4. ✅ No performance regression (< 10% slower)
5. ✅ Backward compatible with config flag
6. ✅ Tests pass on real memory files

## Dependencies

- None (internal refactor)

## Related Work

- W-002: Memory Recency Weighting (in review) - will use improved chunks
- W-005: Session auto-extract - will benefit from semantic boundaries
- W-007: Memory consolidation - will work better with structured chunks

---

## Code References

| File | Line | Function |
|------|------|----------|
| `src/memory/internal.ts` | 175-236 | `chunkMarkdown()` |
| `src/agents/memory-search.ts` | 54-55 | `chunking` config defaults |
| `src/memory/manager.ts` | - | Uses `chunkMarkdown()` |

---

*Scope assessment by Legba 🚪*
