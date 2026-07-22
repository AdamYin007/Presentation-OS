# AWE Presentation OS

**AI-powered presentation engine for developers and automation workflows.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@awe/core.svg)](https://www.npmjs.com/package/@awe/core)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

---

## 🎯 What is AWE?

AWE Presentation OS is a **programmatic presentation generation engine** that converts Markdown into professional `.pptx` files with AI-powered features:

- **Audience Engine** — Dynamically adapts content based on speaker profile × audience role
- **Presentation Compiler** — Global optimization layer for overflow detection, pagination, and resource deduplication
- **Pack Ecosystem** — Pluggable industry templates (digital pathology, finance, legal, etc.)
- **MCP Protocol** — Integrates with Claude, Codex, GitHub Copilot, and other AI Agents

Unlike Gamma or Beautiful.ai (which are Web UI tools), AWE is **code-first** — designed for embedding into CI/CD pipelines, automated reporting systems, and enterprise workflows.

---

## 🚀 Quick Start

### Install CLI

```bash
npm install -g @awe/cli
```

### Generate from Markdown

```bash
echo "# My Presentation\n\n## Slide 1\n\n- Point A\n- Point B" > input.md

awe run input.md -o output.pptx --compiler --audience
```

### Use as Library

```javascript
const { runPipeline } = require("@awe/core");

const result = await runPipeline("# Hello World\n\n## Features\n\n- AI-powered slides", {
  compiler: true,
  audienceEngine: {
    speaker: "executive",
    audience: "board"
  }
});

// result.pptxBuffer is a Node.js Buffer containing .pptx file
```

---

## 📦 Packages

| Package | Description | Status |
|---------|-------------|--------|
| `@awe/core` | Main pipeline library | ✅ v1.0.0 |
| `@awe/cli` | Command-line interface | ✅ v1.0.0 |
| `@awe/compiler` | Presentation Compiler | ✅ v1.0.0 |
| `@awe/audience-engine` | Audience adaptation engine | ✅ v1.0.0 |
| `@awe/presentation-pipeline` | End-to-end pipeline | ✅ v1.0.0 |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│            AWE Presentation OS              │
├─────────────────────────────────────────────┤
│                                             │
│         Shared Core Engine (Open Core)      │
│   ├── Intent Parser                         │
│   ├── Story Planner                         │
│   ├── Audience Engine                       │
│   ├── Presentation Compiler                 │
│   └── PPTX Renderer                         │
│                                             │
├─────────────────────┬───────────────────────┤
│                     │                       │
│    C 端产品          │    B 端产品            │
│   (Web App)         │   (API + SDK)         │
│                     │                       │
│  ┌───────────────┐  │  ┌───────────────┐    │
│  │ awe.app       │  │  │ @awe/cli      │    │
│  │ - 自然语言生成 │  │  │ - 嵌入工作流   │    │
│  │ - 模板市场     │  │  │ - REST API    │    │
│  │ - 协作分享     │  │  │ - MCP Server  │    │
│  │ - 品牌 Profile │  │  │ - On-premise  │    │
│  └───────────────┘  │  └───────────────┘    │
│                     │                       │
│  免费试用 → Pro $9/mo│  API $0.50/deck      │
│  Pack $5-15/个      │  Enterprise 定制       │
│                     │                       │
└─────────────────────┴───────────────────────┘
```

---

## 🎨 Features

### Audience Engine

Adapt your presentation based on who is presenting and who is listening:

```javascript
{
  speaker: "executive",
  audience: "board"
}
// → Adjusts title depth, terminology level, visual priorities
```

### Presentation Compiler

Optimize your deck before rendering:

- **Fast Mode** — Quick draft generation
- **Standard Mode** — Regular presentations
- **Optimized Mode** — Production-ready with accessibility checks

### Pack Ecosystem

Install industry-specific templates:

```bash
awe pack install digital-pathology
awe pack install finance-compliance
awe pack install legal-contracts
```

---

## 📖 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Release Process](docs/RELEASE_PROCESS.md)
- [Commercialization Research](docs/COMMERCIALIZATION_RESEARCH.md)

---

## 🛠️ Development

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
npm run check
```

### Lint & Format

```bash
npm run lint
npm run format
```

---

## 💰 Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 5 decks/month, basic templates, 10 API requests/min |
| **Personal Pro** | $9/mo | Unlimited decks, all packs, Audience Engine, no watermark |
| **Developer Pro** | $29/mo | 500 API decks/month, Brand Profile API, MCP Server |
| **Team** | $99/mo | Shared brand profiles, collaboration, 2000 API decks/month |
| **Enterprise** | Custom | On-premise deployment, SSO/SAML, SLA 99.9%, private packs |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Reporting Issues

- Bug reports: [GitHub Issues](https://github.com/your-org/awe/issues)
- Feature requests: [GitHub Discussions](https://github.com/your-org/awe/discussions)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with ❤️ by the AWE Team.

Special thanks to the open-source community and all contributors who make this project possible.

---

<div align="center">

**Made with passion for better presentations**

[Website](https://awe.app) · [Documentation](https://docs.awe.app) · [GitHub](https://github.com/your-org/awe)

</div>
