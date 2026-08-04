/**
 * @awe/template-analyzer — Template Element Extraction (M12.31)
 * 
 * Parses a PPTX template file and extracts:
 *   1. Slide elements (backgrounds, logos, watermarks, decorative shapes)
 *   2. Per-slide element inventory (what appears on each slide)
 *   3. Common elements across all slides (must be preserved)
 *   4. Unique elements per slide type (cover, content, end)
 *   5. Style tokens (fonts, colors, spacing patterns)
 * 
 * Generates a template-principles.md file that serves as the "design contract"
 * for the presentation generation pipeline.
 * 
 * Uses pptxjs-like parsing via OfficeParser or direct .pptx XML extraction.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── Constants ────────────────────────────────────────────────────

const SLIDE_TYPES = {
  COVER: "cover",           // First slide - title + subtitle
  AGENDA: "agenda",         // Table of contents
  SECTION_DIVIDER: "section-divider",  // Chapter transitions
  CONTENT: "content",       // Main content slides
  END: "end",               // Thank you / closing
};

const COMMON_ELEMENTS_THRESHOLD = 0.8; // 80% of slides must have it to be "common"

/**
 * Analyze a PPTX template and extract its structural elements.
 * 
 * @param {string} templatePath - Path to the .pptx template file
 * @param {object} options - Analysis options
 * @param {string} [options.outputDir] - Directory to save template-principles.md
 * @returns {{ principles: object, principlesMd: string, warnings: string[] }}
 */
function analyzeTemplate(templatePath, options = {}) {
  const opts = { outputDir: process.cwd(), ...options };
  const warnings = [];
  
  if (!templatePath || !fs.existsSync(templatePath)) {
    return { 
      principles: null, 
      principlesMd: "", 
      warnings: ["Template file not found: " + templatePath] 
    };
  }
  
  try {
    // Step 1: Extract raw XML from PPTX (it's a ZIP)
    const xmlData = extractPptxXml(templatePath);
    
    // Step 2: Parse slide structure and elements
    const slideElements = parseSlideElements(xmlData);
    
    // Step 3: Identify common vs unique elements
    const commonElements = identifyCommonElements(slideElements);
    const uniqueElements = identifyUniqueElements(slideElements);
    
    // Step 4: Extract style tokens
    const styleTokens = extractStyleTokens(xmlData);
    
    // Step 5: Classify slide types
    const slideTypes = classifySlideTypes(slideElements, slideElements.length);
    
    // Step 6: Build principles document
    const principles = buildPrinciples(
      slideElements, commonElements, uniqueElements, 
      styleTokens, slideTypes, warnings
    );
    
    // Step 7: Generate markdown
    const principlesMd = generatePrinciplesMarkdown(principles);
    
    // Step 8: Save to file
    const outputPath = path.join(opts.outputDir, "template-principles.md");
    fs.writeFileSync(outputPath, principlesMd);
    
    return { principles, principlesMd, warnings: [...warnings, `Saved to ${outputPath}`] };
    
  } catch (e) {
    warnings.push(`Template analysis failed: ${e.message}`);
    return { principles: null, principlesMd: "", warnings };
  }
}

/**
 * Extract XML content from a PPTX file (ZIP archive).
 */
function extractPptxXml(pptxPath) {
  const tmpDir = fs.mkdtempSync("/tmp/pptx-extract-");
  try {
    // Unzip the PPTX
    execSync(`unzip -o "${pptxPath}" -d "${tmpDir}"`, { stdio: "pipe" });
    
    // Read key XML files
    const slides = {};
    const slideFiles = fs.readdirSync(path.join(tmpDir, "ppt", "slides"))
      .filter(f => f.startsWith("slide") && f.endsWith(".xml"));
    
    for (const slideFile of slideFiles) {
      const content = fs.readFileSync(path.join(tmpDir, "ppt", "slides", slideFile), "utf8");
      const match = slideFile.match(/slide(\d+)\.xml/);
      if (match) {
        slides[parseInt(match[1])] = content;
      }
    }
    
    // Read theme and master slides
    let themeXml = "";
    let masterXml = "";
    try {
      themeXml = fs.readFileSync(path.join(tmpDir, "ppt", "theme", "theme1.xml"), "utf8");
    } catch {}
    try {
      masterXml = fs.readFileSync(path.join(tmpDir, "ppt", "slideMasters", "slideMaster1.xml"), "utf8");
    } catch {}
    
    return { slides, themeXml, masterXml, tmpDir };
  } catch (e) {
    throw new Error(`Failed to extract PPTX: ${e.message}`);
  }
}

/**
 * Parse slide XML to extract elements (shapes, text, images, backgrounds).
 */
function parseSlideElements(xmlData) {
  const slides = [];
  
  for (const [slideNum, xml] of Object.entries(xmlData.slides)) {
    const elements = [];
    
    // Extract background
    const bgMatch = extractBackground(slideXml);
    if (bgMatch) {
      elements.push({ type: "background", ...bgMatch });
    }

    // Extract shapes
    const shapes = extractShapes(slideXml);
    elements.push(...shapes);

    // Extract tables
    const tables = extractTables(slideXml);
    elements.push(...tables);

    // Extract charts
    const charts = extractCharts(slideXml);
    elements.push(...charts);

    // Extract images
    const images = extractImages(slideXml);
    elements.push(...images);
    
    slides.push({
      slideNum: parseInt(slideNum),
      elements,
      hasText: xml.includes("<a:t>"),
      hasImage: xml.includes("<a:blip"),
      hasTable: xml.includes("<p:tbl>"),
      hasChart: xml.includes("<c:chart>"),
    });
  }
  
  return slides;
}

/**
 * Parse a single shape element from XML.
 */
function parseShapeElement(xml) {
  // Extract text content
  const textMatch = xml.match(/<a:t>([^<]*)<\/a:t>/);
  const text = textMatch ? textMatch[1].trim() : "";
  
  // Extract shape type/name
  const nameMatch = xml.match(/<a:nvSpPr.*?name="([^"]+)"/);
  const name = nameMatch ? nameMatch[1] : "unknown";
  
  // Detect shape category
  let category = "text-box";
  if (/logo|watermark/i.test(name)) category = "brand-element";
  else if (/title|heading/i.test(name)) category = "heading";
  else if (/footer|page.?number/i.test(name)) category = "footer";
  else if (/picture|image/i.test(name)) category = "image";
  else if (/shape|rectangle|circle/i.test(name)) category = "decorative";
  
  return {
    type: "shape",
    name,
    category,
    text: text.substring(0, 100), // Truncate long text
    isBrandElement: category === "brand-element",
    isFooter: category === "footer",
  };
}

/**
 * Identify elements that appear on most slides (common elements).
 */
function identifyCommonElements(slides) {
  if (slides.length === 0) return { common: [], unique: {} };
  
  const totalSlides = slides.length;
  const brandElements = [];
  const footers = [];
  const backgrounds = [];
  const decorations = [];
  
  const elementPresence = {};
  
  for (const slide of slides) {
    for (const el of slide.elements) {
      const key = `${el.category}:${el.name || el.type}`;
      elementPresence[key] = (elementPresence[key] || 0) + 1;
      
      if (el.isBrandElement) brandElements.push(el);
      if (el.isFooter) footers.push(el);
      if (el.type === "background") backgrounds.push(el);
      if (el.category === "decorative") decorations.push(el);
    }
  }
  
  const common = Object.entries(elementPresence)
    .filter(([_, count]) => count >= Math.ceil(totalSlides * COMMON_ELEMENTS_THRESHOLD))
    .map(([key]) => key.split(":")[0]); // Just the category
  
  return {
    common,
    brandElements: brandElements.slice(0, 5), // Deduplicate by taking first few
    footers: footers.slice(0, 3),
    backgrounds: [...new Set(backgrounds.map(b => b.content?.substring(0, 50)))],
    decorations: decorations.slice(0, 5),
  };
}

/**
 * Identify elements unique to specific slide types.
 */
function identifyUniqueElements(slides) {
  const unique = { cover: [], content: [], end: [] };
  
  for (const slide of slides) {
    // Heuristic classification based on content
    let type = "content";
    if (slide.slideNum === 1) type = "cover";
    else if (slide.slideNum === slides.length) type = "end";
    else if (slide.elements.some(e => e.text?.includes("目录") || e.text?.includes("Agenda"))) {
      type = "agenda";
    }
    
    // Collect unique elements per type
    const slideSpecific = slide.elements.filter(e => {
      // Elements with distinctive names or categories
      return e.name && (
        /cover|intro|thank|closing|agenda|toc/i.test(e.name) ||
        e.category === "brand-element" ||
        e.category === "decorative"
      );
    });
    
    if (type in unique) {
      unique[type] = unique[type].concat(slideSpecific);
    }
  }
  
  // Deduplicate by name
  for (const type of Object.keys(unique)) {
    unique[type] = [...new Map(unique[type].map(e => [e.name || e.type, e])).values()].slice(0, 5);
  }
  
  return unique;
}

/**
 * Extract style tokens (colors, fonts, spacing) from theme/master XML.
 */
function extractStyleTokens(xmlData) {
  const tokens = {
    colors: {},
    fonts: {},
    spacing: {},
  };
  
  // Parse theme XML for color scheme
  if (xmlData.themeXml) {
    const colorMatches = xmlData.themeXml.match(/<a:scheme.*?>([\s\S]*?)<\/a:scheme>/);
    if (colorMatches) {
      const scheme = colorMatches[1];
      // Extract named colors
      const colorPairs = scheme.match(/<a:(?:dk[12]|lt[12])>.*?<a:srgbClr val="([A-Fa-f0-9]{6})".*?<\/a:srgbClr>.*?<a:snkName val="([^"]+)".*?<\/a:snkName>/g) || [];
      for (const pair of colorPairs) {
        const valMatch = pair.match(/val="([A-Fa-f0-9]{6})"/);
        const nameMatch = pair.match(/val="([^"]+)"/);
        if (valMatch && nameMatch) {
          tokens.colors[nameMatch[1]] = `#${valMatch[1]}`;
        }
      }
    }
  }
  
  // Parse master XML for font schemes
  if (xmlData.masterXml) {
    const fontMatches = xmlData.masterXml.match(/<a:fontScheme.*?>([\s\S]*?)<\/a:fontScheme>/);
    if (fontMatches) {
      const scheme = fontMatches[1];
      const latinMatch = scheme.match(/<a:latin typeface="([^"]+)"/);
      const eaMatch = scheme.match(/<a:ea typeface="([^"]+)"/);
      if (latinMatch) tokens.fonts.latin = latinMatch[1];
      if (eaMatch) tokens.fonts.eastAsian = eaMatch[1];
    }
  }
  
  return tokens;
}

/**
 * Classify slide types based on content analysis.
 */
function classifySlideTypes(slides, totalSlides) {
  const types = {
    cover: [],
    agenda: [],
    sectionDivider: [],
    content: [],
    end: [],
  };
  
  for (const slide of slides) {
    const textContent = slide.elements
      .filter(e => e.text)
      .map(e => e.text)
      .join(" ");
    
    if (slide.slideNum === 1) {
      types.cover.push(slide.slideNum);
    } else if (textContent.includes("目录") || textContent.includes("Agenda") || textContent.includes("Contents")) {
      types.agenda.push(slide.slideNum);
    } else if (textContent.includes("感谢") || textContent.includes("Thank") || slide.slideNum === totalSlides) {
      types.end.push(slide.slideNum);
    } else if (/^[一二三四五六七八九十]+[、.]/.test(textContent) || slide.elements.some(e => e.category === "decorative" && e.text?.includes("章节"))) {
      types.sectionDivider.push(slide.slideNum);
    } else {
      types.content.push(slide.slideNum);
    }
  }
  
  return types;
}

/**
 * Build the principles document object.
 */
function buildPrinciples(slides, common, unique, styles, types, warnings) {
  return {
    metadata: {
      totalSlides: slides.length,
      generatedAt: new Date().toISOString(),
      sourceFile: slides.length > 0 ? slides[0].sourceFile || "unknown" : "unknown",
    },
    commonElements: {
      mustPreserve: common.common,
      brandElements: common.brandElements,
      footers: common.footers,
      backgrounds: common.backgrounds,
    },
    uniqueByType: unique,
    slideTypes: types,
    styleTokens: styles,
    recommendations: generateRecommendations(common, unique, types, warnings),
  };
}

/**
 * Generate design recommendations based on analysis.
 */
function generateRecommendations(common, unique, types, warnings) {
  const recs = [];
  
  // Brand elements must always be preserved
  if (common.brandElements.length > 0) {
    recs.push({
      priority: "critical",
      rule: "BRAND_ELEMENTS_MUST_PRESERVE",
      description: "所有品牌元素（Logo、水印）必须保留在任何生成的幻灯片上",
    });
  }
  
  // Footer consistency
  if (common.footers.length > 0) {
    recs.push({
      priority: "high",
      rule: "FOOTER_CONSISTENCY",
      description: "页脚元素必须在所有幻灯片上保持一致",
    });
  }
  
  // Cover/end slide preservation
  if (types.cover.length > 0) {
    recs.push({
      priority: "critical",
      rule: "COVER_SLIDE_FIDELITY",
      description: "封面页应忠实于模板设计，不修改标题层级和副标题位置",
    });
  }
  
  if (types.end.length > 0) {
    recs.push({
      priority: "high",
      rule: "END_SLIDE_FIDELITY",
      description: "结束页应保持模板的致谢样式",
    });
  }
  
  // Background preservation
  if (common.backgrounds.length > 0) {
    recs.push({
      priority: "medium",
      rule: "BACKGROUND_STYLING",
      description: "背景样式应在内容页中保留，但允许根据内容密度调整透明度",
    });
  }
  
  return recs;
}

/**
 * Generate the template-principles.md markdown document.
 */
function generatePrinciplesMarkdown(principles) {
  const lines = [];
  
  lines.push("# Template Design Principles");
  lines.push("");
  lines.push(`> Auto-generated from template analysis on ${principles.metadata.generatedAt}`);
  lines.push(`> Source: ${principles.metadata.sourceFile}`);
  lines.push(`> Total slides in template: ${principles.metadata.totalSlides}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  
  // Section 1: Must-Preserve Elements
  lines.push("## 1. 必须保留的元素 (Must-Preserve Elements)");
  lines.push("");
  lines.push("以下元素在生成新内容时必须保留或确认后才能弃用：");
  lines.push("");
  
  if (principles.commonElements.brandElements.length > 0) {
    lines.push("### Logo & Brand Elements");
    lines.push("- [ ] **保留**: 所有 Logo、水印、品牌标识");
    lines.push("  - 原因: 品牌一致性要求");
    lines.push("");
  }
  
  if (principles.commonElements.footers.length > 0) {
    lines.push("### Footer Elements");
    lines.push("- [ ] **保留**: 页码、公司名、版权声明");
    lines.push("  - 原因: 法律合规和导航需求");
    lines.push("");
  }
  
  lines.push("### Global Styling");
  lines.push("- [x] **保留**: 主题色板、字体方案、间距规则");
  lines.push("  - 来源: 模板 theme/master XML");
  lines.push("");
  
  // Section 2: Cover & End Slide Fidelity
  lines.push("## 2. 首尾页保真原则 (Cover/End Slide Fidelity)");
  lines.push("");
  lines.push("封面页和结束页应忠实于模板原始设计：");
  lines.push("");
  lines.push("| 页面类型 | 保真级别 | 说明 |");
  lines.push("|---------|---------|------|");
  lines.push("| 封面 (Cover) | **高** | 标题层级、副标题位置、品牌元素位置均不修改 |");
  lines.push("| 封底 (End) | **高** | 致谢语、联系方式、Logo 位置均不修改 |");
  lines.push("| 目录 (Agenda) | **中** | 结构保留，可调整章节名称 |");
  lines.push("| 章节分隔 (Section Divider) | **中** | 视觉风格保留，内容可替换 |");
  lines.push("");
  
  // Section 3: Content Slide Guidelines
  lines.push("## 3. 内容页设计指南 (Content Slide Guidelines)");
  lines.push("");
  lines.push("中间内容页的设计应遵循以下原则：");
  lines.push("");
  lines.push("#### 3.1 背景处理");
  if (principles.commonElements.backgrounds.length > 0) {
    lines.push("- 使用模板背景，但允许根据内容密度调整透明度");
    lines.push(`- 检测到 ${principles.commonElements.backgrounds.length} 种背景模式`);
  } else {
    lines.push("- 使用默认主题背景");
  }
  lines.push("");
  
  lines.push("#### 3.2 版式选择");
  lines.push("- 优先使用模板中已有的版式（Layout）");
  lines.push("- 若需新布局，应继承模板的字体、颜色、间距规范");
  lines.push("- 每页只传递一个核心观点 (KISS 原则)");
  lines.push("");
  
  lines.push("#### 3.3 视觉层次");
  lines.push("- 标题 ≤ 10 字，结论型表述");
  lines.push("- 正文要点化，每条 ≤ 20 字");
  lines.push("- 数据优先图表化（柱状图/折线图/饼图）");
  lines.push("");
  
  // Section 4: Style Tokens
  lines.push("## 4. 风格令牌 (Style Tokens)");
  lines.push("");
  
  if (Object.keys(principles.styleTokens.colors).length > 0) {
    lines.push("### 色彩方案");
    lines.push("| 角色 | 颜色值 |");
    lines.push("|------|--------|");
    for (const [role, color] of Object.entries(principles.styleTokens.colors)) {
      lines.push(`| ${role} | \`${color}\` |`);
    }
    lines.push("");
  }
  
  if (Object.keys(principles.styleTokens.fonts).length > 0) {
    lines.push("### 字体方案");
    lines.push(`- Latin: **${principles.styleTokens.fonts.latin || "Not detected"}**`);
    lines.push(`- East Asian: **${principles.styleTokens.fonts.eastAsian || "Not detected"}**`);
    lines.push("");
  }
  
  // Section 5: Recommendations
  lines.push("## 5. 设计建议 (Design Recommendations)");
  lines.push("");
  for (const rec of principles.recommendations) {
    const icon = rec.priority === "critical" ? "🔴" : rec.priority === "high" ? "🟠" : "🟡";
    lines.push(`${icon} **[${rec.rule}]** ${rec.description}`);
  }
  lines.push("");
  
  // Section 6: Slide Type Distribution
  lines.push("## 6. 模板结构统计");
  lines.push("");
  lines.push("| 类型 | 页数 | 占比 |");
  lines.push("|------|------|------|");
  for (const [type, nums] of Object.entries(principles.slideTypes)) {
    const pct = ((nums.length / principles.metadata.totalSlides) * 100).toFixed(0);
    lines.push(`| ${type} | ${nums.length} | ${pct}% |`);
  }
  lines.push("");
  
  // Section 7: Warnings
  if (principles.warnings && principles.warnings.length > 0) {
    lines.push("## ⚠️ 分析警告");
    lines.push("");
    for (const w of principles.warnings) {
      lines.push(`- ${w}`);
    }
    lines.push("");
  }
  
  return lines.join("\n");
}

module.exports = {
  analyzeTemplate,
  extractPptxXml,
  parseSlideElements,
  identifyCommonElements,
  identifyUniqueElements,
  extractStyleTokens,
  classifySlideTypes,
  generatePrinciplesMarkdown,
  SLIDE_TYPES,
  COMMON_ELEMENTS_THRESHOLD,
};
