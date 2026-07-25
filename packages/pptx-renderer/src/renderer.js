/**
 * PPTX Renderer — M12.6 / M12.21 / M12.26
 *
 * Renders SlideSpec[] + LayoutPlan into a real editable .pptx using pptxgenjs.
 * M12.21: brandConfig options override footer convention and title placement.
 * M12.26: templateBackgrounds option enables template-style background images.
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

  const layoutFonts =
    layoutPlan && layoutPlan.themeTokens && layoutPlan.themeTokens.fonts
      ? layoutPlan.themeTokens.fonts
      : {};
  const headFontFace = normalizeFontFace(layoutFonts.heading);
  const bodyFontFace = normalizeFontFace(layoutFonts.body);
  if (headFontFace || bodyFontFace) {
    pptx.theme = {
      headFontFace: headFontFace || bodyFontFace,
      bodyFontFace: bodyFontFace || headFontFace,
      lang: "en-US",
    };
  }

  // M12.21: extract brand profile config for rendering overrides
  const brandConfig =
    opts.brandConfig && typeof opts.brandConfig === "object" ? opts.brandConfig : null;
  const footerConvention =
    brandConfig && brandConfig.footerConvention ? brandConfig.footerConvention : "slide-number";
  const titlePlacement =
    brandConfig && brandConfig.titlePlacement ? brandConfig.titlePlacement : "top";
  const brandName = brandConfig && brandConfig.brandName ? brandConfig.brandName : "";

  // M12.26: template background mapping
  const templateBackgrounds = opts.templateBackgrounds || null;

  for (let i = 0; i < slideSpecs.length; i++) {
    const spec = slideSpecs[i];
    const layout = layoutPlan.layouts.find((l) => l.slideId === spec.id);
    const slideNumber =
      typeof spec.index === "number" && spec.index >= 1 && spec.index <= slideSpecs.length
        ? spec.index
        : i + 1;
    renderSlide(pptx, spec, layout, opts, {
      footerConvention,
      titlePlacement,
      brandName,
      slideNumber,
      totalSlides: slideSpecs.length,
      templateBackgrounds,
    });
  }

  return pptx;
}

/**
 * Render a single slide based on its SlideSpec and LayoutPlan entry.
 * M12.21: brandRenderOpts controls footer convention and title placement.
 * M12.26: templateBackgrounds injects template background images.
 */
function renderSlide(pptx, spec, layout, options, brandRenderOpts) {
  const opts = brandRenderOpts || {};
  const slide = pptx.addSlide();
  const colors = layout ? layout.colors : { background: "#FFFFFF", text: "#1A1A1A" };
  const spacing = layout ? layout.spacing : { padding: 32, margin: 16, gap: 12 };
  const fontSize = layout ? layout.fontSize : { heading: 24, body: 14 };
  const maxWidth = layout ? layout.maxWidth : 800;

  // M12.26: Apply template background if configured
  const templateBackgrounds = opts.templateBackgrounds;
  if (templateBackgrounds) {
    const bgImage = resolveTemplateBackground(templateBackgrounds, spec.role, slide);
    if (bgImage) {
      slide.background = { type: "image", path: bgImage };
    } else {
      slide.background = { fill: colors.background || "#FFFFFF" };
    }
  } else {
    // Background
    slide.background = { fill: colors.background || "#FFFFFF" };
  }

  const role = spec.role || "content";
  const visualType = spec.visualType || "none";
  const visualSpec = spec.visualSpec || {};
  const bodyItems = Array.isArray(spec.body) ? spec.body : [];
  const speakerNotes = spec.speakerNotes || "";

  const footerConvention = opts.footerConvention || "slide-number";
  const titlePlacement = opts.titlePlacement || "top";
  const brandName = opts.brandName || "";
  const slideNumber = opts.slideNumber || (typeof spec.index === "number" ? spec.index : 1);
  const totalSlides = opts.totalSlides || pptx.slides.length;

  switch (role) {
    case "title":
      renderTitleSlide(slide, spec, layout, colors, fontSize, maxWidth, titlePlacement);
      break;
    case "section-divider":
      renderSectionDivider(slide, spec, layout, colors, fontSize, maxWidth);
      break;
    case "closing":
      renderClosingSlide(
        slide,
        spec,
        layout,
        colors,
        fontSize,
        maxWidth,
        titlePlacement,
        brandName,
        totalSlides,
      );
      break;
    case "agenda":
      renderAgendaSlide(slide, spec, layout, colors, fontSize, maxWidth);
      break;
    case "executive-summary":
      renderExecutiveSummary(slide, spec, layout, colors, fontSize, maxWidth, spacing);
      break;
    case "data-chart":
      renderDataChartSlide(
        slide,
        spec,
        layout,
        colors,
        fontSize,
        maxWidth,
        spacing,
        visualType,
        visualSpec,
      );
      break;
    default:
      // Check if visualType indicates a chart/diagram even for non-data-chart roles
      if (["bar-chart", "line-chart", "metric-cards"].includes(visualType)) {
        renderDataChartSlide(
          slide,
          spec,
          layout,
          colors,
          fontSize,
          maxWidth,
          spacing,
          visualType,
          visualSpec,
        );
      } else if (["process", "timeline"].includes(visualType)) {
        renderDiagramSlide(
          slide,
          spec,
          layout,
          colors,
          fontSize,
          maxWidth,
          spacing,
          visualType,
          visualSpec,
        );
      } else {
        renderContentSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, bodyItems);
      }
      break;
  }

  // Speaker notes
  if (speakerNotes && speakerNotes.trim().length > 0) {
    slide.addNotes(speakerNotes);
  }

  // M12.21: Brand-driven footer convention
  applyBrandFooter(slide, spec, layout, totalSlides, footerConvention, brandName, slideNumber);

  // Source references remain as a left footer for traceability.
  if (layout && spec.sourceRefs && spec.sourceRefs.length > 0) {
    const refs = spec.sourceRefs.map((r) => r.sourceId).join(", ");
    slide.addText(refs, {
      x: 0.5,
      y: 7.0,
      w: maxWidth / 96,
      h: 0.3,
      fontSize: 8,
      color: "9CA3AF",
      align: "left",
    });
  }
}

/**
 * Resolve template background image for a slide.
 * M12.26: Supports role-based and index-based lookup.
 */
function resolveTemplateBackground(templateBackgrounds, role, slide) {
  if (!templateBackgrounds) return null;

  // Try role-based lookup first
  if (templateBackgrounds[role]) {
    return templateBackgrounds[role];
  }

  // Alias: title → cover (diagnostic fix P0-2)
  const roleAliases = { "title": "cover" };
  if (roleAliases[role] && templateBackgrounds[roleAliases[role]]) {
    return templateBackgrounds[roleAliases[role]];
  }

  // Try generic "content" fallback for unspecified roles
  if (templateBackgrounds.content && !templateBackgrounds[role]) {
    return templateBackgrounds.content;
  }

  return null;
}

/**
 * Render title slide.
 * M12.21: titlePlacement controls vertical alignment ("top" or "center").
 */
function renderTitleSlide(slide, spec, layout, colors, fontSize, maxWidth, titlePlacement) {
  const y = titlePlacement === "center" ? 3.0 : 2.5;
  const titleStyle = {
    x: 1,
    y: y,
    w: maxWidth / 96,
    h: 1.5,
    fontSize: fontSize.heading,
    bold: true,
    color: colors.text || "#1A1A1A",
    align: "center",
    valign: "middle",
  };
  slide.addText(spec.title || "Untitled", titleStyle);

  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: 1,
      y: y + 2.0,
      w: maxWidth / 96,
      h: 0.5,
      fontSize: 16,
      color: colors.secondaryText || "#6B7280",
      align: "center",
      valign: "middle",
    });
  }
}

/**
 * Render section divider slide.
 */
function renderSectionDivider(slide, spec, layout, colors, fontSize, maxWidth) {
  slide.addText(spec.title || "", {
    x: 1,
    y: 2.5,
    w: maxWidth / 96,
    h: 2,
    fontSize: 36,
    bold: true,
    color: colors.text || "#1A1A1A",
    align: "center",
    valign: "middle",
  });
}

/**
 * Render closing slide.
 * M12.21: titlePlacement and brandName are applied.
 */
function renderClosingSlide(
  slide,
  spec,
  layout,
  colors,
  fontSize,
  maxWidth,
  titlePlacement,
  brandName,
  totalSlides,
) {
  const y = titlePlacement === "center" ? 3.0 : 2.5;
  slide.addText(spec.title || "Thank You", {
    x: 1,
    y: y,
    w: maxWidth / 96,
    h: 1.5,
    fontSize: 36,
    bold: true,
    color: colors.text || "#1A1A1A",
    align: "center",
    valign: "middle",
  });

  if (spec.keyMessage) {
    slide.addText(spec.keyMessage, {
      x: 1,
      y: y + 2.0,
      w: maxWidth / 96,
      h: 0.5,
      fontSize: 16,
      color: colors.secondaryText || "#6B7280",
      align: "center",
      valign: "middle",
    });
  }
}

/**
 * Render agenda slide.
 */
function renderAgendaSlide(slide, spec, layout, colors, fontSize, maxWidth) {
  slide.addText(spec.title || "Agenda", {
    x: 0.5,
    y: 0.5,
    w: maxWidth / 96,
    h: 0.8,
    fontSize: 28,
    bold: true,
    color: colors.text || "#1A1A1A",
  });

  const bodyItems = Array.isArray(spec.body) ? spec.body : [];
  if (bodyItems.length > 0) {
    slide.addText(
      bodyItems.map((item) => ({
        text: item,
        options: {
          fontSize: 16,
          color: colors.text || "#1A1A1A",
          bullet: true,
          lineSpacingAfter: 20,
        },
      })),
      {
        x: 0.5,
        y: 1.5,
        w: maxWidth / 96,
        h: 5,
        fontSize: 16,
        color: colors.text || "#1A1A1A",
      },
    );
  }
}

/**
 * Render executive summary slide.
 */
function renderExecutiveSummary(slide, spec, layout, colors, fontSize, maxWidth, spacing) {
  slide.addText(spec.title || "", {
    x: 0.5,
    y: 0.3,
    w: maxWidth / 96,
    h: 0.8,
    fontSize: 24,
    bold: true,
    color: colors.text || "#1A1A1A",
  });

  const bodyItems = Array.isArray(spec.body) ? spec.body : [];
  if (bodyItems.length > 0) {
    slide.addText(
      bodyItems.map((item) => ({
        text: item,
        options: {
          fontSize: 14,
          color: colors.text || "#1A1A1A",
          bullet: true,
          lineSpacingAfter: 15,
        },
      })),
      {
        x: 0.5,
        y: 1.2,
        w: maxWidth / 96,
        h: 5.5,
        fontSize: 14,
        color: colors.text || "#1A1A1A",
      },
    );
  }
}

/**
 * Render content slide with bullet points.
 */
function renderContentSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, bodyItems) {
  slide.addText(spec.title || "", {
    x: 0.5,
    y: 0.3,
    w: 5.5,
    h: 0.7,
    fontSize: fontSize.heading,
    bold: true,
    color: colors.text || "#1A1A1A",
  });

  if (bodyItems && bodyItems.length > 0) {
    // Position text below the central graphic to avoid overlap with cloud/ripple background
    const textY = 2.7;
    const textH = Math.min(3.0, bodyItems.length * 0.52);
    // Add semi-transparent white backing box for readability over cloud graphics
    slide.addShape("roundRect", {
      x: 0.4,
      y: textY - 0.15,
      w: 5.7,
      h: textH + 0.3,
      fill: { color: "FFFFFF", transparency: 35 },
      rectRadius: 0.06,
      line: { color: "E8F4F8", width: 0.5 },
    });

    slide.addText(
      bodyItems.map((item) => ({
        text: item,
        options: {
          fontSize: fontSize.body,
          color: colors.text || "#1A1A1A",
          bullet: true,
          lineSpacingAfter: 10,
        },
      })),
      {
        x: 0.5,
        y: textY,
        w: 5.5,
        h: textH,
        fontSize: fontSize.body,
        color: colors.text || "#1A1A1A",
      },
    );
  }
}

/**
 * Render data/chart slide.
 */
function renderDataChartSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, visualType, visualSpec) {
  slide.addText(spec.title || "", {
    x: 0.5,
    y: 0.3,
    w: maxWidth / 96,
    h: 0.8,
    fontSize: fontSize.heading,
    bold: true,
    color: colors.text || "#1A1A1A",
  });

  // Chart rendering handled by pptxgenjs addChart
  if (visualSpec && visualSpec.chartType) {
    // Placeholder for chart data
    slide.addShape("rect", {
      x: 0.5,
      y: 1.2,
      w: maxWidth / 96,
      h: 4,
      fill: { color: colors.background || "#FFFFFF" },
      line: { color: "D1D5DB", width: 1 },
    });
    slide.addText("Chart placeholder", {
      x: 0.5,
      y: 3.0,
      w: maxWidth / 96,
      h: 0.5,
      fontSize: 14,
      color: "9CA3AF",
      align: "center",
    });
  }
}

/**
 * Render diagram slide (process, timeline, roadmap).
 */
function renderDiagramSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, visualType, visualSpec) {
  slide.addText(spec.title || "", {
    x: 0.5,
    y: 0.3,
    w: maxWidth / 96,
    h: 0.8,
    fontSize: fontSize.heading,
    bold: true,
    color: colors.text || "#1A1A1A",
  });

  if (visualType === "process" && visualSpec && visualSpec.steps) {
    const stepW = maxWidth / 96 / visualSpec.steps.length;
    visualSpec.steps.forEach((step, i) => {
      slide.addShape("rect", {
        x: 0.5 + i * stepW,
        y: 2.0,
        w: stepW * 0.8,
        h: 1.0,
        fill: { color: colors.accent || "#3B82F6" },
        line: { color: "FFFFFF", width: 2 },
      });
      slide.addText(step.title || "", {
        x: 0.5 + i * stepW,
        y: 2.2,
        w: stepW * 0.8,
        h: 0.5,
        fontSize: 10,
        color: "FFFFFF",
        align: "center",
        valign: "middle",
      });
    });
  } else if (visualType === "timeline" && visualSpec && visualSpec.events) {
    const timelineY = 3.0;
    const lineX = 0.5;
    const lineW = maxWidth / 96 - 1.0;

    // Timeline line (use addShape 'line' — PptxGenJS v4 has no addLine)
    slide.addShape("line", {
      x: lineX,
      y: timelineY,
      w: lineW,
      h: 0,
      line: { color: "D1D5DB", width: 2 },
    });

    const eventW = lineW / visualSpec.events.length;

    visualSpec.events.forEach((evt, i) => {
      const cx = lineX + i * eventW + eventW / 2;
      const fill = colors.accent || "#3B82F6";

      // Circle marker
      slide.addShape("ellipse", {
        x: cx - 0.08,
        y: timelineY - 0.08,
        w: 0.16,
        h: 0.16,
        fill: { color: fill },
        line: { color: "FFFFFF", width: 2 },
      });

      // Year/title above
      slide.addText(evt.year || "", {
        x: cx - eventW / 4,
        y: 1.2,
        w: eventW / 2,
        h: 0.3,
        fontSize: 10,
        bold: true,
        color: fill,
        align: "center",
      });

      // Event title below
      slide.addText(evt.title || "", {
        x: cx - eventW / 4,
        y: timelineY + 0.3,
        w: eventW / 2,
        h: 0.4,
        fontSize: 9,
        bold: true,
        color: colors.text || "#1A1A1A",
        align: "center",
      });

      // Description below
      if (evt.description) {
        slide.addText(evt.description, {
          x: cx - eventW / 4,
          y: timelineY + 0.7,
          w: eventW / 2,
          h: 0.6,
          fontSize: 7,
          color: "6B7280",
          align: "center",
        });
      }
    });
  }
}

/**
 * Generate a buffer from the PptxGenJS instance.
 */
async function generateBuffer(pptx) {
  return await pptx.write({ outputType: "nodebuffer" });
}

function normalizeFontFace(fontFamily) {
  if (typeof fontFamily !== "string" || !fontFamily.trim()) return null;
  return fontFamily
    .split(",")[0]
    .trim()
    .replace(/^[\"']|[\"']$/g, "");
}

/**
 * M12.21: Apply brand-driven footer to a slide.
 * Supports footerConvention values:
 *   - "none": no footer
 *   - "slide-number": e.g. "1 / 3" (spaces around /)
 *   - "brand-name": just the brand name
 *   - "both": "© BrandName | 1 / 3"
 */
function applyBrandFooter(slide, spec, layout, totalSlides, footerConvention, brandName, slideNumber) {
  if (footerConvention === "none") return;

  let footerText = "";
  if (footerConvention === "brand-name" && brandName) {
    footerText = brandName;
  } else if (footerConvention === "both" && brandName) {
    footerText = `© ${brandName} | ${slideNumber} / ${totalSlides}`;
  } else if (footerConvention === "slide-number") {
    footerText = `${slideNumber} / ${totalSlides}`;
  } else if (brandName) {
    // fallback: treat unknown as brand
    footerText = `${brandName} | ${slideNumber} / ${totalSlides}`;
  } else {
    footerText = `${slideNumber} / ${totalSlides}`;
  }

  slide.addText(footerText, {
    x: 6.0,
    y: 7.0,
    w: 2.0,
    h: 0.3,
    fontSize: 9,
    color: "9CA3AF",
    align: "right",
  });
}

module.exports = {
  renderPptx,
  generateBuffer,
  normalizeFontFace,
  applyBrandFooter,
};
