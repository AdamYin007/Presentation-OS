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
The first target domain is healthcare and medical technology.
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
- Professional medical style
- Reliable rendering
AWE should optimize for useful, credible, decision-ready presentations.
## 4. The Architecture
AWE Presentation OS currently follows a layered architecture:
Story Layer
↓
Content Engine
↓
Hero Engine
↓
Layout Engine
↓
Theme Engine
↓
Renderer Engine
↓
PPTX Output
Each layer has one responsibility.
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
## 7. Practical Product Direction
The next stage should focus less on creating more engines and more on creating strong domain capability.
The highest-value direction is to build excellent medical and healthcare presentation assets.
Priority domains:
### Digital Pathology
AWE should become capable of generating strong decks for:
- hospital digital pathology proposals
- AI and software platform positioning
- pathology workflow transformation
- regional pathology collaboration
- ISO 15189 and CAP quality systems
- pathology data asset strategy
### Medical AI
AWE should support decks about:
- AI workflow integration
- clinical decision support
- algorithm validation
- regulatory and compliance positioning
- hospital AI platform strategy
### Medical Devices
AWE should support product and market decks for:
- ultrasonic bone scalpel
- surgical robotics
- pathology scanners
- diagnostic equipment
- clinical adoption strategy
- tender response and implementation planning
### Healthcare Informatization
AWE should support:
- hospital information platform planning
- department digitalization
- regional medical collaboration
- data governance
- system integration
- project implementation roadmap
### Investment and Board Decks
AWE should support:
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
1. Complete high-quality digital pathology deck generation.
2. Improve medical consulting visual style.
3. Build reusable healthcare presentation patterns.
4. Reduce remaining legacy renderer dependency.
5. Move more business content into Content Engine.
6. Establish regression testing for PPT output.
7. Create several real example decks.
8. Use real customer-facing scenarios to drive architecture decisions.
The next stage should be judged by output quality, not engine count.
## 10. Long-Term Vision
In the long term, AWE Presentation OS can become a platform where:
- AI agents research and draft content
- Content Engine structures the material
- Hero Engine clarifies the key message
- Layout Engine plans the visual form
- Theme Engine applies professional style
- Renderer Engine outputs the presentation
- future Compiler coordinates the full pipeline
The long-term goal is not simply to automate PowerPoint.
The long-term goal is to help professionals communicate complex ideas clearly.
AWE should become a system that turns knowledge, evidence, and intent into persuasive presentations.
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
The project should remain practical.
The best architecture is the one that improves output quality and keeps development sustainable.
## 12. Guiding Statement
AWE Presentation OS exists to help professionals create better presentations from complex knowledge.
It is not about drawing slides.
It is about turning structured thinking into clear communication.
The system should grow only when growth improves real presentation quality.
