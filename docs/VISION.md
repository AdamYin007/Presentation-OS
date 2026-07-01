# AWE Presentation OS Vision
## 1. What We Are Building
AWE Presentation OS is not a PPT generator.
It is a system for creating high-quality professional presentations from structured ideas, business context, evidence, audience needs, and visual logic.
The goal is simple:
Help professionals produce better presentations faster, especially in complex fields such as medical AI, digital pathology, healthcare informatization, medical devices, investment, and enterprise strategy.
AWE should not merely place text on slides.
AWE should help decide:
- What should be said
- Why it matters
- Who needs to hear it
- What the audience should decide
- What visual structure makes the message clear
- How the presentation should look professional and credible
## 2. Current Mission
The current mission is practical:
Build a reliable presentation system that can generate consulting-grade medical and technology presentations.
The Presentation OS Core is domain-agnostic.
Healthcare and medical technology are simply the first production-grade Domain Packs.
Priority use cases include:
- Digital pathology project proposals
- Medical AI platform presentations
- Hospital informatization reports
- Medical device product strategy decks
- Tender and implementation solution decks
- Investor and board-level presentations
- Clinical, research, and academic communication decks
The system must serve real work first.
Architecture exists to support better output, not to become an end in itself.
## 3. Core Product Principle
Presentation quality comes from the combination of:
- Strong story
- Clear decision logic
- Evidence-based claims
- One hero per slide
- Appropriate layout
- Consistent theme
- Professional domain style
- Reliable rendering
AWE should optimize for useful, credible, decision-ready presentations.
## 4. The Architecture
AWE Presentation OS is organized as a domain-agnostic Core Platform plus Domain Packs.
Presentation OS = Core Platform + Domain Packs
### Core Platform
The Core Platform is domain-agnostic.
It contains only engines that have zero knowledge of any industry:
- Story Engine
- Content Engine
- Hero Engine
- Layout Engine
- Theme Engine
- Renderer Engine
- Future Compiler
The Core does NOT know about:
- Digital Pathology
- BNCT
- Ultrasonic Bone Scalpel
- Finance
- Education
The Core only provides Presentation Computing.
### Domain Packs
Domain Packs are platform extensions that carry industry knowledge.
Each Domain Pack may contain:
- Story Templates
- Hero Patterns
- Content Planners
- Theme Variants
- Charts
- Icons
- Terminology
- Validation Rules
- Best Practices
- Example Decks
Examples of Domain Packs:
- Medical AI Pack
- Digital Pathology Pack
- Medical Device Pack
- Investor Pitch Pack
- Enterprise Strategy Pack
- Consulting Pack
- Education Pack
- Research Pack
- Government Pack
- Sales Pack
Third-party developers will be able to create their own Domain Packs.
### Platform Strategy Diagram
Presentation OS
├── Core (domain-agnostic engines)
├── Domain Packs (industry knowledge)
└── Applications (packaged solutions)
Example:
Presentation OS
│
├── Core
│   ├── Story Engine
│   ├── Content Engine
│   ├── Hero Engine
│   ├── Layout Engine
│   ├── Theme Engine
│   ├── Renderer Engine
│   └── Future Compiler
│
├── Domain Packs
│   ├── Medical AI
│   ├── Digital Pathology
│   ├── Medical Devices
│   ├── Finance
│   ├── Consulting
│   ├── Education
│   ├── Sales
│   └── Research
│
└── Applications
    ├── PPT Factory
    ├── Medical Proposal Generator
    ├── Investor Deck Builder
    └── Hospital Presentation Studio
### Story Layer
The Story Layer defines the original narrative.
It answers:
- What is this presentation about?
- Who is the audience?
- What is the slide sequence?
- What is the message of each slide?
The Story Layer should remain simple and readable.
### Content Engine
The Content Engine organizes slide content.
It converts raw story information into structured content such as:
- cards
- takeaways
- workflow steps
- value pillars
- comparison rows
- network nodes
- recommendation actions
The Content Engine should not decide layout.
It decides what content exists.
### Hero Engine
The Hero Engine defines the most important idea on each slide.
It answers:
- What should the audience see first?
- What is the one key message?
- What decision should this slide support?
The guiding rule is:
One slide, one hero.
### Layout Engine
The Layout Engine plans spatial structure.
It decides:
- flow
- density
- zones
- hierarchy
- constraints
- card count
- visual arrangement
The Layout Engine should not own business content.
It decides where content should go.
### Theme Engine
The Theme Engine provides design tokens.
It owns:
- colors
- fonts
- spacing
- radius
- borders
- footer style
- medical consulting visual language
The Theme Engine makes output consistent across slides and future decks.
### Renderer Engine
The Renderer Engine coordinates actual rendering.
It should:
- try layout adapters first
- fall back to legacy renderers when needed
- keep compatibility
- gradually reduce the role of run.js
The Renderer Engine should move the project away from a monolithic rendering script.
### PPTX Output
The current output target is PowerPoint.
Future output targets may include:
- PDF
- HTML
- Google Slides
- Keynote
- images
- video
But the immediate priority is still excellent PowerPoint output.
## 5. Why Not Use AI to Directly Generate PPT?
Large language models are useful, but direct AI-generated slides often suffer from:
- weak structure
- inconsistent layouts
- unstable formatting
- poor visual hierarchy
- unverifiable claims
- difficult maintenance
- low repeatability
AWE takes a different approach.
AI may help generate ideas, content, research, and drafts.
But the presentation itself should be produced by a structured system.
The principle is:
AI helps think.
Engines keep structure.
Templates protect quality.
Rendering stays controlled.
This is why AWE uses engines instead of one-step generation.
## 6. Design Philosophy
AWE follows these long-term principles:
### Engine over logic
Repeated logic should become an engine.
### Data over code
Business content should move toward structured data, not hardcoded renderer logic.
### Composition over duplication
Slide types should be composed from reusable content, layout, theme, and rendering modules.
### Compatibility before disruption
Default output must remain stable while new engines are introduced.
### Professional before decorative
Visual design should serve clarity, credibility, and decision-making.
### Medical-grade communication
Healthcare presentations require trust, evidence, caution, and clarity.
AWE should never sacrifice professionalism for visual novelty.
### Platform over Product
The Core is a platform. Domain Packs are products built on the platform.
Never put industry knowledge into Core Engines.
### Core over Domain
The Core must always remain domain-agnostic.
Industry knowledge belongs exclusively in Domain Packs.
## 7. Domain Packs
Domain Packs carry industry knowledge on top of the Core Platform.
They are NOT the platform itself.
They are extensions that sit on top of domain-agnostic engines.
### Digital Pathology Pack
The Digital Pathology Pack provides:
- hospital digital pathology proposals
- AI and software platform positioning
- pathology workflow transformation
- regional pathology collaboration
- ISO 15189 and CAP quality systems
- pathology data asset strategy
### Medical AI Pack
The Medical AI Pack provides:
- AI workflow integration
- clinical decision support
- algorithm validation
- regulatory and compliance positioning
- hospital AI platform strategy
### Medical Device Pack
The Medical Device Pack provides:
- ultrasonic bone scalpel
- surgical robotics
- pathology scanners
- diagnostic equipment
- clinical adoption strategy
- tender response and implementation planning
### Healthcare Informatization Pack
The Healthcare Informatization Pack provides:
- hospital information platform planning
- department digitalization
- regional medical collaboration
- data governance
- system integration
- project implementation roadmap
### Investment and Board Pack
The Investment and Board Pack provides:
- market opportunity
- competitive landscape
- product roadmap
- commercialization path
- financial logic
- risk and mitigation
## 8. What Success Looks Like
AWE succeeds when a user can provide:
- a topic
- an audience
- a business goal
- source materials
- optional evidence
and receive a presentation that is:
- structurally clear
- visually professional
- audience-appropriate
- evidence-aware
- easy to revise
- suitable for real business use
The output should not feel like generated text placed into slides.
It should feel like a professional presentation prepared by someone who understands both the industry and the decision context.
## 9. Near-Term Focus
The near-term focus should be:
1. Complete high-quality digital pathology pack.
2. Improve medical consulting visual style.
3. Build reusable healthcare presentation patterns.
4. Reduce remaining legacy renderer dependency.
5. Move more business content into Domain Packs, not Core Engine.
6. Establish regression testing for PPT output.
7. Create several real example decks.
8. Use real customer-facing scenarios to drive Domain Pack development.
The next stage should be judged by output quality, not engine count.
## 10. Long-Term Vision
In the long term, AWE Presentation OS evolves through these stages:
### Stage 1: Presentation OS
Domain-agnostic Core Platform with engines.
### Stage 2: Presentation Platform
Core + multiple Domain Packs (medical, finance, education, etc.).
### Stage 3: Domain Ecosystem
Third-party Domain Packs from consulting firms, hospitals, developers.
### Stage 4: Marketplace
A platform where Domain Packs are discoverable, installable, and updatable.
### Stage 5: Presentation Cloud
Cloud-native compilation, multi-tenant, API-first.
### Stage 6: Presentation Agent Network
AI agents coordinate research, drafting, and presentation generation.
The long-term goal is not simply to automate PowerPoint.
The long-term goal is to help professionals communicate complex ideas clearly.
AWE should become a system that turns knowledge, evidence, and intent into persuasive presentations.
Third-party companies, consulting firms, hospitals, and developers will be able to build their own Domain Packs on top of the Core Platform.
## 11. What We Should Avoid
AWE should avoid:
- adding engines before there is a real need
- building architecture for its own sake
- making run.js grow again
- hardcoding business content in renderers
- putting layout logic into adapters
- putting design decisions into story JSON
- generating visually busy slides
- copying generic AI slide styles
- sacrificing evidence and professionalism
- putting industry knowledge into Core Engines
- treating the first Domain Pack as the platform itself
- confusing Domain Packs with the Core Platform
The project should remain practical.
The best architecture is the one that improves output quality and keeps development sustainable.
## 12. Guiding Statement
AWE Presentation OS exists to help professionals create better presentations from complex knowledge.
It is not about drawing slides.
It is about turning structured thinking into clear communication.
The Core Platform is domain-agnostic.
Domain Packs carry industry knowledge.
The system should grow only when growth improves real presentation quality.
