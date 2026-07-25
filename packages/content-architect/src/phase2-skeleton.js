/**
 * Phase 2: Logical Skeleton Building
 *
 * Determines PPT structure: total pages, section divisions,
 * narrative flow (Cover → Agenda → Sections → Closing).
 */

const SECTION_PATTERNS = [
  // Order matters! More specific/business-pattern keywords FIRST.
  {
    id: "summary",
    keywords: [/总结|结论|展望|future|未来|回顾|结束语/i],
    defaultTitle: "总结与展望",
  },
  {
    id: "value",
    keywords: [/成效|收益|投资|回报|roi|预期目标|预计总投资|投资回收期/i],
    defaultTitle: "预期成效",
  },
  {
    id: "solution",
    keywords: [/方案|对策|策略|路径|举措|三步走|建设方案|数字化建设方案/i],
    defaultTitle: "解决方案",
  },
  {
    id: "implementation",
    keywords: [/实施|roadmap|plan|执行|行动|推进项目|项目部署|支持|保障|资金|人才/i],
    defaultTitle: "实施计划",
  },
  {
    id: "analysis",
    keywords: [/分析|洞察|insight|finding|调研|数据发现|主要痛点/i],
    defaultTitle: "分析与洞察",
  },
  {
    id: "problem",
    keywords: [/问题|挑战|痛点|gap|challenge|pain|困难|瓶颈|困境/i],
    defaultTitle: "问题与挑战",
  },
  {
    id: "background",
    keywords: [/背景|现状|overview|background|intro|概述|介绍|发展|历史|环境|持续推进|数字化转型/i],
    defaultTitle: "背景与现状",
  },
];

// Document title patterns (H1 heading or first meaningful line)
const DOC_TITLE_PATTERNS = [
  /(?:关于|推进|建设|打造|提升|加强|优化)\s*(.+?)(?:汇报|报告|方案|计划|方案汇报)/,
  /(.+?)(?:汇报|报告|方案|计划)/,
  /^#{1}\s+(.+)$/m,
];

function buildSkeleton(intent, rawText) {
  const headings = extractStructuredHeadings(rawText);
  const docTitle = extractDocTitle(rawText);
  const sections = classifySections(headings, rawText);

  // Smart slide count: 1 cover + 1 agenda + sections*2 + 1 end = ~10-15
  let targetCount = Math.min(sections.length * 2 + 4, 18);
  targetCount = Math.max(targetCount, 8); // Minimum 8

  // Build slide budget per section (fair distribution)
  const slidesPerSection = distributeSlides(sections, targetCount);

  return {
    docTitle,
    totalSlides: targetCount,
    sections,
    slidesPerSection,
    narrativeFlow: buildNarrativeFlow(sections),
  };
}

function extractDocTitle(text) {
  // Try document title patterns
  for (const pattern of DOC_TITLE_PATTERNS) {
    const m = text.match(pattern);
    if (m && m[1]) {
      let title = m[1].trim();
      // Clean markdown markers and whitespace
      title = title.replace(/^#+\s*/, "").replace(/\s+/g, " ");
      if (title.length >= 3 && title.length <= 30) return title;
    }
  }
  
  // Fallback: first H1 heading
  const h1Match = text.match(/^#{1}\s+(.+)$/m);
  if (h1Match) {
    let title = h1Match[1].trim().replace(/^#+\s*/, "").substring(0, 30);
    if (title.length >= 3) return title;
  }
  
  return "汇报主题";
}

function extractStructuredHeadings(text) {
  const lines = text.split("\n");
  const headings = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        lineIndex: i,
      });
    }
  }

  return headings;
}

function classifySections(headings, text) {
  const sections = [];
  const h2Headings = headings.filter(h => h.level === 2);
  const h1Headings = headings.filter(h => h.level === 1);

  // Use H2 headings as section boundaries
  const boundaryHeadings = h2Headings.length > 0 ? h2Headings : h1Headings;

  if (boundaryHeadings.length === 0) {
    // No structured headings — create one generic section from text blocks
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    if (paragraphs.length >= 2) {
      for (const para of paragraphs.slice(0, 4)) {
        sections.push(createGenericSection(sections.length, para.trim()));
      }
    } else {
      sections.push({
        id: "section-1",
        title: "主要内容",
        keyMessage: "核心内容概要",
        sourceParagraphs: [text.substring(0, 200)],
        classification: "general",
      });
    }
    return sections;
  }

  // Create sections from heading boundaries
  for (let i = 0; i < boundaryHeadings.length; i++) {
    const current = boundaryHeadings[i];
    const next = boundaryHeadings[i + 1];

    // Extract text between current heading and next heading
    const startLine = current.lineIndex;
    const endLine = next ? next.lineIndex : text.split("\n").length;
    const sectionText = text.split("\n").slice(startLine + 1, endLine).join("\n");

    // Classify section type (use ordered patterns array)
    const classification = classifyHeading(current.text, sectionText);

    sections.push({
      id: classification.id,
      title: classification.title,
      keyMessage: extractKeyMessage(sectionText, classification.type),
      sourceParagraphs: extractParagraphs(sectionText),
      classification: classification.type,
      rawHeading: current.text,
    });
  }

  return sections;
}

function createGenericSection(index, text) {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 30);
  return {
    id: `section-${index + 1}`,
    title: `内容要点 ${index + 1}`,
    keyMessage: paragraphs[0]?.trim().substring(0, 60) || text.substring(0, 60),
    sourceParagraphs: paragraphs.slice(0, 4).map(p => p.trim()),
    classification: "general",
  };
}

function classifyHeading(headingText, sectionText) {
  // Priority: use the HEADING text as primary signal (it's the author's intent)
  // Only fall back to sectionText when heading is ambiguous
  
  const headingLower = headingText.toLowerCase();
  
  // Direct keyword matching on heading first
  for (const pattern of SECTION_PATTERNS) {
    if (pattern.keywords.some(kw => kw.test(headingLower))) {
      return {
        id: pattern.id,
        title: pattern.defaultTitle,
        type: pattern.id,
      };
    }
  }
  
  // If no match from heading, try section text
  for (const pattern of SECTION_PATTERNS) {
    if (pattern.keywords.some(kw => kw.test(sectionText))) {
      return {
        id: pattern.id,
        title: pattern.defaultTitle,
        type: pattern.id,
      };
    }
  }
  
  // Default: use cleaned heading text
  return {
    id: "content",
    title: headingText.replace(/^#{1,3}\s*/, "").substring(0, 20),
    type: "content",
  };
}

function extractKeyMessage(sectionText, classification) {
  // Goal: produce a SHORT conclusion-type statement (≤20 chars).
  // CRITICAL: Must NOT contain bullet markers, punctuation, or whitespace artifacts.
  
  const lines = sectionText.split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 5 && !l.startsWith("#"));
  
  // Clean bullet markers from all lines first
  const cleanedLines = lines.map(l => 
    l.replace(/^[-*+]\s*/, "").replace(/^\d+[.)、\s]+\s*/, "").trim()
  );
  
  // Priority 1: Data-driven conclusions with numbers
  for (const line of cleanedLines) {
    const m = line.match(/(.{3,12})(?:增长|上升|提升|增加|提高|扩大|下降|降低|减少|缩减|达到|超过|低于|覆盖)(?:了|到|至|达)?\s*(\d+%?\s*万?\s*元?\s*例?\s*家?)?/);
    if (m && m[1].length <= 12) {
      return m[1].trim().replace(/[，。；,.;！!？?]+$/, "");
    }
  }
  
  // Priority 2: Problem statements with specific metrics
  for (const line of cleanedLines) {
    const m = line.match(/(.{3,10})(?:不足|严重|薄弱|困难|瓶颈|痛点|仅\d|不到\d|少于\d)/);
    if (m && m[1].length <= 10) {
      return m[1].trim();
    }
  }
  
  // Priority 3: Numbered list items often contain good summaries
  const numberedItems = sectionText.match(/(?:^|\n)\s*\d+[.)、]\s+(.+?)(?=\n\s*\d+[.)、]|$)/gm);
  if (numberedItems && numberedItems.length > 0) {
    const bestItem = numberedItems.sort((a, b) => b.length - a.length)[0];
    let clean = bestItem.replace(/^\s*\d+[.)、]\s+/, "").trim();
    // Clean trailing punctuation
    clean = clean.replace(/[，。；,.;！!？?]+$/, "");
    if (clean.length <= 20) return clean;
    return clean.substring(0, 20);
  }
  
  // Priority 4: Bullet points
  const bullets = sectionText.match(/[-*+]\s+(.+?)(?=\n[-*+]|\n##|$)/g);
  if (bullets && bullets.length > 0) {
    const bestBullet = bullets.sort((a, b) => b.length - a.length)[0];
    let clean = bestBullet.replace(/^[-*+]\s+/, "").trim();
    clean = clean.replace(/[，。；,.;！!？?]+$/, "");
    if (clean.length <= 20) return clean;
    return clean.substring(0, 20);
  }
  
  // Fallback: use section heading cleaned
  const headingMatch = sectionText.match(/^#{1,3}\s+(.+)$/m);
  if (headingMatch) {
    let h = headingMatch[1].replace(/^#{1,3}\s*/, "").trim();
    h = h.replace(/^(?:第[一二三四五六七八九十百]+部分|[一二三四五六七八九十]+：)\s*/, "");
    h = h.replace(/[，。；,.;！!？?]+$/, "");
    if (h.length >= 3 && h.length <= 10) return h;
    if (h.length > 10) return h.substring(0, 10);
  }
  
  return classification || "要点";
}

function extractParagraphs(text) {
  // Extract meaningful content blocks from a section's full text (may contain H3 headings).
  const blocks = [];
  const seen = new Set();

  // Helper: add if unique and long enough, skip metadata/template lines
  function add(line) {
    const clean = line.replace(/\*\*/g, "").trim();
    // Skip template instructions and metadata lines
    if (/^(?:模板|标题|副标题|关键句|创建日期|幻灯片数量|叙事策略|核心逻辑|目标受众)/.test(clean)) return;
    if (/^使用 Layout/.test(clean)) return;
    if (/背景 image/.test(clean)) return;
    if (/深蓝色标题字/.test(clean)) return;
    if (/目录装饰字/.test(clean)) return;
    if (/甘特图风格/.test(clean)) return;
    if (/四卡片布局/.test(clean)) return;
    if (/结语背景图/.test(clean)) return;
    if (clean.length > 8 && !seen.has(clean)) {
      seen.add(clean);
      blocks.push(clean);
    }
  }

  // Priority 1: Markdown bullet points (- item, * item, + item) — ONE PER LINE
  const bulletLines = text.match(/^[ \t]*[-*+]\s+(.+)$/gm);
  if (bulletLines) {
    for (const b of bulletLines) {
      const item = b.replace(/^\s*[-*+]\s+/, "").trim();
      add(item);
    }
  }

  // Priority 2: Numbered lists (1. item, etc.)
  const numberedLines = text.match(/^[ \t]*\d+[.)、]\s+(.+)$/gm);
  if (numberedLines) {
    for (const n of numberedLines) {
      const item = n.replace(/^\s*\d+[.)、]\s+/, "").trim();
      add(item);
    }
  }

  // Priority 3: Table rows (for data sections)
  const tableRows = text.match(/^\|(.+)\|$/gm);
  if (tableRows) {
    let inTable = false;
    for (const row of tableRows) {
      const cells = row.replace(/^\|(.+)\|$/, "$1").split("|").map(c => c.trim());
      if (cells.length >= 3 && cells.every(c => /[-:]/.test(c))) continue; // separator row
      if (cells.length >= 3 && !inTable) {
        inTable = true;
        continue; // skip header
      }
      if (inTable && cells.length >= 3) {
        const bullet = cells.map(c => c.replace(/[-|]/g, "")).join(" → ");
        add(bullet);
      }
    }
  }

  // Priority 4: Lines that look like Q&A pairs (question → answer)
  const qaLines = text.match(/^(?:\*\*)?(.+?)(?:\*\*)?\s*[→:]\s*(.+)$/gm);
  if (qaLines) {
    for (const qa of qaLines) {
      // Use the answer part as the paragraph (it's the insight)
      const parts = qa.split(/[→:]/);
      if (parts.length >= 2) {
        const answer = parts.slice(1).join(":").trim();
        add(answer);
      }
    }
  }

  // Priority 5: Substantial paragraphs (skip intro fluff)
  if (blocks.length < 10) {
    const paras = text.split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 30 && !p.startsWith("#") && !blocks.includes(p));
    for (const p of paras) {
      if (blocks.length >= 10) break;
      add(p);
    }
  }

  return blocks.slice(0, 10);
}

function distributeSlides(sections, totalCount) {
  if (sections.length === 0) return [];

  // Reserve slots: 1 cover + 1 agenda (optional) + 1 end = 3 minimum
  const reserved = 3;
  const availableForSections = Math.max(totalCount - reserved, 4);

  // Base allocation: proportional but capped at 3 per section
  const baseAllocation = Math.floor(availableForSections / sections.length);
  const remainder = availableForSections - baseAllocation * sections.length;

  const allocations = sections.map((section, i) => {
    let allocation = Math.min(baseAllocation + (i < remainder ? 1 : 0), 3);
    
    // Minimum 1 slide per section
    return Math.max(1, allocation);
  });

  // Adjust to match exactly
  const totalAllocated = allocations.reduce((sum, a) => sum + a, 0);
  if (totalAllocated !== totalCount - reserved) {
    const diff = (totalCount - reserved) - totalAllocated;
    // Distribute diff across sections
    for (let i = 0; i < diff && i < sections.length; i++) {
      allocations[i] += 1;
    }
  }

  return allocations;
}

function buildNarrativeFlow(sections) {
  const flow = [];

  // Always start with Cover
  flow.push({ type: "cover", role: "title" });

  // Check if we need an agenda
  const hasAgenda = sections.length >= 3;
  if (hasAgenda) {
    flow.push({ type: "agenda", role: "agenda" });
  }

  // Add section dividers and content
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    // Section divider (except possibly for first section)
    if (i > 0) {
      flow.push({ type: "section-divider", role: "section-divider", section: section.title });
    }

    // Content slides for this section (actual count from allocation)
    // Placeholder — actual count comes from distributeSlides
    flow.push({
      type: "content",
      role: "content",
      section: section.title,
      sectionId: section.id,
    });
  }

  // End slide
  flow.push({ type: "end", role: "closing" });

  return flow;
}

module.exports = {
  buildSkeleton,
};
