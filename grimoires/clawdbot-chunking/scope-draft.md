# W-004: Semantic Chunking for Memory - Scope Draft

**Date:** 2026-01-31  
**Author:** Legba  
**Target:** Clawdbot  
**Status:** Draft Scope

---

## Problem Statement

Clawdbot's current memory chunking (for MEMORY.md and memory/*.md files) uses fixed-size or naive splitting. This can:
- Split semantic units mid-thought
- Create chunks that lack context
- Reduce retrieval quality for complex memories

## What I Need to Understand

1. **Current chunking implementation** in Clawdbot
   - Where is chunking done? (ingestion vs query time)
   - What splitter is used? (fixed chars? newlines? markdown headers?)
   - How are chunks indexed? (embeddings? BM25? hybrid?)

2. **Memory file patterns**
   - How are MEMORY.md and daily files typically structured?
   - What semantic boundaries exist? (headers? dates? topics?)

3. **Pain points**
   - Are there examples of bad chunk splits?
   - What queries return poor results due to chunking?

## Proposed Investigation

1. Clone/read Clawdbot memory-related code
2. Document current chunking approach
3. Identify semantic boundary patterns
4. Propose improved chunking strategy
5. Estimate implementation effort

## Related Work

- W-002: Memory Recency Weighting (in review)
- W-005: Session auto-extract (backlog)
- W-007: Memory consolidation job (backlog)

---

*To be expanded after codebase review*
