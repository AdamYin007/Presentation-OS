/**
 * @awe/template-analyzer — Template Element Extraction (M12.31 Enhanced)
 * 
 * Parses a PPTX template file and extracts:
 *   1. Slide elements (backgrounds, logos, watermarks, decorative shapes)
 *   2. Per-slide element inventory (what appears on each slide)
 *   3. Common elements across all slides (must be preserved)
 *   4. Unique elements per slide type (cover, content, end)
 *   5. Style tokens (fonts, colors, spacing patterns)
 *   6. Layout information (slide layouts with placeholder positions)
 *   7. Media assets (images, graphics)
 * 
 * Generates:
 *   - template-principles.md: Design contract for pipeline
 *   - template-spec.md: Detailed template specification for injector
 * 
 * Uses xml2js for proper XML parsing and schema validation for output quality.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { parseString } = require("xml2js");
const {
  validatePrinciples,
  validateSlide,
  crossValidate,
  SCHEMA_VERSION,
} = require("./schema.js");

// ── Constants ────────────────────────────────────────────────────

const SLIDE_TYPES = {
  COVER: "cover",
  AGENDA: "agenda",
  SECTION_DIVIDER: "section-divider",
  CONTENT: "content",
  END: "end",
};

const COMMON_ELEMENTS_THRESHOLD = 0.8;

// ── Main Analysis Function ───────────────────────────────────────

function analyzeTemplate(templatePath, options = {}) {
  const opts = { 
    outputDir: process.cwd(), 
    validate: true,
    ...options 
  };
  const warnings = [];
  
  if (!templatePath || !fs.existsSync(templatePath)) {
    return { 
      principles: null, 
      principlesMd: "",
      specMd: "",
      warnings: ["Template file not found: " + templatePath],
      validation: null
    };
  }
  
  try {
    const xmlData = extractPptxXml(templatePath);
    const slideElements = parseSlideElements(xmlData);
    const commonElements = identifyCommonElements(slideElements);
    const uniqueElements = identifyUniqueElements(slideElements);
    const styleTokens = extractStyleTokens(xmlData);
    const slideTypes = classifySlideTypes(slideElements, slideElements.length);
    const layouts = extractLayouts(xmlData);
    const mediaAssets = extractMediaAssets(xmlData);
    
    const principles = buildPrinciples(
      slideElements, commonElements, uniqueElements, 
      styleTokens, slideTypes, layouts, warnings
    );
    
    const crossValidationWarnings = crossValidate(slideElements, principles);
    warnings.push(...crossValidationWarnings);
    
    let validation = null;
    if (opts.validate) {
      validation = validatePrinciples(principles);
      if (!validation.ok) {
        warnings.push("Schema validation warnings: " + validation.errors.join("; "));
      }
    }
    
    const principlesMd = generatePrinciplesMarkdown(principles);
    const specMd = generateTemplateSpec(principles, layouts, mediaAssets, templatePath);
    
    const principlesOutputPath = path.join(opts.outputDir, "template-principles.md");
    const specOutputPath = path.join(opts.outputDir, "template-spec.md");
    
    fs.writeFileSync(principlesOutputPath, principlesMd);
    fs.writeFileSync(specOutputPath, specMd);
    warnings.push(`Saved to ${principlesOutputPath}`);
    warnings.push(`Saved to ${specOutputPath}`);
    
    return { principles, principlesMd, specMd, warnings, validation };
    
  } catch (e) {
    warnings.push(`Template analysis failed: ${e.message}`);
    return { principles: null, principlesMd: "", specMd: "", warnings, validation: null };
  }
}

// ── XML Extraction ───────────────────────────────────────────────

function extractPptxXml(pptxPath) {
  const tmpDir = fs.mkdtempSync("/tmp/pptx-extract-");
  try {
    execSync(`unzip -o "${pptxPath}" -d "${tmpDir}"`, { stdio: "pipe" });
    
    const slides = {};
    const slideFiles = fs.readdirSync(path.join(tmpDir, "ppt", "slides"))
      .filter(f => f.startsWith("slide") && f.endsWith(".xml"));
    
    for (const slideFile of slideFiles) {
      const xmlContent = fs.readFileSync(path.join(tmpDir, "ppt", "slides", slideFile), "utf8");
      const match = slideFile.match(/slide(\d+)\.xml/);
      if (match) {
        const parsed = parseXmlSync(xmlContent);
        slides[parseInt(match[1])] = parsed;
      }
    }
    
    let themeXml = null;
    let masterXml = null;
    let layouts = {};
    
    try {
      const themeContent = fs.readFileSync(path.join(tmpDir, "ppt", "theme", "theme1.xml"), "utf8");
      themeXml = parseXmlSync(themeContent);
    } catch {}
    
    try {
      const masterContent = fs.readFileSync(path.join(tmpDir, "ppt", "slideMasters", "slideMaster1.xml"), "utf8");
      masterXml = parseXmlSync(masterContent);
    } catch {}
    
    // Extract slide layouts
    const layoutDir = path.join(tmpDir, "ppt", "slideLayouts");
    if (fs.existsSync(layoutDir)) {
      const layoutFiles = fs.readdirSync(layoutDir)
        .filter(f => f.startsWith("slideLayout") && f.endsWith(".xml"));
      for (const layoutFile of layoutFiles) {
        const layoutContent = fs.readFileSync(path.join(layoutDir, layoutFile), "utf8");
        const match = layoutFile.match(/slideLayout(\d+)\.xml/);
        if (match) {
          layouts[parseInt(match[1])] = parseXmlSync(layoutContent);
        }
      }
    }
    
    return { slides, themeXml, masterXml, layouts, tmpDir };
  } catch (e) {
    throw new Error(`Failed to extract PPTX: ${e.message}`);
  }
}

function parseXmlSync(xmlString) {
  let result = null;
  parseString(xmlString, { explicitArray: false }, (err, parsed) => {
    if (err) {
      throw new Error(`XML parsing failed: ${err.message}`);
    }
    result = parsed;
  });
  return result;
}

// ── Element Parsing ──────────────────────────────────────────────

function parseSlideElements(xmlData) {
  const slides = [];
  
  for (const [slideNum, slideXml] of Object.entries(xmlData.slides)) {
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
      hasText: hasTextContent(slideXml),
      hasImage: hasImageContent(slideXml),
      hasTable: hasTableContent(slideXml),
      hasChart: hasChartContent(slideXml),
    });
  }
  
  return slides;
}

function extractBackground(slideXml) {
  const slide = slideXml.slide;
  if (!slide) return null;
  
  const bg = slide.bg;
  if (!bg) return null;
  
  const bgPr = bg.bgPr;
  if (!bgPr) return null;
  
  return {
    type: "background",
    hasSolidFill: !!bgPr.solidFill,
    hasGradientFill: !!bgPr.gradFill,
    hasImageFill: !!bgPr.blipFill,
  };
}

function extractShapes(slideXml) {
  const slide = slideXml.slide;
  if (!slide || !slide.spTree) return [];
  
  const shapes = [];
  const spElements = slide.spTree.sp;
  
  const spArray = Array.isArray(spElements) ? spElements : [spElements];
  for (const sp of spArray) {
    shapes.push(parseSingleShape(sp));
  }
  
  return shapes.filter(Boolean);
}

function parseSingleShape(spXml) {
  if (!spXml) return null;
  
  const nvSpPr = spXml.nvSpPr;
  const name = nvSpPr?.nvPr?.name || "unknown";
  const text = extractTextContent(spXml);
  const category = categorizeShape(name, text);
  
  return {
    type: "shape",
    name,
    category,
    text: text?.substring(0, 100),
    isBrandElement: category === "brand-element",
    isFooter: category === "footer",
  };
}

function extractTextContent(element) {
  if (!element) return null;
  
  const txBody = element.txBody;
  if (!txBody) return null;
  
  const paragraphs = txBody.p;
  if (!paragraphs) return null;
  
  const texts = [];
  const paraArray = Array.isArray(paragraphs) ? paragraphs : [paragraphs];
  
  for (const para of paraArray) {
    const runs = para.r;
    if (!runs) continue;
    
    const runsArray = Array.isArray(runs) ? runs : [runs];
    for (const run of runsArray) {
      const t = run.t;
      if (t && typeof t === "string") {
        texts.push(t);
      }
    }
  }
  
  return texts.join(" ");
}

function categorizeShape(name, text) {
  const combined = `${name} ${text || ""}`.toLowerCase();
  
  if (/logo|watermark|brand/i.test(combined)) return "brand-element";
  if (/title|heading/i.test(combined)) return "heading";
  if (/footer|page.?number/i.test(combined)) return "footer";
  if (/picture|image/i.test(combined)) return "image";
  if (/shape|rectangle|circle/i.test(combined)) return "decorative";
  
  return "text-box";
}

function extractTables(slideXml) {
  const slide = slideXml.slide;
  if (!slide || !slide.spTree) return [];
  
  const tables = [];
  const spElements = slide.spTree.sp;
  
  const spArray = Array.isArray(spElements) ? spElements : [spElements];
  for (const sp of spArray) {
    if (sp?.graphicFrame?.tbl) {
      tables.push({
        type: "table",
        rows: sp.graphicFrame.tbl.row?.length || 0,
      });
    }
  }
  
  return tables;
}

function extractCharts(slideXml) {
  const slide = slideXml.slide;
  if (!slide || !slide.spTree) return [];
  
  const charts = [];
  const spElements = slide.spTree.sp;
  
  const spArray = Array.isArray(spElements) ? spElements : [spElements];
  for (const sp of spArray) {
    if (sp?.graphicFrame?.chart) {
      charts.push({ type: "chart", hasChart: true });
    }
  }
  
  return charts;
}

function extractImages(slideXml) {
  const slide = slideXml.slide;
  if (!slide || !slide.spTree) return [];
  
  const images = [];
  const spElements = slide.spTree.sp;
  
  const spArray = Array.isArray(spElements) ? spElements : [spElements];
  for (const sp of spArray) {
    if (sp?.blipFill) {
      images.push({
        type: "image",
        relationshipId: sp.blipFill?.blip?.["@_embed"] || "unknown",
      });
    }
  }
  
  return images;
}

function hasTextContent(slideXml) {
  const slide = slideXml.slide;
  if (!slide || !slide.spTree) return false;
  
  const shapes = slide.spTree.sp;
  const shapesArray = Array.isArray(shapes) ? shapes : [shapes];
  
  for (const shape of shapesArray) {
    if (extractTextContent(shape)) return true;
  }
  
  return false;
}

function hasImageContent(slideXml) {
  return extractImages(slideXml).length > 0;
}

function hasTableContent(slideXml) {
  return extractTables(slideXml).length > 0;
}

function hasChartContent(slideXml) {
  return extractCharts(slideXml).length > 0;
}

// ── Element Analysis ─────────────────────────────────────────────

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
    .map(([key]) => key.split(":")[0]);
  
  return {
    common,
    brandElements: brandElements.slice(0, 5),
    footers: footers.slice(0, 3),
    backgrounds: [...new Set(backgrounds.map(b => JSON.stringify(b)))],
    decorations: decorations.slice(0, 5),
  };
}

function identifyUniqueElements(slides) {
  const unique = { cover: [], content: [], end: [] };
  
  for (const slide of slides) {
    let type = "content";
    if (slide.slideNum === 1) type = "cover";
    else if (slide.slideNum === slides.length) type = "end";
    else if (slide.elements.some(e => e.text?.includes("目录") || e.text?.includes("Agenda"))) {
      type = "agenda";
    }
    
    const slideSpecific = slide.elements.filter(e => {
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
  
  for (const type of Object.keys(unique)) {
    unique[type] = [...new Map(unique[type].map(e => [e.name || e.type, e])).values()].slice(0, 5);
  }
  
  return unique;
}

// ── Style Token Extraction ───────────────────────────────────────

function extractStyleTokens(xmlData) {
  const tokens = {
    colors: {},
    accentColors: {},
    fonts: {},
    spacing: {},
  };
  
  if (xmlData.themeXml) {
    const theme = xmlData.themeXml.theme;
    if (theme?.themeElements) {
      const scheme = theme.themeElements.scheme;
      if (scheme) {
        const clrScheme = scheme.clrScheme;
        if (clrScheme) {
          // Extract main colors
          const colorNames = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6"];
          for (const name of colorNames) {
            const colorVal = clrScheme[name]?.srgbClr?.["@_val"];
            if (colorVal) {
              if (name.startsWith("accent")) {
                tokens.accentColors[name] = `#${colorVal}`;
              } else {
                tokens.colors[name] = `#${colorVal}`;
              }
            }
          }
        }
      }
    }
  }
  
  if (xmlData.masterXml) {
    const master = xmlData.masterXml.slideMaster;
    if (master?.theme) {
      const theme = master.theme;
      if (theme?.themeElements) {
        const fontScheme = theme.themeElements.fontScheme;
        if (fontScheme) {
          // Major font (titles)
          const majorLatin = fontScheme.majorFont?.latin?.["@_typeface"];
          if (majorLatin) tokens.fonts.majorLatin = majorLatin;
          
          const majorEastAsian = fontScheme.majorFont?.ea?.["@_typeface"];
          if (majorEastAsian) tokens.fonts.majorEastAsian = majorEastAsian;
          
          // Minor font (body)
          const minorLatin = fontScheme.minorFont?.latin?.["@_typeface"];
          if (minorLatin) tokens.fonts.minorLatin = minorLatin;
          
          const minorEastAsian = fontScheme.minorFont?.ea?.["@_typeface"];
          if (minorEastAsian) tokens.fonts.minorEastAsian = minorEastAsian;
        }
      }
    }
  }
  
  return tokens;
}

// ── Layout Extraction ─────────────────────────────────────────────

function extractLayouts(xmlData) {
  const layouts = {};
  
  if (!xmlData.layouts) return layouts;
  
  for (const [layoutNum, layoutXml] of Object.entries(xmlData.layouts)) {
    const layout = {
      num: parseInt(layoutNum),
      name: "",
      placeholders: [],
      decorations: [],
    };
    
    // Extract layout name
    const spPr = layoutXml.slideLayout?.spTree?.sp;
    if (spPr) {
      const spArray = Array.isArray(spPr) ? spPr : [spPr];
      for (const sp of spArray) {
        const nvPr = sp?.nvSpPr?.nvPr;
        if (nvPr) {
          const name = nvPr.name;
          const type = nvPr.type;
          if (type === "title" || type === "ctrTitle") {
            layout.name = name || `Layout ${layoutNum}`;
          }
        }
      }
    }
    
    // Extract placeholders
    const slide = layoutXml.slideLayout;
    if (slide?.spTree?.sp) {
      const shapes = Array.isArray(slide.spTree.sp) ? slide.spTree.sp : [slide.spTree.sp];
      for (const shape of shapes) {
        const nvSpPr = shape?.nvSpPr;
        const nvPr = nvSpPr?.nvPr;
        if (nvPr) {
          const phType = nvPr.type;
          const phName = nvPr.name;
          if (phType) {
            layout.placeholders.push({
              type: phType,
              name: phName,
              isContentPlaceholder: !!phType,
            });
          } else {
            // Decorative shape
            layout.decorations.push({
              name: phName,
            });
          }
        }
      }
    }
    
    layouts[layoutNum] = layout;
  }
  
  return layouts;
}

// ── Media Extraction ─────────────────────────────────────────────

function extractMediaAssets(xmlData) {
  const media = {
    images: [],
    logos: [],
    backgrounds: [],
  };
  
  // Extract from slides
  for (const [slideNum, slideXml] of Object.entries(xmlData.slides)) {
    const slide = slideXml.slide;
    if (!slide?.spTree?.sp) continue;
    
    const shapes = Array.isArray(slide.spTree.sp) ? slide.spTree.sp : [slide.spTree.sp];
    for (const shape of shapes) {
      if (shape?.blipFill) {
        const embed = shape.blipFill?.blip?.["@_embed"];
        if (embed) {
          media.images.push({
            slide: parseInt(slideNum),
            relationshipId: embed,
            type: "image",
          });
        }
      }
    }
  }
  
  return media;
}

// ── Slide Type Classification ─────────────────────────────────────

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

// ── Principles Building ───────────────────────────────────────────

function buildPrinciples(slides, common, unique, styles, types, layouts, warnings) {
  return {
    metadata: {
      totalSlides: slides.length,
      generatedAt: new Date().toISOString(),
      sourceFile: slides.length > 0 ? "template" : "unknown",
      schemaVersion: SCHEMA_VERSION,
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
    layouts,
    recommendations: generateRecommendations(common, unique, types, warnings),
    warnings,
  };
}

function generateRecommendations(common, unique, types, warnings) {
  const recs = [];
  
  if (common.brandElements.length > 0) {
    recs.push({
      priority: "critical",
      rule: "BRAND_ELEMENTS_MUST_PRESERVE",
      description: "所有品牌元素（Logo、水印）必须保留在任何生成的幻灯片上",
    });
  }
  
  if (common.footers.length > 0) {
    recs.push({
      priority: "high",
      rule: "FOOTER_CONSISTENCY",
      description: "页脚元素必须在所有幻灯片上保持一致",
    });
  }
  
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
  
  if (common.backgrounds.length > 0) {
    recs.push({
      priority: "medium",
      rule: "BACKGROUND_STYLING",
      description: "背景样式应在内容页中保留，但允许根据内容密度调整透明度",
    });
  }
  
  return recs;
}

// ── Markdown Generation ───────────────────────────────────────────

function generatePrinciplesMarkdown(principles) {
  const lines = [];
  
  lines.push("# Template Design Principles");
  lines.push("");
  lines.push(`> Auto-generated from template analysis on ${principles.metadata.generatedAt}`);
  lines.push(`> Schema Version: ${principles.metadata.schemaVersion}`);
  lines.push(`> Total slides in template: ${principles.metadata.totalSlides}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  
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
  
  if (Object.keys(principles.styleTokens.accentColors || {}).length > 0) {
    lines.push("### 强调色");
    lines.push("| 角色 | 颜色值 |");
    lines.push("|------|--------|");
    for (const [role, color] of Object.entries(principles.styleTokens.accentColors)) {
      lines.push(`| ${role} | \`${color}\` |`);
    }
    lines.push("");
  }
  
  if (Object.keys(principles.styleTokens.fonts).length > 0) {
    lines.push("### 字体方案");
    if (principles.styleTokens.fonts.majorLatin) {
      lines.push(`- 标题字体 (Latin): **${principles.styleTokens.fonts.majorLatin}**`);
    }
    if (principles.styleTokens.fonts.majorEastAsian) {
      lines.push(`- 标题字体 (中文): **${principles.styleTokens.fonts.majorEastAsian}**`);
    }
    if (principles.styleTokens.fonts.minorLatin) {
      lines.push(`- 正文字体 (Latin): **${principles.styleTokens.fonts.minorLatin}**`);
    }
    if (principles.styleTokens.fonts.minorEastAsian) {
      lines.push(`- 正文字体 (中文): **${principles.styleTokens.fonts.minorEastAsian}**`);
    }
    lines.push("");
  }
  
  lines.push("## 5. 设计建议 (Design Recommendations)");
  lines.push("");
  for (const rec of principles.recommendations) {
    const icon = rec.priority === "critical" ? "🔴" : rec.priority === "high" ? "🟠" : "🟡";
    lines.push(`${icon} **[${rec.rule}]** ${rec.description}`);
  }
  lines.push("");
  
  lines.push("## 6. 模板结构统计");
  lines.push("");
  lines.push("| 类型 | 页数 | 占比 |");
  lines.push("|------|------|------|");
  for (const [type, nums] of Object.entries(principles.slideTypes)) {
    const pct = ((nums.length / principles.metadata.totalSlides) * 100).toFixed(0);
    lines.push(`| ${type} | ${nums.length} | ${pct}% |`);
  }
  lines.push("");
  
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

function generateTemplateSpec(principles, layouts, mediaAssets, templatePath) {
  const lines = [];
  
  lines.push("# Template Specification");
  lines.push("");
  lines.push(`> Auto-generated from ${path.basename(templatePath)}`);
  lines.push(`> Generated at: ${principles.metadata.generatedAt}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  
  // Metadata
  lines.push("## 模板元数据");
  lines.push("");
  lines.push("| 属性 | 值 |");
  lines.push("|------|-----|");
  lines.push(`| 总页数 | ${principles.metadata.totalSlides} |`);
  lines.push(`| 生成时间 | ${principles.metadata.generatedAt} |`);
  lines.push(`| Schema版本 | ${principles.metadata.schemaVersion} |`);
  lines.push("");
  
  // Layout mapping
  lines.push("## 版式映射 (Role Map)");
  lines.push("");
  lines.push("根据版式内容推断幻灯片角色：");
  lines.push("");
  
  const roleMap = {};
  for (const [type, nums] of Object.entries(principles.slideTypes)) {
    for (const num of nums) {
      roleMap[num] = type;
    }
  }
  
  lines.push("```json");
  lines.push(JSON.stringify(roleMap, null, 2));
  lines.push("```");
  lines.push("");
  
  // Layout details
  lines.push("## 版式详情");
  lines.push("");
  for (const [layoutNum, layout] of Object.entries(layouts)) {
    lines.push(`### Layout ${layoutNum}: ${layout.name || 'Untitled'}`);
    lines.push("");
    lines.push("| 类型 | 名称 |");
    lines.push("|------|------|");
    for (const ph of layout.placeholders) {
      lines.push(`| ${ph.type} | ${ph.name || '(unnamed)'} |`);
    }
    lines.push("");
  }
  
  // Media assets
  lines.push("## 媒体素材清单");
  lines.push("");
  lines.push(`- 图片数量: ${mediaAssets.images.length}`);
  lines.push("");
  
  // Style tokens
  lines.push("## 风格令牌");
  lines.push("");
  if (Object.keys(principles.styleTokens.colors).length > 0) {
    lines.push("### 颜色方案");
    lines.push("```json");
    lines.push(JSON.stringify(principles.styleTokens.colors, null, 2));
    lines.push("```");
    lines.push("");
  }
  
  if (Object.keys(principles.styleTokens.fonts).length > 0) {
    lines.push("### 字体方案");
    lines.push("```json");
    lines.push(JSON.stringify(principles.styleTokens.fonts, null, 2));
    lines.push("```");
    lines.push("");
  }
  
  // Recommendations
  lines.push("## 设计约束");
  lines.push("");
  for (const rec of principles.recommendations) {
    lines.push(`- [${rec.priority}] ${rec.rule}: ${rec.description}`);
  }
  lines.push("");
  
  return lines.join("\n");
}

// ─── Module Exports ──────────────────────────────────────────────

module.exports = {
  analyzeTemplate,
  extractPptxXml,
  parseSlideElements,
  identifyCommonElements,
  identifyUniqueElements,
  extractStyleTokens,
  extractLayouts,
  extractMediaAssets,
  classifySlideTypes,
  generatePrinciplesMarkdown,
  generateTemplateSpec,
  SLIDE_TYPES,
  COMMON_ELEMENTS_THRESHOLD,
  SCHEMA_VERSION,
};
