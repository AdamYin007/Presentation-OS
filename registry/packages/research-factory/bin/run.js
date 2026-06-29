#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const i = args.indexOf("--" + name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}

const topic = getArg("topic", "Untitled Research Topic");
const out = getArg("out", path.join(process.cwd(), "output", "research-factory"));

fs.mkdirSync(out, { recursive: true });

const content = `# Research Brief: ${topic}

## 1. Research Question

${topic}

## 2. Evidence Plan

- Official websites
- Regulatory databases
- Academic papers
- Tender/procurement records
- Market reports
- Competitor materials

## 3. Preliminary Structure

### Background
To be researched.

### Key Findings
To be filled with evidence.

### Evidence Table
| Claim | Source | Confidence | Notes |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

### Risks
- Unverified claims
- Outdated data
- Vendor marketing language

## 4. Next Step

Run evidence collection and source verification.
`;

fs.writeFileSync(path.join(out, "research-brief.md"), content);
console.log("✅ research brief generated:");
console.log(path.join(out, "research-brief.md"));
