/**
 * Narrative pattern definitions for Story Planner (M12.3).
 *
 * Each pattern defines a sequence of sections, their purposes, and default
 * slide allocations. The planner selects among these based on intent signals.
 */

const NARRATIVE_PATTERNS = [
  {
    id: "problem-insight-solution-action",
    name: "Problem → Insight → Solution → Action",
    description:
      "Classic consulting narrative: identify the problem, present key insight, propose solution, call to action.",
    purposeMatches: ["persuade", "propose", "sell"],
    domainMatches: ["general", "business"],
    sections: [
      { id: "context", title: "Context", purpose: "Set the stage", keyMessage: "Why this matters now", slideAllocation: 1, sourceRefs: [] },
      { id: "problem", title: "Problem", purpose: "Define the core challenge", keyMessage: "What is broken or at risk", slideAllocation: 2, sourceRefs: [] },
      { id: "insight", title: "Insight", purpose: "Present key finding", keyMessage: "The critical data point or observation", slideAllocation: 2, sourceRefs: [] },
      { id: "solution", title: "Solution", purpose: "Propose approach", keyMessage: "How we address the problem", slideAllocation: 3, sourceRefs: [] },
      { id: "action", title: "Action Plan", purpose: "Next steps and timeline", keyMessage: "Concrete actions with owners", slideAllocation: 2, sourceRefs: [] },
    ],
    defaultSlideCount: 10,
  },
  {
    id: "why-what-how-value",
    name: "Why → What → How → Value",
    description:
      "Simon Sinek-inspired structure: start with purpose, define the product/solution, explain execution, close with value.",
    purposeMatches: ["persuade", "sell", "propose"],
    domainMatches: ["general", "business", "technical"],
    sections: [
      { id: "why", title: "Why", purpose: "Purpose and motivation", keyMessage: "The reason this exists", slideAllocation: 1, sourceRefs: [] },
      { id: "what", title: "What", purpose: "Product or concept definition", keyMessage: "What we are building or proposing", slideAllocation: 2, sourceRefs: [] },
      { id: "how", title: "How", purpose: "Execution plan", keyMessage: "How it works in practice", slideAllocation: 3, sourceRefs: [] },
      { id: "value", title: "Value", purpose: "Impact and ROI", keyMessage: "Measurable outcomes", slideAllocation: 2, sourceRefs: [] },
    ],
    defaultSlideCount: 8,
  },
  {
    id: "current-gap-target-roadmap",
    name: "Current State → Gap → Target State → Roadmap",
    description:
      "Strategic planning narrative: where we are, what's missing, where we want to go, how to get there.",
    purposeMatches: ["propose", "review", "inform"],
    domainMatches: ["general", "business"],
    sections: [
      { id: "current", title: "Current State", purpose: "Baseline assessment", keyMessage: "Where we stand today", slideAllocation: 2, sourceRefs: [] },
      { id: "gap", title: "Gap Analysis", purpose: "Identify deficiencies", keyMessage: "What separates current from target", slideAllocation: 2, sourceRefs: [] },
      { id: "target", title: "Target State", purpose: "Vision of success", keyMessage: "What success looks like", slideAllocation: 2, sourceRefs: [] },
      { id: "roadmap", title: "Roadmap", purpose: "Path to target", keyMessage: "Phased milestones and dependencies", slideAllocation: 3, sourceRefs: [] },
    ],
    defaultSlideCount: 9,
  },
  {
    id: "exec-summary-evidence-recommendation",
    name: "Executive Summary → Evidence → Recommendation",
    description:
      "Management briefing format: lead with conclusion, support with evidence, close with recommendation.",
    purposeMatches: ["inform", "persuade", "review"],
    domainMatches: ["general", "business"],
    sections: [
      { id: "exec-summary", title: "Executive Summary", purpose: "Bottom line up front", keyMessage: "Key conclusion and recommendation", slideAllocation: 1, sourceRefs: [] },
      { id: "evidence", title: "Evidence", purpose: "Supporting data", keyMessage: "Facts and figures that justify the conclusion", slideAllocation: 4, sourceRefs: [] },
      { id: "recommendation", title: "Recommendation", purpose: "Actionable next steps", keyMessage: "What decision is needed", slideAllocation: 2, sourceRefs: [] },
    ],
    defaultSlideCount: 7,
  },
  {
    id: "context-analysis-conclusion",
    name: "Context → Analysis → Conclusion",
    description:
      "General analytical narrative: set context, present analysis, draw conclusions.",
    purposeMatches: ["inform", "summarize"],
    domainMatches: ["general", "research", "technical"],
    sections: [
      { id: "context", title: "Context", purpose: "Background and scope", keyMessage: "What we are analyzing and why", slideAllocation: 1, sourceRefs: [] },
      { id: "analysis", title: "Analysis", purpose: "Detailed findings", keyMessage: "Key results of the analysis", slideAllocation: 4, sourceRefs: [] },
      { id: "conclusion", title: "Conclusion", purpose: "Summary and implications", keyMessage: "What the analysis means", slideAllocation: 2, sourceRefs: [] },
    ],
    defaultSlideCount: 7,
  },
  {
    id: "objective-progress-issues-next-steps",
    name: "Objective → Progress → Issues → Next Steps",
    description:
      "Status update narrative: state objectives, report progress, surface issues, define next steps.",
    purposeMatches: ["review", "inform", "summarize"],
    domainMatches: ["general", "business", "technical"],
    sections: [
      { id: "objective", title: "Objectives", purpose: "What we set out to do", keyMessage: "Goals and success criteria", slideAllocation: 1, sourceRefs: [] },
      { id: "progress", title: "Progress", purpose: "Accomplishments to date", keyMessage: "Key milestones achieved", slideAllocation: 3, sourceRefs: [] },
      { id: "issues", title: "Issues & Risks", purpose: "Blockers and concerns", keyMessage: "What needs attention", slideAllocation: 2, sourceRefs: [] },
      { id: "next-steps", title: "Next Steps", purpose: "Upcoming priorities", keyMessage: "Immediate actions and timeline", slideAllocation: 2, sourceRefs: [] },
    ],
    defaultSlideCount: 8,
  },
  {
    id: "market-product-advantage-business-model",
    name: "Market → Product → Advantage → Business Model",
    description:
      "Pitch deck narrative: market opportunity, product solution, competitive advantage, business viability.",
    purposeMatches: ["sell", "persuade", "propose"],
    domainMatches: ["general", "business"],
    sections: [
      { id: "market", title: "Market Opportunity", purpose: "Size and trends", keyMessage: "Why this market matters", slideAllocation: 2, sourceRefs: [] },
      { id: "product", title: "Product / Solution", purpose: "What we offer", keyMessage: "Core value proposition", slideAllocation: 2, sourceRefs: [] },
      { id: "advantage", title: "Competitive Advantage", purpose: "Differentiation", keyMessage: "Why us vs. alternatives", slideAllocation: 2, sourceRefs: [] },
      { id: "business-model", title: "Business Model", purpose: "How we create value", keyMessage: "Revenue, cost, and growth mechanics", slideAllocation: 2, sourceRefs: [] },
    ],
    defaultSlideCount: 8,
  },
  {
    id: "background-method-results-discussion",
    name: "Background → Method → Results → Discussion",
    description:
      "Academic/research narrative: establish background, describe methodology, present results, discuss implications.",
    purposeMatches: ["inform", "teach"],
    domainMatches: ["research", "education"],
    sections: [
      { id: "background", title: "Background", purpose: "Research context", keyMessage: "What is known and the gap", slideAllocation: 2, sourceRefs: [] },
      { id: "method", title: "Methodology", purpose: "Approach and design", keyMessage: "How the research was conducted", slideAllocation: 2, sourceRefs: [] },
      { id: "results", title: "Results", purpose: "Key findings", keyMessage: "What the data shows", slideAllocation: 3, sourceRefs: [] },
      { id: "discussion", title: "Discussion", purpose: "Interpretation and limits", keyMessage: "What results mean for the field", slideAllocation: 2, sourceRefs: [] },
    ],
    defaultSlideCount: 9,
  },
  {
    id: "concept-example-practice-summary",
    name: "Concept → Example → Practice → Summary",
    description:
      "Educational narrative: introduce concept, illustrate with example, guide practice, summarize key takeaways.",
    purposeMatches: ["teach", "inform"],
    domainMatches: ["education"],
    sections: [
      { id: "concept", title: "Concept", purpose: "Learning objective", keyMessage: "Core idea and definitions", slideAllocation: 2, sourceRefs: [] },
      { id: "example", title: "Example", purpose: "Illustration", keyMessage: "Concrete application of the concept", slideAllocation: 2, sourceRefs: [] },
      { id: "practice", title: "Practice", purpose: "Hands-on application", keyMessage: "How learners apply the concept", slideAllocation: 2, sourceRefs: [] },
      { id: "summary", title: "Summary & Key Takeaways", purpose: "Reinforcement", keyMessage: "What to remember", slideAllocation: 1, sourceRefs: [] },
    ],
    defaultSlideCount: 7,
  },
  {
    id: "proposal-scope-plan-budget-risk",
    name: "Proposal → Scope → Plan → Budget → Risk",
    description:
      "Project proposal narrative: define the proposal, scope boundaries, implementation plan, budget, and risk management.",
    purposeMatches: ["propose", "persuade"],
    domainMatches: ["general", "business", "technical"],
    sections: [
      { id: "proposal", title: "Proposal Overview", purpose: "What is being proposed", keyMessage: "High-level description and value", slideAllocation: 1, sourceRefs: [] },
      { id: "scope", title: "Scope", purpose: "Boundaries and deliverables", keyMessage: "What is in and out of scope", slideAllocation: 1, sourceRefs: [] },
      { id: "plan", title: "Implementation Plan", purpose: "Timeline and milestones", keyMessage: "How and when work gets done", slideAllocation: 3, sourceRefs: [] },
      { id: "budget", title: "Budget", purpose: "Resource allocation", keyMessage: "Cost breakdown and justification", slideAllocation: 2, sourceRefs: [] },
      { id: "risk", title: "Risk Management", purpose: "Risks and mitigations", keyMessage: "What could go wrong and how we handle it", slideAllocation: 2, sourceRefs: [] },
    ],
    defaultSlideCount: 9,
  },
];

/**
 * Select the best-fit narrative pattern based on intent signals.
 * Returns the matching pattern object, or null if no match.
 */
function selectNarrativePattern(intent) {
  const { purpose, audience, domain, targetSlideCount } = intent;

  // Score each pattern
  let bestPattern = null;
  let bestScore = -1;

  for (const pattern of NARRATIVE_PATTERNS) {
    let score = 0;

    // Purpose match (highest weight)
    if (pattern.purposeMatches.includes(purpose)) {
      score += 10;
      // Executive summary pattern is preferred for review purposes
      if (pattern.id === "exec-summary-evidence-recommendation" && purpose === "review") {
        score += 3;
      }
      // Problem-solution pattern is preferred for propose/sell
      if (pattern.id === "problem-insight-solution-action" && (purpose === "propose" || purpose === "sell")) {
        score += 2;
      }
    }

    // Domain match
    if (pattern.domainMatches.includes(domain)) {
      score += 5;
    }

    // Audience hints
    if (audience) {
      const audLower = audience.toLowerCase();
      if ((purpose === "teach" || domain === "education") &&
          (audLower.includes("student") || audLower.includes("learn") || audLower.includes("class") || audLower.includes("高中生") || audLower.includes("学生"))) {
        // Boost teaching patterns more than research patterns
        if (pattern.id === "concept-example-practice-summary") {
          score += 10;
        } else {
          score += 6;
        }
      }
      if ((purpose === "inform" || purpose === "review") &&
          (audLower.includes("executive") || audLower.includes("management") || audLower.includes("领导") || audLower.includes("董事会") || audLower.includes("管理"))) {
        score += 6;
      }
      if ((purpose === "inform" || purpose === "summarize") &&
          (audLower.includes("research") || audLower.includes("academic") || audLower.includes("university") || audLower.includes("学者") || audLower.includes("研究"))) {
        score += 6;
      }
    }

    // Slide count fit
    if (targetSlideCount && typeof targetSlideCount === "number") {
      const diff = Math.abs(targetSlideCount - pattern.defaultSlideCount);
      if (diff <= 3) score += 3;
      else if (diff <= 6) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  }

  return bestPattern;
}

module.exports = {
  NARRATIVE_PATTERNS,
  selectNarrativePattern,
};
