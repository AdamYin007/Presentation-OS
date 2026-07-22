/**
 * Phase 1: Deep Reading & Intent Recognition
 *
 * Analyzes document type, audience, core arguments, and purpose.
 * Pure rule-based inference — no LLM dependency.
 */

const PURPOSE_RULES = [
  { patterns: [/汇报|复盘|总结|经营分析|年度|季度|月度/i, /review|retrospective|business review|quarterly|annual/i], value: "review" },
  { patterns: [/方案|提案|建议|规划|设计|架构/i, /proposal|solution|plan|design|architecture/i], value: "persuade" },
  { patterns: [/教学|培训|课程|课件|入门|教程/i, /teach|training|course|tutorial|lesson/i], value: "teach" },
  { patterns: [/分享|介绍|概述|背景|综述/i, /share|introduce|overview|background|survey/i], value: "inform" },
  { patterns: [/答辩|评审|论证|论证/i, /defense|appraisal|justification/i], value: "defend" },
];

const DOCUMENT_TYPE_RULES = [
  { patterns: [/汇报|报告|述职|总结/i], value: "汇报" },
  { patterns: [/教学|培训|课程|课件|入门|教程/i], value: "教学" },
  { patterns: [/营销|推广|宣传|广告|品牌/i], value: "营销" },
  { patterns: [/技术|架构|工程|分布式|微服务|云原生|开发/i], value: "技术分享" },
  { patterns: [/商业|市场|销售|产品|运营|投资/i], value: "商业" },
];

const DOMAIN_RULES = [
  { patterns: [/技术|架构|工程|分布式|微服务|云原生/i, /tech|architecture|engineering|distributed|microservice|cloud-native/i], value: "technical" },
  { patterns: [/医疗|临床|健康|医院|病理科/i, /medical|healthcare|clinical|hospital/i], value: "medical" },
  { patterns: [/政府|政策|公共部门|政务/i, /government|policy|public sector/i], value: "government" },
  { patterns: [/学术|研究|论文|实验|数据/i, /academic|research|paper|experiment/i], value: "research" },
  { patterns: [/商业|市场|销售|产品|运营/i, /business|market|sales|product|operations/i], value: "business" },
  { patterns: [/教育|学生|学校|培训/i, /education|student|school/i], value: "education" },
];

function analyzeIntent(rawText) {
  const text = rawText || "";

  // Infer purpose
  let purpose = "inform";
  for (const rule of PURPOSE_RULES) {
    if (rule.patterns.some(p => p.test(text))) {
      purpose = rule.value;
      break;
    }
  }

  // Infer document type (汇报/教学/营销/技术分享)
  let documentType = "通用";
  for (const rule of DOCUMENT_TYPE_RULES) {
    if (rule.patterns.some(p => p.test(text))) {
      documentType = rule.value;
      break;
    }
  }

  // Infer domain
  let domain = "general";
  for (const rule of DOMAIN_RULES) {
    if (rule.patterns.some(p => p.test(text))) {
      domain = rule.value;
      break;
    }
  }

  // Infer language
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const hasEnglish = /[A-Za-z]/.test(text);
  let language = "zh-CN";
  if (hasChinese && !hasEnglish) language = "zh-CN";
  else if (!hasChinese && hasEnglish) language = "en-US";
  else language = hasChinese ? "zh-CN" : "en-US";

  // Infer audience from context clues
  let audience = "professional audience";
  if (/高管|董事会|c-level|executive|board/i.test(text)) audience = "executive management";
  else if (/客户|potential client|prospect/i.test(text)) audience = "clients";
  else if (/学生|teacher|student/i.test(text)) audience = "students";
  else if (/技术|developer|engineer|架构/i.test(text)) audience = "technical audience";
  else if (/医生|clinical|medical|医院/i.test(text)) audience = "medical professionals";

  // Extract top-level headings as key themes
  const headings = extractHeadings(text);
  const keyThemes = headings.slice(0, 5);

  // Detect data-rich sections (for chart suggestions)
  const dataSignals = detectDataSignals(text);

  return {
    purpose,
    documentType,
    domain,
    language,
    audience,
    keyThemes,
    dataSignals,
    estimatedSlideCount: estimateSlideCount(headings, text),
  };
}

function extractHeadings(text) {
  const headings = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Match # Heading, ## Heading, ### Heading
    const match = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
      });
    }
  }

  return headings;
}

function detectDataSignals(text) {
  const signals = [];

  // Look for numbers with units
  if (/\d+\s*(?:%|万元|亿元|百万|千万|万|人|台|套|个)/i.test(text)) {
    signals.push("percentages-and-amounts");
  }

  // Look for comparison keywords
  if (/增长|下降|提升|降低|超过|低于|高于|低于/i.test(text)) {
    signals.push("trends-and-comparisons");
  }

  // Look for ranking/ordering
  if (/第一|第二|第三|领先|最高|最低|排名/i.test(text)) {
    signals.push("rankings");
  }

  // Look for process/steps
  if (/第一步|第二步|阶段|步骤|流程|环节/i.test(text)) {
    signals.push("process-steps");
  }

  return signals;
}

function estimateSlideCount(headings, text) {
  // Base estimate from heading count
  const headingCount = headings.filter(h => h.level <= 2).length;

  // Minimum 5 slides, maximum 30
  let estimate = Math.max(5, Math.min(headingCount * 2 + 2, 30));

  // Boost for data-rich content
  if (/数据|分析|统计|图表|metrics|data|analysis/i.test(text)) {
    estimate += 3;
  }

  return estimate;
}

module.exports = {
  analyzeIntent,
};
