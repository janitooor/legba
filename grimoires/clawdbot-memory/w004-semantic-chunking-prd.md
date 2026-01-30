# PRD: Semantic Memory Chunking

**Project:** Clawdbot Memory Enhancement  
**Author:** Legba  
**Date:** 2026-01-31  
**Status:** Draft  
**Related:** W-002 (Memory Recency Weighting)

---

## Problem Statement

Clawdbot's memory system uses fixed-size chunking (~400 tokens with 80 overlap). This approach:
- Splits content at arbitrary points, breaking semantic coherence
- May separate a heading from its content
- Loses section-level context in retrieval
- Returns partial thoughts instead of complete ideas

**User Impact:** Search returns fragments rather than coherent sections. Agent must piece together context from multiple chunks.

## Goals

1. Chunks should align with semantic boundaries (headings, paragraphs)
2. Each chunk should be a complete, coherent thought
3. Retrieval should return meaningful context, not fragments
4. No regression in indexing performance

## Non-Goals

- Changing embedding model (separate concern)
- Multi-modal chunking (images, code) - future work
- Cross-file semantic linking - future work

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Chunk coherence | Unknown | 90%+ chunks are complete thoughts |
| Context relevance | Unknown | Reduced "continue reading" needs |
| Indexing time | Baseline | <10% regression |
| Storage overhead | Baseline | <20% increase |

---

## Analysis

### Current Chunking (sync-memory-files.ts)

```typescript
// Current: Fixed-size with overlap
const CHUNK_SIZE = 400;  // tokens
const CHUNK_OVERLAP = 80; // tokens

function chunkContent(content: string): Chunk[] {
  // Split by token count, ignore semantics
  // May split mid-sentence or mid-section
}
```

### Problems

1. **Heading Separation**
   ```markdown
   # Important Decision        <- Chunk 1 ends here
   We decided to use...        <- Chunk 2 starts here
   ```

2. **Mid-Sentence Splits**
   ```
   "The authentication system uses JWT tokens for" <- Chunk 1
   "session management and OAuth2 for external"   <- Chunk 2
   ```

3. **Lost Context**
   - Chunks don't know their parent section
   - No heading breadcrumb in chunk metadata

---

## Proposed Solution

### Semantic Chunking Strategy

```
1. Parse markdown structure (headings, lists, paragraphs)
2. Identify semantic boundaries
3. Chunk by section, respecting size limits
4. Preserve heading context in metadata
```

### Chunking Rules

| Content Type | Strategy |
|--------------|----------|
| Heading + Content | Keep together if <600 tokens |
| Long section | Split at paragraph boundaries |
| List items | Keep list together if <400 tokens |
| Code blocks | Never split code blocks |
| Tables | Never split tables |

### Metadata Enhancement

```typescript
interface SemanticChunk {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  embedding: number[];
  createdAt: number;
  // NEW: Semantic metadata
  headingBreadcrumb: string[];  // ["# Main", "## Section", "### Subsection"]
  contentType: 'prose' | 'list' | 'code' | 'table';
  isComplete: boolean;  // True if chunk is a complete thought
}
```

### Algorithm

```typescript
function semanticChunk(markdown: string): SemanticChunk[] {
  const ast = parseMarkdown(markdown);
  const sections = extractSections(ast);
  const chunks: SemanticChunk[] = [];
  
  for (const section of sections) {
    if (tokenCount(section) <= MAX_CHUNK_TOKENS) {
      // Section fits in one chunk
      chunks.push(createChunk(section));
    } else {
      // Split at paragraph boundaries
      const paragraphs = splitParagraphs(section);
      let buffer = section.heading;
      
      for (const para of paragraphs) {
        if (tokenCount(buffer + para) > MAX_CHUNK_TOKENS) {
          chunks.push(createChunk(buffer));
          buffer = section.heading + para; // Include heading for context
        } else {
          buffer += para;
        }
      }
      if (buffer) chunks.push(createChunk(buffer));
    }
  }
  
  return chunks;
}
```

---

## Technical Requirements

### 1. Markdown Parser

Need lightweight AST parser for:
- Heading detection (levels 1-6)
- Paragraph boundaries
- List detection
- Code block detection
- Table detection

Options:
- `marked` (parse only, no render)
- `remark` (full AST)
- Custom regex-based (lightweight)

### 2. Section Extraction

```typescript
interface Section {
  heading: string;
  level: number;
  content: string;
  startLine: number;
  endLine: number;
  children: Section[];
}
```

### 3. Chunk Size Tuning

| Parameter | Current | Proposed |
|-----------|---------|----------|
| Max chunk tokens | 400 | 600 (more flexibility) |
| Min chunk tokens | - | 50 (avoid tiny chunks) |
| Overlap | 80 | 0 (semantic boundaries replace overlap) |

### 4. Migration

- Existing chunks remain valid
- Re-indexing optional (triggered by config change)
- Backward compatible (old chunks work)

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Larger chunks → more tokens | Medium | Medium | Tune max size, monitor costs |
| Parser edge cases | Medium | Low | Fallback to fixed chunking |
| Re-index time | Low | Medium | Incremental, background |

---

## Open Questions

1. Should we re-index all memories or only new ones?
2. What's the right max chunk size? (400 → 600 proposed)
3. Should heading breadcrumb be included in embedding text?

---

## Next Steps

1. `/architect` - Design the chunking module
2. `/sprint-plan` - Break into tasks
3. `/implement` - Build and test
4. `/audit` - Verify quality
5. PR to Clawdbot

---

*PRD prepared by Legba 🚪*
