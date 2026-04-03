---
name: deep-research
description: Comprehensive research skill for conducting deep searches on any topic with academic-style citations. Performs multi-step research with web search, deep content fetching for each source, and comprehensive synthesis with proper source attribution.
version: "2.1.0"
---

# Deep Research Skill - Academic Research Guide

Conduct thorough, multi-step research on any topic with deep analysis of each source and academic-style citations.

## Quick Start

```
@deep-research Research [topic]
```

The agent will:
1. Search for sources
2. Fetch and analyze EACH source individually
3. Create detailed notes for each source with SOURCE_IDs
4. Synthesize findings with proper citations
5. Generate comprehensive report with References section

## When to Use

Use this skill when you need:
- **Deep research** on a topic (not just quick answers)
- **Multiple source analysis** with detailed extraction
- **Comprehensive reports** with academic citations
- **Background research** for documents or decisions
- **Thorough understanding** of a subject with proper attribution

## How It Works

### Phase 1: Search (Step 1)
- Search for 10 relevant sources
- Analyze and score by relevance
- Select 3-5 most relevant for deep dive

### Phase 2: Deep Content Fetching (Steps 2-6)
**For EACH selected source:**
1. Fetch full content using webfetch
2. Assign unique SOURCE_ID (e.g., OpenAI2024, Microsoft2025)
3. Extract key information
4. Create detailed note with:
   - Main points
   - Data/statistics (with SOURCE_ID)
   - Quotes (with SOURCE_ID and page number)
   - Unique insights
   - Analysis

### Phase 3: Synthesis (Step 7)
- Compare findings across sources
- Identify patterns and consensus (with SOURCE_IDs)
- Note conflicts and gaps
- Use academic citation format

### Phase 4: Final Report (Step 8)
- Generate comprehensive report
- Include all findings with in-text citations
- Provide References section
- Academic writing style

## Session Structure

Research is saved to: `sessions/[research-topic]/`

```
sessions/
└── [topic]/
    ├── 01-search-results.md      # Initial search
    ├── 02-source-1.md            # Deep analysis with SOURCE_ID
    ├── 03-source-2.md            # Deep analysis with SOURCE_ID
    ├── 04-source-3.md            # Deep analysis with SOURCE_ID
    ├── 05-source-4.md            # Deep analysis with SOURCE_ID
    ├── 06-source-5.md            # Deep analysis with SOURCE_ID
    ├── 07-synthesis.md           # Cross-reference with citations
    └── 08-final-report.md        # Final report with References
```

## Source Note Format (Academic Style)

Each source gets a detailed note with academic citations:

```markdown
---
title: "[Source Name] - Deep Analysis"
source: "[Full URL]"
source-id: "[SOURCE_ID]"
research-step: [step number]
source-type: [article/documentation/blog/paper]
author: [Author/Organization]
publication-date: [Date]
relevance: [High/Medium/Low]
---

# [Source Title]

## Source Information
- **URL:** [full URL]
- **Source ID:** [SOURCE_ID]
- **Type:** [type]
- **Author/Organization:** [Author]
- **Publication Date:** [Date]
- **Relevance:** High/Medium/Low
- **Why selected:** [explanation]

## Key Findings

### Main Points
- [Point 1 - detailed]
- [Point 2 - detailed]
- [Point 3 - detailed]

### Data & Statistics
- [Stat 1]: [value and context] [SOURCE_ID]
- [Stat 2]: [value and context] [SOURCE_ID]
- [Stat 3]: [value and context] [SOURCE_ID]

### Unique Insights
- [Insight 1]
- [Insight 2]

### Direct Quotes (Academic Style)

> "[Important quote 1]"
> 
> — [SOURCE_ID], p. [page number]
> 
> **Context:** [why this matters]

> "[Important quote 2]"
> 
> — [SOURCE_ID], p. [page number]
> 
> **Context:** [why this matters]

## Related Resources
- [Resource 1]: [description]
- [Resource 2]: [description]

## Source Analysis
**Reliability:** High/Medium/Low - Why
**Bias:** [Any potential bias]
**Value:** [What it contributes]

## Key Takeaways
- [Takeaway 1]
- [Takeaway 2]
```

## Citation System (Academic Style)

### SOURCE_ID Format
Create unique ID for each source:
- Format: `[Author/Organization][Year]`
- Examples:
  - `OpenAI2024` for OpenAI articles from 2024
  - `Microsoft2025` for Microsoft research from 2025
  - `ArXiv2024` for ArXiv papers from 2024
  - `LangChain2024` for LangChain documentation

### Citation Examples

**Quote Citation:**
```
> "This is an important quote about the topic."
> 
> — OpenAI2024, p. 15
```

**Statistic Citation:**
```
- Key finding: 85% of researchers agree [LangChain2024]
- Market growth: 300% in 2024 [Microsoft2025]
```

**In-text Citation:**
```
According to OpenAI2024, "the future of AI is..." (p. 23). 
This aligns with Microsoft2025's findings.
```

## Final Report Format (Academic Style)

```markdown
# [Topic] - Comprehensive Research Report

## Research Overview
- **Topic:** [topic]
- **Sources Analyzed:** [number]
- **Date:** [date]
- **Research Method:** Deep multi-source analysis

## Executive Summary
[2-3 sentences summarizing key findings]

## Background
[Context needed to understand the topic]

## Key Findings

### Finding 1: [Title]
[Detailed explanation]

According to [SOURCE_ID], "[quote]" (p. [page]). 
This suggests that [analysis].

### Finding 2: [Title]
[Detailed explanation]

As stated in [SOURCE_ID], "[quote]" (p. [page]). 
This indicates [analysis].

## Cross-Source Analysis

### Consensus Points
- [Point 1] ([SOURCE_ID1], [SOURCE_ID2], [SOURCE_ID3])
- [Point 2] ([SOURCE_ID1], [SOURCE_ID2])

### Conflicting Viewpoints
- [Viewpoint 1]: [SOURCE_ID1] argues "[quote]" while [SOURCE_ID2] contends "[quote]"

### Unique Contributions
- [SOURCE_ID1]: Unique contribution to [aspect]
- [SOURCE_ID2]: Novel perspective on [aspect]

## Source Comparison
| Source ID | Type | Key Contribution | Reliability |
|-----------|------|------------------|-------------|
| [SOURCE_ID] | [type] | [contribution] | High/Med/Low |

## Gaps & Limitations
- [Information not found]
- [Potential biases]
- [Areas needing more research]

## Conclusions
[Synthesized conclusions with citations]

## References

### Bibliography
1. [SOURCE_ID1]: [Full citation information]
2. [SOURCE_ID2]: [Full citation information]
3. [SOURCE_ID3]: [Full citation information]

### Citation Format
- In-text: [SOURCE_ID], p. [page number]
- Quotes: Direct quotes with page numbers
- Paraphrases: Source attribution with page numbers

---
*Research completed with academic-style citations*
*All quotes and statistics are attributed to their sources*
```

## Examples

### Example 1: Technology Research
```
@deep-research Research quantum computing applications in 2025
```
Result: 5 sources with SOURCE_IDs, detailed notes, comprehensive report with References

### Example 2: Historical Research
```
@deep-research Research the fall of the Roman Empire
```
Result: 5 sources with SOURCE_IDs, detailed notes, comprehensive report with References

### Example 3: Market Research
```
@deep-research Research the EV market trends and competitors
```
Result: 5 sources with SOURCE_IDs, detailed notes, comprehensive report with References

## Best Practices

1. **Assign SOURCE_ID immediately** - Create unique ID for each source
2. **Cite every quote** - Include SOURCE_ID and page number
3. **Cite every statistic** - Include SOURCE_ID attribution
4. **Use academic format** - Follow citation style throughout
5. **Create References section** - List all sources with SOURCE_IDs
6. **Let agent complete all steps** - Don't interrupt
7. **Each source gets detailed note** - This is mandatory

## What Makes This "Academic"

✅ **Academic Research:**
- Each source has unique SOURCE_ID
- All quotes include SOURCE_ID and page number
- All statistics include SOURCE_ID attribution
- In-text citations throughout
- References section with all sources
- Proper academic writing style
- Cross-source analysis with citations

❌ **Not Academic:**
- No SOURCE_IDs
- Quotes without attribution
- Statistics without sources
- No References section
- Informal writing style
- No proper citations

## Workflow Checklist

Before finishing, verify:
- [ ] Step 1: Search completed
- [ ] Step 2-6: Each source has SOURCE_ID assigned
- [ ] Step 2-6: All quotes include SOURCE_ID and page number
- [ ] Step 2-6: All statistics include SOURCE_ID
- [ ] Step 7: Synthesis uses SOURCE_IDs for citations
- [ ] Step 8: Final report has in-text citations
- [ ] Step 8: References section includes all SOURCE_IDs
- [ ] All notes follow academic citation format

## Notes

- **The key to academic research**: Proper source attribution throughout
- **SOURCE_ID is essential**: Use it consistently in all citations
- **Every quote needs attribution**: SOURCE_ID and page number
- **Every statistic needs attribution**: SOURCE_ID reference
- **References section is mandatory**: List all sources with SOURCE_IDs
- **Academic style matters**: Professional writing and citations