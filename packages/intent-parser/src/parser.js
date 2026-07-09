const {
  createDefaultPresentationIntent,
  validatePresentationIntent,
} = require("./schema.js");

const PURPOSE_RULES = [
  { value: "teach", patterns: [/course|lesson|class|training|tutorial|workshop|teach/i, /课程|课件|教学|培训|入门|课堂/] },
  { value: "persuade", patterns: [/pitch|proposal|sell|fundraising|convince/i, /路演|提案|销售|融资|说服|招商/] },
  { value: "review", patterns: [/review|retrospective|business review|quarterly|annual/i, /复盘|汇报|总结|经营分析|年度|季度/] },
  { value: "summarize", patterns: [/summary|summarize|briefing|overview/i, /摘要|概览|简报|总结/] },
  { value: "defend", patterns: [/defense|defend|thesis/i, /答辩|辩护/] },
  { value: "inform", patterns: [/report|brief|explain|introduction/i, /报告|介绍|说明/] },
];

const STYLE_RULES = [
  { value: "technology-dark", patterns: [/tech|technology|dark|futuristic/i, /科技|深色|未来感/] },
  { value: "business-consulting", patterns: [/consulting|strategy|board|executive/i, /咨询|战略|董事会|高管/] },
  { value: "academic-clean", patterns: [/academic|research|paper|conference/i, /学术|论文|研究|会议/] },
  { value: "education-friendly", patterns: [/student|school|teacher|education/i, /学生|高中生|小学生|教育|老师/] },
  { value: "government-formal", patterns: [/government|policy|public sector/i, /政府|政策|公文/] },
  { value: "medical-technology", patterns: [/medical|healthcare|clinical/i, /医疗|临床|健康/] },
  { value: "creative-colorful", patterns: [/creative|colorful|playful/i, /创意|活泼|彩色/] },
  { value: "minimal-modern", patterns: [/minimal|modern|clean/i, /简洁|现代|清爽/] },
];

const TONE_RULES = [
  { value: "executive", patterns: [/executive|board|c-level/i, /董事会|高管|管理层/] },
  { value: "educational", patterns: [/student|teach|training|lesson/i, /学生|教学|培训|入门/] },
  { value: "formal", patterns: [/formal|official/i, /正式|严肃|公文/] },
  { value: "professional", patterns: [/professional|business/i, /专业|商务/] },
  { value: "friendly", patterns: [/friendly|casual|simple/i, /通俗|轻松|友好/] },
];

function parsePresentationIntent(prompt = "", { sourceDocument = null, defaults = {} } = {}) {
  const text = String(prompt || "").trim();
  const assumptions = [];
  const intent = createDefaultPresentationIntent(defaults);

  intent.language = inferLanguage(text, sourceDocument, assumptions);
  intent.topic = inferTopic(text, sourceDocument, assumptions);
  intent.audience = inferAudience(text, assumptions);
  intent.purpose = inferFromRules(text, PURPOSE_RULES, intent.purpose, "purpose", assumptions);
  intent.targetSlideCount = inferSlideCount(text, sourceDocument, assumptions);
  intent.durationMinutes = inferDuration(text, intent.targetSlideCount, assumptions);
  intent.tone = inferFromRules(text, TONE_RULES, intent.tone, "tone", assumptions);
  intent.style = inferFromRules(text, STYLE_RULES, intent.style, "style", assumptions);
  intent.contentDensity = inferDensity(text, assumptions);
  intent.visualPreference = inferVisualPreference(text, assumptions);
  intent.speakerNotes = inferSpeakerNotes(text);
  intent.mustInclude = extractListAfterMarkers(text, ["must include", "include", "包含", "必须包含", "需要包含"]);
  intent.mustEmphasize = extractListAfterMarkers(text, ["emphasize", "highlight", "重点突出", "突出", "强调"]);
  intent.mustAvoid = extractListAfterMarkers(text, ["avoid", "must avoid", "不要", "避免"]);
  intent.domain = inferDomain(text, assumptions);
  intent.assumptions = dedupe([...intent.assumptions, ...assumptions]);

  const validation = validatePresentationIntent(intent);
  if (!validation.ok) {
    throw new Error(`Invalid PresentationIntent: ${validation.errors.join(", ")}`);
  }

  return intent;
}

function inferLanguage(text, sourceDocument, assumptions) {
  if (/English|英语|英文/i.test(text)) return "en-US";
  if (/Chinese|中文|汉语/i.test(text)) return "zh-CN";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN";
  if (/[A-Za-z]/.test(text)) return "en-US";
  if (sourceDocument?.metadata?.language) return sourceDocument.metadata.language;
  assumptions.push("Language defaulted to zh-CN.");
  return "zh-CN";
}

function inferTopic(text, sourceDocument, assumptions) {
  const quoted = text.match(/["“](.+?)["”]/);
  if (quoted) return cleanTopic(quoted[1]);

  const topicPatterns = [
    /(?:about|on|for)\s+(.+?)(?:,|\.|;|$)/i,
    /(?:主题|关于|围绕|制作一份|生成一份|做一份)(.+?)(?:，|。|；|,|\.|$)/,
  ];
  for (const pattern of topicPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanTopic(match[1]);
  }

  if (sourceDocument?.title) {
    assumptions.push("Topic inferred from SourceDocumentModel title.");
    return sourceDocument.title;
  }

  assumptions.push("Topic defaulted because prompt and source did not provide a clear subject.");
  return "Untitled presentation";
}

function inferAudience(text, assumptions) {
  const patterns = [
    /(?:for|to|aimed at|audience:?)\s+([^,.。；;]+)/i,
    /(?:面向|给|受众是|听众是)([^，。；;]+)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return trimPhrase(match[1]);
  }
  assumptions.push("Audience defaulted to general professional audience.");
  return "general professional audience";
}

function inferFromRules(text, rules, fallback, field, assumptions) {
  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(text))) return rule.value;
  }
  assumptions.push(`${field} defaulted to ${fallback}.`);
  return fallback;
}

function inferSlideCount(text, sourceDocument, assumptions) {
  const match = text.match(/(\d+)[\s-]*(?:slides?|pages?|页|张|P)/i);
  if (match) return clampInt(Number(match[1]), 1, 80);

  const paraCount = Array.isArray(sourceDocument?.paragraphs) ? sourceDocument.paragraphs.length : 0;
  if (paraCount > 0) {
    assumptions.push("Slide count inferred from source document length.");
    return clampInt(Math.ceil(paraCount / 3) + 3, 6, 24);
  }

  assumptions.push("Slide count defaulted to 12.");
  return 12;
}

function inferDuration(text, slideCount, assumptions) {
  const match = text.match(/(\d+)\s*(?:minutes?|mins?|分钟)/i);
  if (match) return clampInt(Number(match[1]), 1, 240);
  assumptions.push("Duration inferred from target slide count.");
  return Math.max(5, Math.round(slideCount * 1.25));
}

function inferDensity(text, assumptions) {
  if (/dense|detailed|文字多|详细|信息量大/i.test(text)) return "dense";
  if (/sparse|concise|\bbrief\b|少文字|简洁|精简/i.test(text)) return "sparse";
  assumptions.push("Content density defaulted to medium.");
  return "medium";
}

function inferVisualPreference(text, assumptions) {
  if (/visual-heavy|more visuals|图片|图表|流程图|多使用数据图表/i.test(text)) return "visual-heavy";
  if (/text-heavy|文字为主/i.test(text)) return "text-heavy";
  assumptions.push("Visual preference defaulted to balanced.");
  return "balanced";
}

function inferSpeakerNotes(text) {
  if (/no speaker notes|without notes|不要演讲稿|不要备注/i.test(text)) return false;
  return true;
}

function inferDomain(text, assumptions) {
  if (/medical|healthcare|clinical|医疗|临床|健康/i.test(text)) return "medical";
  if (/government|policy|政府|政策/i.test(text)) return "government";
  if (/education|student|school|教学|教育|学生|高中生|课件|课程/i.test(text)) return "education";
  if (/research|academic|paper|研究|学术|论文/i.test(text)) return "research";
  if (/business|market|sales|经营|商业|市场|销售/i.test(text)) return "business";
  if (/technical|architecture|engineering|技术|架构|工程/i.test(text)) return "technical";
  assumptions.push("Domain defaulted to general.");
  return "general";
}

function extractListAfterMarkers(text, markers) {
  const items = [];
  for (const marker of markers) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`${escaped}[:：]?\\s*([^。.;\\n]+)`, "i");
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = match[1]
        .replace(/\b(?:avoid|must avoid)\b.*$/i, "")
        .replace(/(?:不要|避免).*$/, "");
      items.push(...splitItems(value));
    }
  }
  return dedupe(items.map(trimPhrase).filter(Boolean));
}

function splitItems(value) {
  return value.split(/[,，、/]| and | 和 |和/i).map((item) => item.trim());
}

function cleanTopic(value) {
  return trimPhrase(value)
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/^(份|个|关于|主题为)/, "")
    .trim();
}

function trimPhrase(value) {
  return String(value || "").replace(/\s+/g, " ").replace(/[，。；;,.]+$/g, "").trim();
}

function clampInt(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

module.exports = {
  parsePresentationIntent,
  inferLanguage,
  inferTopic,
  inferAudience,
};
