# W-003: Tool Result Clearing - Scope Assessment

**Date:** 2026-02-03  
**Author:** Legba  
**Target:** loa framework

---

## Protocol Summary

Tool Result Clearing (TRC) prevents context window exhaustion by:
1. Extracting high-signal findings from large search results
2. Synthesizing to NOTES.md with file:line references
3. Clearing raw results from working memory
4. Using semantic decay over time (Active → Decayed → Archived)

## Current State Analysis

### What Exists (v1.0)

| Component | Status | Location |
|-----------|--------|----------|
| Protocol spec | ✅ Complete | `.claude/protocols/tool-result-clearing.md` |
| Attention thresholds | ✅ Defined | 2K/5K/15K tokens |
| 4-step clearing | ✅ Documented | Extract → Synthesize → Clear → Summary |
| Semantic decay | ✅ Documented | Active/Decayed/Archived stages |
| JIT rehydration | ✅ Documented | Path-based retrieval |

### What's Missing

| Gap | Impact | Priority |
|-----|--------|----------|
| No automated enforcement | Agents may ignore thresholds | High |
| No token counting helper | Estimates are rough | Medium |
| No trajectory schema validation | JSONL may be inconsistent | Medium |
| No skill integration | Protocol not embedded in skills | High |
| No test suite | Can't verify compliance | Medium |

## Improvement Opportunities

### 1. Skill Integration (High Priority)

**Problem:** TRC is a standalone protocol. Skills don't reference it.

**Solution:** Add `<attention_budget>` section to skills that use search:
```markdown
## Attention Budget

This skill follows the Tool Result Clearing Protocol.

**Thresholds:**
- Single search: 2,000 tokens max
- Accumulated: 5,000 tokens
- Session total: 15,000 tokens

**Required behavior:**
1. After any search >20 results, apply TRC 4-step clearing
2. Log cleared results to trajectory as per protocol
```

**Skills to update:**
- `auditing-security/SKILL.md` (heavy search use)
- `discovering-requirements/SKILL.md` (discovery searches)
- `riding-codebase/SKILL.md` (codebase analysis)
- `implementing-tasks/SKILL.md` (code search)

### 2. Token Counter Helper (Medium Priority)

**Problem:** Token estimation is rough (chars/4).

**Solution:** Add helper script or recommend tokenizer:
```bash
# scripts/token-count.sh
#!/bin/bash
# Accurate token count using tiktoken
echo "$1" | python3 -c "
import sys, tiktoken
enc = tiktoken.get_encoding('cl100k_base')
print(len(enc.encode(sys.stdin.read())))
"
```

### 3. Trajectory Schema (Medium Priority)

**Problem:** JSONL format is ad-hoc.

**Solution:** Define formal schema:
```typescript
interface TrajectoryEntry {
  ts: string;           // ISO 8601
  agent: string;        // Skill/agent name
  phase: 'search' | 'extract' | 'synthesize' | 'clear' | 'decay' | 'rehydrate' | 'archive';
  tokensBefore?: number;
  tokensAfter?: number;
  filesFound?: number;
  filesKept?: number;
  summary: string;
  paths?: string[];
}
```

### 4. Compliance Checks (Medium Priority)

**Problem:** No way to verify agents follow TRC.

**Solution:** Add audit checklist:
```markdown
## TRC Compliance Checklist

- [ ] Search results under 2K tokens OR clearing applied
- [ ] High-signal findings ≤10 files
- [ ] Each finding ≤20 words
- [ ] NOTES.md updated with synthesis
- [ ] Trajectory entry logged
- [ ] Raw results cleared (not in subsequent context)
```

## Proposed Deliverables

### Phase 1: Skill Integration (Tue 04)
- Add `<attention_budget>` to 4 high-search skills
- Reference TRC protocol in each
- Create compliance checklist template

### Phase 2: Tooling (Future)
- Token counter helper script
- Trajectory schema definition
- Validation script for JSONL

## Effort Estimate

| Phase | Effort | Risk |
|-------|--------|------|
| Skill integration | 2-3 hours | Low |
| Token counter | 1 hour | Low |
| Trajectory schema | 1 hour | Low |
| Compliance audit | 2 hours | Medium |

## Recommendation

**Start with Phase 1:** Skill integration is highest impact with lowest risk. Embeds TRC into daily agent workflows.

---

*Scope assessment by Legba 🚪*
