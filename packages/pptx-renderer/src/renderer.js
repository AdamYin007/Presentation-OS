/**
 * PPTX Renderer — M12.6
 *
 * Renders SlideSpec[] + LayoutPlan into a real editable .pptx using pptxgenjs.
 * First renderer should be boring but editable and reliable.
 */

"use strict";

const PptxGenJS = require("pptxgenjs");
const { RENDER_OPTIONS_DEFAULTS } = require("./schema.js");

/**
 * Render SlideSpec[] + LayoutPlan into a PptxGenJS instance.
 * Returns the PptxGenJS object (call .write() on it for output).
 */
function renderPptx(slideSpecs, layoutPlan, options) {
  const opts = { ...RENDER_OPTIONS_DEFAULTS, ...(options || {}) };
  const pptx = new PptxGenJS();
  pptx.author = opts.author;
  if (opts.company) pptx.company = opts.company;
  if (opts.subject) pptx.subject = opts.subject;

  for (let i = 0; i < slideSpecs.length; i++) {
    const spec = slideSpecs[i];
    const layout = layoutPlan.layouts.find((l) => l.slideId === spec.id);
    renderSlide(pptx, spec, layout, opts);
  }

  return pptx;
}

/**
 * Render a single slide based on its SlideSpec and LayoutPlan entry.
 */
function renderSlide(pptx, spec, layout, options) {
  const slide = pptx.addSlide();
  const colors = layout ? layout.colors : { background: "#FFFFFF", text: "#1A1A1A" };
  const spacing = layout ? layout.spacing : { padding: 32, margin: 16, gap: 12 };
  const fontSize = layout ? layout.fontSize : { heading: 24, body: 14 };
  const maxWidth = layout ? layout.maxWidth : 800;

  // Background
  slide.background = { fill: colors.background || "#FFFFFF" };

  const role = spec.role || "content";
  const title = spec.title || "";
  const bodyItems = Array.isArray(spec.body) ? spec.body : [];
  const speakerNotes = spec.speakerNotes || "";

  switch (role) {
    case "title":
      renderTitleSlide(slide, spec, layout, colors, fontSize, maxWidth);
      break;
    case "section-divider":
      renderSectionDivider(slide, spec, layout, colors, fontSize, maxWidth);
      break;
    case "closing":
      renderClosingSlide(slide, spec, layout, colors, fontSize, maxWidth);
      break;
    case "agenda":
      renderAgendaSlide(slide, spec, layout, colors, fontSize, maxWidth);
      break;
    case "executive-summary":
      renderExecutiveSummary(slide, spec, layout, colors, fontSize, maxWidth, spacing);
      break;
    default:
      renderContentSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, bodyItems);
      break;
  }

  // Speaker notes
  if (speakerNotes && speakerNotes.trim().length > 0) {
    slide.addNotes(speakerNotes);
  }

  // Source references as footer if any
  if (layout && spec.sourceRefs && spec.sourceRefs.length > 0) {
    const refs = spec.sourceRefs.map((r) => r.sourceId).join(", ");
    slide.addText(refs, {
      x: 0.5, y: 7.0, w: maxWidth / 96, h: 0.3,
      fontSize: 8, color: "9CA3AF", align: "left",
    });
  }
}

/**
 * Render title slide.
 */
function renderTitleSlide(slide, spec, layout, colors, fontSize, maxWidth) {
  const titleStyle = {
    x: 1, y: 2.5, w: maxWidth / 96, h: 1.5,
    fontSize: fontSize.heading, bold: true, color: colors.text || "#1A1A1A",
    align: "center", valign: "middle",
  };
  slide.addText(spec.title || "Untitled", titleStyle);

  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: 1, y: 4.2, w: maxWidth / 96, h: 0.5,
      fontSize: 16, color: colors.secondaryText || "#6B7280",
      align: "center", valign: "middle",
    });
  }
}

/**
 * Render section divider slide.
 */
function renderSectionDivider(slide, spec, layout, colors, fontSize, maxWidth) {
  slide.addText(spec.title || "", {
    x: 1, y: 2.5, w: maxWidth / 96, h: 2,
    fontSize: 36, bold: true, color: colors.text || "#1A1A1A",
    align: "center", valign: "middle",
  });
}

/**
 * Render closing slide.
 */
function renderClosingSlide(slide, spec, layout, colors, fontSize, maxWidth) {
  slide.addText(spec.title || "Thank You", {
    x: 1, y: 2.5, w: maxWidth / 96, h: 1.5,
    fontSize: 36, bold: true, color: colors.text || "#1A1A1A",
    align: "center", valign: "middle",
  });

  if (spec.keyMessage) {
    slide.addText(spec.keyMessage, {
      x: 1, y: 4.2, w: maxWidth / 96, h: 0.5,
      fontSize: 16, color: colors.secondaryText || "#6B7280",
      align: "center", valign: "middle",
    });
  }
}

/**
 * Render agenda slide.
 */
function renderAgendaSlide(slide, spec, layout, colors, fontSize, maxWidth) {
  slide.addText(spec.title || "Agenda", {
    x: 0.5, y: 0.5, w: maxWidth / 96, h: 0.8,
    fontSize: 28, bold: true, color: colors.text || "#1A1A1A",
  });

  const bodyItems = Array.isArray(spec.body) ? spec.body : [];
  if (bodyItems.length > 0) {
    slide.addText(bodyItems.map((item) => ({
      text: item,
      options: { fontSize: 16, color: colors.text || "#1A1A1A", bullet: true, lineSpacingAfter: 20 },
    })), {
      x: 0.5, y: 1.5, w: maxWidth / 96, h: 5,
      fontSize: 16, color: colors.text || "#1A1A1A",
    });
  }
}

/**
 * Render executive summary slide.
 */
function renderExecutiveSummary(slide, spec, layout, colors, fontSize, maxWidth, spacing) {
  slide.addText(spec.title || "", {
    x: 0.5, y: 0.3, w: maxWidth / 96, h: 0.8,
    fontSize: 24, bold: true, color: colors.text || "#1A1A1A",
  });

  const bodyItems = Array.isArray(spec.body) ? spec.body : [];
  if (bodyItems.length > 0) {
    slide.addText(bodyItems.map((item) => ({
      text: item,
      options: { fontSize: 14, color: colors.text || "#1A1A1A", bullet: true, lineSpacingAfter: 15 },
    })), {
      x: 0.5, y: 1.2, w: maxWidth / 96, h: 5.5,
      fontSize: 14, color: colors.text || "#1A1A1A",
    });
  }
}

/**
 * Render generic content slide with title and bullets.
 */
function renderContentSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, bodyItems) {
  // Title
  slide.addText(spec.title || "", {
    x: 0.5, y: 0.3, w: maxWidth / 96, h: 0.8,
    fontSize: fontSize.heading, bold: true, color: colors.text || "#1A1A1A",
  });

  // Body items
  if (bodyItems.length > 0) {
    slide.addText(bodyItems.map((item) => ({
      text: item,
      options: { fontSize: fontSize.body, color: colors.text || "#1A1A1A", bullet: true, lineSpacingAfter: 15 },
    })), {
      x: 0.5, y: 1.2, w: maxWidth / 96, h: 5.5,
      fontSize: fontSize.body, color: colors.text || "#1A1A1A",
    });
  }
}

/**
 * Generate a buffer from the PptxGenJS instance.
 */
async function generateBuffer(pptx) {
  return await pptx.write({ outputType: "nodebuffer" });
}

module.exports = {
  renderPptx,
  generateBuffer,
};
