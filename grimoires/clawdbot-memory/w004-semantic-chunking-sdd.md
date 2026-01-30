# SDD: Semantic Memory Chunking

**Project:** Clawdbot Memory Enhancement  
**Author:** Legba  
**Date:** 2026-01-31  
**PRD:** [w004-semantic-chunking-prd.md](w004-semantic-chunking-prd.md)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MEMORY INDEXING FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Memory File ──▶ [Markdown Parser] ──▶ [Section Extractor]                 │
│                          │                      │                            │
│                          ▼                      ▼                            │
│                    Parse AST             Section Tree                        │
│                                                │                             │
│                                                ▼                             │
│                                    [Semantic Chunker] ◀── Config             │
│                                          │                                   │
│                                          ▼                                   │
│                                   Semantic Chunks                            │
│                                          │                                   │
│                                          ▼                                   │
│                                    [Embedder] ──▶ Vector Store               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## File Changes

### 1. New File: `src/memory/semantic-chunker.ts`

```typescript
/**
 * Semantic chunking for markdown memory files.
 * Respects heading boundaries, code blocks, and paragraph structure.
 */

export interface SemanticChunkOptions {
  maxTokens: number;      // Default: 600
  minTokens: number;      // Default: 50
  includeHeadingContext: boolean;  // Default: true
}

export interface Section {
  heading: string;
  level: number;
  content: string;
  startLine: number;
  endLine: number;
  contentType: 'prose' | 'list' | 'code' | 'table' | 'mixed';
}

export interface SemanticChunk {
  content: string;
  startLine: number;
  endLine: number;
  headingBreadcrumb: string[];
  contentType: Section['contentType'];
  isComplete: boolean;
}

/**
 * Parse markdown into sections based on headings.
 */
export function parseMarkdownSections(markdown: string): Section[];

/**
 * Chunk sections respecting semantic boundaries.
 */
export function chunkSections(
  sections: Section[],
  options: SemanticChunkOptions
): SemanticChunk[];

/**
 * Main entry point - chunk markdown semantically.
 */
export function semanticChunk(
  markdown: string,
  options?: Partial<SemanticChunkOptions>
): SemanticChunk[];
```

### 2. Modify: `src/memory/sync-memory-files.ts`

```typescript
// BEFORE: Fixed-size chunking
import { chunkByTokens } from './chunking.js';

// AFTER: Semantic chunking with fallback
import { semanticChunk } from './semantic-chunker.js';
import { chunkByTokens } from './chunking.js';

async function processFile(filePath: string, content: string) {
  const config = this.config;
  
  // Use semantic chunking if enabled (default: true)
  const chunks = config.useSemanticChunking !== false
    ? semanticChunk(content, {
        maxTokens: config.chunkMaxTokens ?? 600,
        minTokens: config.chunkMinTokens ?? 50,
        includeHeadingContext: config.includeHeadingContext ?? true,
      })
    : chunkByTokens(content, config.chunkSize ?? 400, config.chunkOverlap ?? 80);
  
  // ... rest of processing
}
```

### 3. Modify: `src/memory/memory-schema.ts`

```typescript
// Add semantic metadata to chunk schema
export interface MemoryChunk {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  embedding: number[];
  createdAt: number;
  // NEW: Semantic metadata
  headingBreadcrumb?: string[];
  contentType?: 'prose' | 'list' | 'code' | 'table' | 'mixed';
  isComplete?: boolean;
}
```

### 4. Config Schema Update

```typescript
interface MemoryConfig {
  // ... existing ...
  
  // Chunking options
  useSemanticChunking?: boolean;  // Default: true
  chunkMaxTokens?: number;        // Default: 600
  chunkMinTokens?: number;        // Default: 50
  includeHeadingContext?: boolean; // Default: true
}
```

---

## Implementation Details

### Markdown Parsing Strategy

Use regex-based parsing (lightweight, no dependencies):

```typescript
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/gm;
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const LIST_REGEX = /^(\s*[-*+]|\s*\d+\.)\s+/gm;
const TABLE_REGEX = /^\|.+\|$/gm;

function detectContentType(content: string): Section['contentType'] {
  if (CODE_BLOCK_REGEX.test(content)) return 'code';
  if (TABLE_REGEX.test(content)) return 'table';
  if (LIST_REGEX.test(content)) return 'list';
  return 'prose';
}
```

### Section Extraction Algorithm

```typescript
function parseMarkdownSections(markdown: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let headingStack: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.endLine = i - 1;
        sections.push(currentSection);
      }
      
      // Update heading stack
      const level = headingMatch[1].length;
      headingStack = headingStack.slice(0, level - 1);
      headingStack.push(headingMatch[2]);
      
      // Start new section
      currentSection = {
        heading: headingMatch[2],
        level,
        content: '',
        startLine: i,
        endLine: i,
        contentType: 'prose',
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }
  
  // Don't forget last section
  if (currentSection) {
    currentSection.endLine = lines.length - 1;
    currentSection.contentType = detectContentType(currentSection.content);
    sections.push(currentSection);
  }
  
  return sections;
}
```

### Chunking Algorithm

```typescript
function chunkSections(
  sections: Section[],
  options: SemanticChunkOptions
): SemanticChunk[] {
  const chunks: SemanticChunk[] = [];
  const headingStack: string[] = [];
  
  for (const section of sections) {
    // Maintain heading breadcrumb
    headingStack.length = section.level - 1;
    headingStack.push(section.heading);
    
    const fullContent = options.includeHeadingContext
      ? `${'#'.repeat(section.level)} ${section.heading}\n\n${section.content}`
      : section.content;
    
    const tokenCount = estimateTokens(fullContent);
    
    if (tokenCount <= options.maxTokens) {
      // Section fits in one chunk
      chunks.push({
        content: fullContent,
        startLine: section.startLine,
        endLine: section.endLine,
        headingBreadcrumb: [...headingStack],
        contentType: section.contentType,
        isComplete: true,
      });
    } else {
      // Need to split - do it at paragraph boundaries
      const subChunks = splitAtParagraphs(section, options, headingStack);
      chunks.push(...subChunks);
    }
  }
  
  // Filter out tiny chunks
  return chunks.filter(c => estimateTokens(c.content) >= options.minTokens);
}

function splitAtParagraphs(
  section: Section,
  options: SemanticChunkOptions,
  headingStack: string[]
): SemanticChunk[] {
  const paragraphs = section.content.split(/\n\n+/);
  const chunks: SemanticChunk[] = [];
  let buffer = '';
  let startLine = section.startLine + 1; // After heading
  
  const headingPrefix = options.includeHeadingContext
    ? `${'#'.repeat(section.level)} ${section.heading}\n\n`
    : '';
  
  for (const para of paragraphs) {
    const withPara = buffer + (buffer ? '\n\n' : '') + para;
    const fullContent = headingPrefix + withPara;
    
    if (estimateTokens(fullContent) > options.maxTokens && buffer) {
      // Current buffer is full, save it
      chunks.push({
        content: headingPrefix + buffer,
        startLine,
        endLine: startLine + buffer.split('\n').length,
        headingBreadcrumb: [...headingStack],
        contentType: section.contentType,
        isComplete: false, // Split chunk
      });
      buffer = para;
      startLine += buffer.split('\n').length;
    } else {
      buffer = withPara;
    }
  }
  
  // Last chunk
  if (buffer) {
    chunks.push({
      content: headingPrefix + buffer,
      startLine,
      endLine: section.endLine,
      headingBreadcrumb: [...headingStack],
      contentType: section.contentType,
      isComplete: chunks.length === 0, // Complete if only chunk
    });
  }
  
  return chunks;
}
```

### Token Estimation

```typescript
function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}
```

---

## Test Plan

### Unit Tests

```typescript
describe('parseMarkdownSections', () => {
  it('extracts sections from simple markdown', () => {
    const md = `# Title\nContent\n## Section\nMore content`;
    const sections = parseMarkdownSections(md);
    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe('Title');
    expect(sections[1].heading).toBe('Section');
  });
  
  it('detects content types correctly', () => {
    const codeSection = '# Code\n```js\nconst x = 1;\n```';
    const sections = parseMarkdownSections(codeSection);
    expect(sections[0].contentType).toBe('code');
  });
});

describe('semanticChunk', () => {
  it('keeps small sections as single chunks', () => {
    const md = `# Short\nThis is brief.`;
    const chunks = semanticChunk(md);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].isComplete).toBe(true);
  });
  
  it('splits large sections at paragraphs', () => {
    const md = `# Long\n${'Word '.repeat(200)}\n\n${'More '.repeat(200)}`;
    const chunks = semanticChunk(md, { maxTokens: 300 });
    expect(chunks.length).toBeGreaterThan(1);
  });
  
  it('maintains heading breadcrumb', () => {
    const md = `# Main\n## Sub\nContent`;
    const chunks = semanticChunk(md);
    const subChunk = chunks.find(c => c.content.includes('Content'));
    expect(subChunk?.headingBreadcrumb).toEqual(['Main', 'Sub']);
  });
});
```

---

## Migration Strategy

1. **Phase 1**: Add semantic chunker alongside existing
2. **Phase 2**: Enable by default for new indexes
3. **Phase 3**: Background re-index option for existing memories

No breaking changes - old chunks remain valid.

---

*SDD prepared by Legba 🚪*
