/**
 * Phase 3: Page Refinement & Visual Mapping
 * 
 * For each slide in the skeleton, produces a fully structured page:
 *   - Title rewritten as conclusion-type (≤10 chars), deduplicated
 *   - Body condensed to ≤5 bullets (≤20 chars each)
 *   - Layout Type selected from standard library based on content signals
 *   - Visual suggestion provided with specific chart types
 *   - Speaker notes generated
 */

const { mapLayoutToRole, mapLayoutToSlideSpecLayout } = require("./schema.js");

// Stopwords to filter out from title generation
const STOP_WORDS = new Set([
  "近年来", "随着", "通过", "基于", "对于", "关于", "由于", "因此", "所以",
  "首先", "其次", "最后", "同时", "此外", "另外", "然而", "但是", "不过",
  "目前", "当前", "现在", "已经", "正在", "我们", "我院", "公司", "部门", "项目", "团队", "企业", "组织",
  "推进", "推动", "开展", "实施", "进行", "完成", "实现", "达成",
  "需要", "要求", "必须", "应该", "可以", "能够", "可能",
  "国家", "国家卫健委", "国家卫生健康委员会", "国家卫生健康委",
  "持续", "不断", "逐步", "大力推进", "深入推进", "稳步推进",
  "智慧", "数字", "信息化", "智能化",
  "技术层面", "管理层面", "流程层面", "制度层面", "人员层面", "资金层面",
  "建设", "工作", "发展", "提升", "优化", "完善", "保障", "机制", "体系", "模式",
]);

// Intro phrases that should NEVER be used as titles
const INTRO_PHRASES = [
  /^近年来.+/,
  /^随着.+/,
  /^通过.+/,
  /^基于.+/,
  /^对于.+/,
  /^关于.+/,
  /^国家.+/,
  /^持续.+/,
  /^我国.+/,
  /^我院.+/,
];

function isIntroPhrase(text) {
  return INTRO_PHRASES.some(p => p.test(text));
}

function isStopWord(text) {
  const trimmed = text.trim();
  return STOP_WORDS.has(trimmed) || trimmed.length <= 2;
}

// Layout type heuristics based on section classification and content signals
function selectLayoutType(sectionClassification, contentSignals, slideIndexInSection, paragraphs) {
  // Check if paragraphs contain step/process markers → Timeline
  if (paragraphs && paragraphs.some(p => /第[一二三四五六七八九十]+步|阶段[一二三]|步骤?\s*\d+|第一步|第二步|第三步|第一阶段|第二阶段|第三阶段/i.test(p))) {
    return "Timeline";
  }
  
  // Also check for sequential numbering patterns
  if (paragraphs && paragraphs.filter(p => /^\s*\d+[.)、]\s/.test(p.trim())).length >= 3) {
    return "Timeline";
  }
  
  // Check for comparison data → TwoColumns
  if (contentSignals.includes("trends-and-comparisons") && paragraphs) {
    const hasContrast = paragraphs.some(p => /对比|比较|优劣|差异|优势|劣势|长板|短板/i.test(p));
    if (hasContrast) return "TwoColumns";
  }
  
  // Data-rich sections with numbers → BigNumber for first slide
  if (contentSignals.includes("percentages-and-amounts") && slideIndexInSection === 0) {
    const hasNumbers = paragraphs.some(p => /\d+\s*(?:%|万元|亿元|百万|人|家|台)/.test(p));
    if (hasNumbers) return "BigNumber";
  }
  
  // Three distinct items → ThreeColumns
  if (paragraphs && paragraphs.length >= 3) {
    const hasThreeItems = paragraphs.filter(p => /^[\d\.\s]+\s/.test(p.trim())).length >= 3;
    if (hasThreeItems) return "ThreeColumns";
  }
  
  // Default: TitleAndContent
  return "TitleAndContent";
}

function refinePages(skeleton, rawText) {
  const slides = [];
  let globalSlideId = 1;
  const contentSignals = detectContentSignals(rawText);
  const usedTitles = new Set(); // Track generated titles for deduplication
  
  // 1. Cover slide
  // Ensure Cover title is max 15 chars
  let coverTitle = skeleton.docTitle || "汇报主题";
  if (coverTitle.length > 15) {
    coverTitle = coverTitle.substring(0, 15);
  }
  
  slides.push({
    slide_id: globalSlideId++,
    type: "Cover",
    title: coverTitle,
    subtitle: `报告人 · ${new Date().toLocaleDateString("zh-CN")}`,
    content: [],
    visual_suggestion: "建议使用与主题相关的高清背景图，叠加半透明遮罩",
    notes: "开场白：简要介绍汇报背景和目的",
  });

  // 2. Agenda slide (if 3+ sections)
  if (skeleton.sections.length >= 3) {
    slides.push({
      slide_id: globalSlideId++,
      type: "SectionDivider",
      title: "目录",
      subtitle: "",
      content: skeleton.sections.map(s => s.title),
      visual_suggestion: "简洁的列表布局，当前章节高亮",
      notes: "引导听众了解整体结构",
    });
  }

  // 3. Content slides per section
  for (let si = 0; si < skeleton.sections.length; si++) {
    const section = skeleton.sections[si];
    const allocation = skeleton.slidesPerSection[si] || 2;

    // Section divider (except first)
    if (si > 0) {
      slides.push({
        slide_id: globalSlideId++,
        type: "SectionDivider",
        title: section.title,
        subtitle: "",
        content: [],
        visual_suggestion: "纯色背景配大号章节号",
        notes: `过渡到${section.title}部分`,
      });
    }

    // Generate content slides for this section
    const paragraphs = section.sourceParagraphs || [];
    const bulletsPerSlide = Math.ceil(paragraphs.length / allocation) || 2;

    for (let ci = 0; ci < allocation; ci++) {
      const startIdx = ci * bulletsPerSlide;
      const endIdx = Math.min(startIdx + bulletsPerSlide, paragraphs.length);
      const sectionBullets = paragraphs.slice(startIdx, endIdx);

      // Determine layout type
      const layoutType = selectLayoutType(
        section.classification,
        contentSignals,
        ci,
        sectionBullets
      );

      // Generate concise title (conclusion-type, ≤10 chars, deduplicated)
      const title = generateConciseTitle(
        section, ci, startIdx, endIdx, paragraphs, usedTitles
      );
      
      // Track this title to prevent future duplicates (normalize for comparison)
      const normalizedTitle = title.replace(/^以|在|对|将|从|向|把|用|由|于|被|为|与|同|跟|和|及|或|之|其|该|本|此|这|那|每|各|全|总|都|已|既|尚|未|还|更|较|极|最|太|很|非常|十分|特别|格外|极其|极为|相当|比较|相对|大致|粗略|简单|初步|全面|深入|详细|充分|充分|完全|彻底|根本|彻底|彻底|彻底/g, "").trim();
      usedTitles.add(normalizedTitle);

      // Generate body content based on layout type
      let content;
      if (layoutType === "TwoColumns") {
        content = generateTwoColumnContent(sectionBullets, section);
      } else if (layoutType === "BigNumber") {
        content = generateBigNumberContent(sectionBullets);
      } else if (layoutType === "ThreeColumns") {
        content = generateThreeColumnContent(sectionBullets, section);
      } else {
        content = sectionBullets.map(b => truncateBullet(b)).slice(0, 5);
      }

      // Generate visual suggestion with specific chart types
      const visualSuggestion = suggestVisual(layoutType, section, content, contentSignals, sectionBullets);

      slides.push({
        slide_id: globalSlideId++,
        type: layoutType,
        title,
        subtitle: "",
        content,
        visual_suggestion: visualSuggestion,
        notes: generateSpeakerNotes(section, ci, content),
      });
    }
  }

  // 4. End/Thank you slide
  slides.push({
    slide_id: globalSlideId++,
    type: "End",
    title: "感谢聆听",
    subtitle: "欢迎批评指正",
    content: [],
    visual_suggestion: "简洁的致谢页，可附联系方式",
    notes: "结束语：感谢听众，开放提问",
  });

  return slides;
}

function generateConciseTitle(section, slideIndex, startIdx, endIdx, allBullets, usedTitles) {
  const bullets = allBullets || [];
  
  if (bullets.length > 0) {
    let bestBullet = null;
    for (let i = startIdx; i < endIdx && i < bullets.length; i++) {
      const b = bullets[i];
      if (!isIntroPhrase(b) && !/^标题/.test(b) && !/^副标题/.test(b) && !/^模板/.test(b) && b.length > 8) {
        bestBullet = b;
        break;
      }
    }
    if (!bestBullet) bestBullet = bullets[startIdx] || bullets[0];
    
    let text = bestBullet
      .replace(/\\*\\*/g, "")
      .replace(/^[-*+]\\s*/, "")
      .replace(/^\\d+[.)、]\\s*/, "")
      .replace(/→|➜/g, "→")
      .replace(/\\n/g, " ")
      .trim();
    
    // Try "subject → result" pattern — but ONLY if there's meaningful content after arrow
    const arrowFullMatch = text.match(/^(.{3,10})\\s*[→](.+)$/);
    if (arrowFullMatch) {
      const subject = arrowFullMatch[1].trim();
      const result_part = arrowFullMatch[2].trim();
      // Skip if result_part starts with numbers/dates (like "030天", "3190天")
      if (subject.length >= 3 && subject.length <= 10 && !isStopWord(subject) && 
          result_part.length > 0 && !/^\\d/.test(result_part)) {
        const norm = normalizeForDedup(subject);
        if (!usedTitles.has(norm)) {
          usedTitles.add(norm);
          return subject;
        }
      }
    }
    
    // Fallback arrow: just extract subject if no meaningful result
    const arrowSimpleMatch = text.match(/^(.{3,10})\\s*[→]/);
    if (arrowSimpleMatch && !arrowFullMatch) {
      const subject = arrowSimpleMatch[1].trim();
      if (subject.length >= 3 && subject.length <= 10 && !isStopWord(subject) && !/^\\d+$/.test(subject)) {
        const norm = normalizeForDedup(subject);
        if (!usedTitles.has(norm)) {
          usedTitles.add(norm);
          return subject;
        }
      }
    }
    
    // Try "label: insight" pattern — find LAST colon for best result
    const lastColonIdx = Math.max(text.lastIndexOf("："), text.lastIndexOf(":"));
    if (lastColonIdx > 0) {
      const afterColon = text.substring(lastColonIdx + 1).trim();
      if (afterColon.length >= 3 && afterColon.length <= 20 && !isStopWord(afterColon)) {
        // Truncate to 10 chars using smart truncation
        let insight = afterColon;
        if (insight.length > 10) {
          // Find first punctuation or Chinese word boundary within 10 chars
          const punctMatch = insight.match(/^(.{3,10})[，。；,.;！!？?、]/);
          if (punctMatch) insight = punctMatch[1];
          else {
            const endings = ["系统","平台","方案","建设","发展","提升","优化","完善","保障","机制","体系","模式","能力","水平","质量","效率","覆盖","服务","管理","数据","信息","技术","实现","构建","建立","引入","部署","打造","探索","培训","人才","团队"];
            for (const ending of endings) {
              const idx = insight.indexOf(ending);
              if (idx >= 0 && idx + ending.length <= 10) { insight = insight.substring(0, idx + ending.length); break; }
            }
            if (insight.length > 10) insight = insight.substring(0, 10);
          }
        }
        const norm = normalizeForDedup(insight);
        if (!usedTitles.has(norm)) {
          usedTitles.add(norm);
          return insight;
        }
      }
    }
    
    // Split by punctuation and find meaningful clauses
    const clauses = text.split(/[，,。；;！!？?、]/).map(c => {
      const trimmed = c.trim();
      // Strip any "label:" prefix from clause
      return trimmed.replace(/^[^：:]+[：:]/, "").trim();
    }).filter(c => c.length >= 2);
    
    for (const clause of clauses) {
      if (clause.length <= 10 && !isStopWord(clause) && !isIntroPhrase(clause)) {
        const norm = normalizeForDedup(clause);
        if (!usedTitles.has(norm)) {
          usedTitles.add(norm);
          return clause;
        }
      } else if (clause.length > 10) {
        const truncated = smartTruncate(clause);
        if (truncated && truncated.length >= 3 && !isStopWord(truncated)) {
          const norm = normalizeForDedup(truncated);
          if (!usedTitles.has(norm)) {
            usedTitles.add(norm);
            return truncated;
          }
        }
      }
    }
  }
  
  // Final fallback: section keyMessage, max 10 chars
  let base = section.keyMessage || section.title || "核心要点";
  base = base.replace(/\\*\\*/g, "").replace(/[:：].+$/, "").replace(/[，。；,.;！!？?]/g, "").replace(/→/g, " ").replace(/\\|/g, " ").trim();
  // Strip stop-word prefixes
  base = normalizeForDedup(base);
  const candidate = smartTruncate(base, 10);
  if (!candidate || candidate.length < 3) candidate = base.substring(0, 10);
  if (!candidate || candidate.length < 3) candidate = "核心要点";
  
  if (usedTitles.has(candidate)) {
    const suffixes = ["(一)", "(二)", "(三)", "(四)", "(五)"];
    const dupName = candidate + suffixes[slideIndex % 5];
    usedTitles.add(dupName);
    return dupName;
  }
  
  usedTitles.add(candidate);
  return isIntroPhrase(candidate) ? "核心要点" : candidate;
}

function normalizeForDedup(title) {
  return title.replace(/^(以|在|对|将|从|向|把|用|由|于|被|为|与|同|跟|和|及|或|之|其|该|本|此|这|那|每|各|全|总|都|已|既|尚|未|还|更|较|极|最|太|很|非常|十分|特别|格外|极其|极为|相当|比较|相对|大致|粗略|简单|初步|全面|深入|详细|充分|完全|彻底|根本|原则|同意)/g, "").trim();
}

function smartTruncate(text, limit) {
  limit = limit || 10;
  if (text.length <= limit) return text;
  
  const punctMatch = text.match(/^(.{3,10})[，。；,.;！!？?、]/);
  if (punctMatch) return punctMatch[1];
  
  const endings = ["系统", "平台", "方案", "建设", "发展", "提升", "优化", "完善", "保障", "机制", "体系", "模式", "能力", "水平", "质量", "效率", "覆盖", "服务", "管理", "数据", "信息", "技术", "实现", "构建", "建立", "引入", "部署", "打造", "探索", "培训", "人才", "团队"];
  for (const ending of endings) {
    const idx = text.indexOf(ending);
    if (idx >= 0 && idx + ending.length <= limit) {
      return text.substring(0, idx + ending.length);
    }
  }
  
  return text.substring(0, limit);
}

function generateTwoColumnContent(bullets, section) {
  // Split bullets into two columns: pros vs cons, or before vs after
  const half = Math.ceil(bullets.length / 2);
  const col1 = bullets.slice(0, half).map(b => truncateBullet(b)).slice(0, 3);
  const col2 = bullets.slice(half).map(b => truncateBullet(b)).slice(0, 3);
  
  // Detect if this is a comparison section
  const isComparison = section.sourceParagraphs?.some(p => 
    /对比|比较|优劣|差异|优势|劣势/i.test(p)
  );
  
  return [
    { label: isComparison ? "我方优势" : "现状/挑战", bullets: col1 },
    { label: isComparison ? "竞品劣势" : "目标/方案", bullets: col2 },
  ];
}

function generateBigNumberContent(bullets) {
  // Extract key metrics from bullets
  const metrics = [];
  for (const b of bullets) {
    const match = b.match(/(.{2,8})[→:：]\s*(\d+%?)\s*(?:→|到|达)?\s*(\d+%?)/);
    if (match) {
      metrics.push({
        label: match[1].trim(),
        value: `${match[2]} → ${match[3]}`,
      });
    }
  }
  
  if (metrics.length > 0) return metrics;
  
  // Fallback: just show the most numeric bullet
  const numericBullets = bullets.filter(b => /\d/.test(b));
  return numericBullets.slice(0, 3).map(b => truncateBullet(b));
}

function generateThreeColumnContent(bullets, section) {
  const third = Math.ceil(bullets.length / 3);
  const cols = [
    bullets.slice(0, third).map(b => truncateBullet(b)).slice(0, 2),
    bullets.slice(third, third * 2).map(b => truncateBullet(b)).slice(0, 2),
    bullets.slice(third * 2).map(b => truncateBullet(b)).slice(0, 2),
  ];
  
  const labels = ["第一步", "第二步", "第三步"];
  return cols.map((col, i) => ({
    label: labels[i],
    bullets: col,
  }));
}

function truncateBullet(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  if (text.length > 60) {
    text = text.substring(0, 60) + "...";
  }
  return text.trim();
}

function detectContentSignals(text) {
  const signals = [];
  if (/\d+\s*(?:%|万元|亿元|百万)/i.test(text)) signals.push("data-rich");
  if (/增长|下降|提升|降低/i.test(text)) signals.push("trends");
  if (/第一步|第二步|阶段|流程/i.test(text)) signals.push("process");
  if (/对比|比较|优劣|差异/i.test(text)) signals.push("comparison");
  return signals;
}

function suggestVisual(layoutType, section, content, contentSignals, rawParagraphs) {
  if (layoutType === "BigNumber") {
    // Suggest specific chart type based on data signals
    if (contentSignals.includes("percentages-and-amounts")) {
      return "建议插入柱状图或折线图展示关键指标变化趋势";
    }
    if (contentSignals.includes("trends-and-comparisons")) {
      return "建议插入折线图展示增长/下降趋势";
    }
    return "超大数字展示关键指标，配以简短说明文字";
  }
  if (layoutType === "Timeline") {
    return "水平时间轴，标注关键里程碑节点";
  }
  if (layoutType === "TwoColumns") {
    return "左右分栏对比布局，左侧优势/右侧挑战";
  }
  if (layoutType === "ThreeColumns") {
    return "三栏卡片式布局，每个卡片一个核心要点";
  }
  
  // Default: analyze content for visual suggestions
  const text = rawParagraphs?.join("\n") || "";
  if (contentSignals.includes("trends-and-comparisons")) {
    return "建议插入柱状图或折线图展示趋势对比";
  }
  if (contentSignals.includes("percentages-and-amounts")) {
    return "建议插入饼图或环形图展示占比分布";
  }
  if (/流程|步骤|环节|阶段/i.test(text)) {
    return "建议插入流程图展示业务流转过程";
  }
  if (/对比|比较|优劣|差异/i.test(text)) {
    return "建议插入对比表或条形图展示差异";
  }
  
  return "图文混排，左侧文字要点，右侧配相关图标或示意图";
}

function generateSpeakerNotes(section, slideIndex, content) {
  const notes = [];
  notes.push(`本页目标：${section.keyMessage}`);
  if (Array.isArray(content) && content.length > 0) {
    const flatContent = content.flatMap(c => 
      typeof c === "object" && c.bullets ? c.bullets : [c]
    );
    notes.push(`核心要点：${flatContent.join("；")}`);
  }
  notes.push("演讲提示：语速适中，重点内容适当停顿");
  return notes.join("\n");
}

module.exports = {
  refinePages,
};
