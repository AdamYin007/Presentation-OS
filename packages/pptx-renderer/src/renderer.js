/**
 * PPTX Renderer — M12.6 / M12.21 / M12.26 / M12.31 (P2-5: dynamic positioning)
 *
 * Renders SlideSpec[] + LayoutPlan into a real editable .pptx using pptxgenjs.
 * M12.21: brandConfig options override footer convention and title placement.
 * M12.26: templateBackgrounds option enables template-style background images.
 * M12.31: P2-5 — all render functions now use layout.spacing for dynamic positioning.
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

  // P2-5: Helper to convert spacing pixels to inches (96 DPI standard)
  const pxToIn = (px) => px / 96;

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
      pxToIn, // P2-5: pass pixel-to-inch converter
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
  const pxToIn = opts.pxToIn || ((px) => px / 96); // P2-5: pixel to inch conversion
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
      renderTitleSlide(slide, spec, layout, colors, fontSize, maxWidth, titlePlacement, pxToIn);
      break;
    case "section-divider":
      renderSectionDivider(slide, spec, layout, colors, fontSize, maxWidth, pxToIn);
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
        pxToIn,
      );
      break;
    case "agenda":
      renderAgendaSlide(slide, spec, layout, colors, fontSize, maxWidth, pxToIn);
      break;
    case "executive-summary":
      renderExecutiveSummary(slide, spec, layout, colors, fontSize, maxWidth, spacing, pxToIn);
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
        pxToIn,
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
          pxToIn,
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
          pxToIn,
        );
      } else {
        renderContentSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, bodyItems, pxToIn);
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
function renderTitleSlide(slide, spec, layout, colors, fontSize, maxWidth, titlePlacement, pxToIn) {
  // P2-5: Use spacing for dynamic positioning
  const paddingTop = layout && layout.spacing ? layout.spacing.paddingTop : 120;
  const baseY = pxToIn(paddingTop);
  const y = titlePlacement === "center" ? baseY + 1.5 : baseY;
  const titleStyle = {
    x: 1,
    y: y,
    w: maxWidth / 96,
    h: 1.5,
    fontSize: 28,
    bold: true,
    color: colors.text || "#1A1A1A",
    align: "center",
    valign: "middle",
  };
  slide.addText(spec.title || "Untitled", titleStyle);

  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: 1,
      y: y + pxToIn(32), // P2-5: gap between title and subtitle
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
function renderSectionDivider(slide, spec, layout, colors, fontSize, maxWidth, pxToIn) {
  // P2-5: Use spacing for dynamic positioning
  const paddingTop = layout && layout.spacing ? layout.spacing.paddingTop : 160;
  const baseY = pxToIn(paddingTop);
  slide.addText(spec.title || "", {
    x: 1,
    y: baseY,
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
  pxToIn,
) {
  // P2-5: Use spacing for dynamic positioning
  const paddingTop = layout && layout.spacing ? layout.spacing.paddingTop : 120;
  const baseY = pxToIn(paddingTop);
  const y = titlePlacement === "center" ? baseY + 1.5 : baseY;
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
      y: y + pxToIn(32), // P2-5: gap
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
function renderAgendaSlide(slide, spec, layout, colors, fontSize, maxWidth, pxToIn) {
  // P2-5: Use spacing for dynamic positioning
  const paddingTop = layout && layout.spacing ? layout.spacing.paddingTop : 32;
  const marginTop = layout && layout.spacing ? layout.spacing.margin : 16;
  const titleY = pxToIn(paddingTop);
  slide.addText(spec.title || "Agenda", {
    x: 0.5,
    y: titleY,
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
        y: titleY + pxToIn(48), // P2-5: gap after title
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
function renderExecutiveSummary(slide, spec, layout, colors, fontSize, maxWidth, spacing, pxToIn) {
  // P2-5: Use spacing for dynamic positioning
  const paddingTop = layout && layout.spacing ? layout.spacing.paddingTop : 32;
  const titleY = pxToIn(paddingTop);
  slide.addText(spec.title || "", {
    x: 0.5,
    y: titleY,
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
        y: titleY + pxToIn(48), // P2-5: gap after title
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
function renderContentSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, bodyItems, pxToIn) {
  // P2-5: Use spacing for dynamic positioning
  const paddingTop = layout && layout.spacing ? layout.spacing.paddingTop : 32;
  const titleY = pxToIn(paddingTop);
  slide.addText(spec.title || "", {
    x: 0.5,
    y: titleY,
    w: 5.5,
    h: 0.7,
    fontSize: fontSize.heading,
    bold: true,
    color: colors.text || "#1A1A1A",
  });

  if (bodyItems && bodyItems.length > 0) {
    // Position text below the central graphic to avoid overlap with cloud/ripple background
    // P2-5: Use spacing-based calculation instead of hardcoded 2.7
    const gapAfterTitle = layout && layout.spacing ? layout.spacing.gap : 12;
    const textY = titleY + pxToIn(48) + pxToIn(gapAfterTitle);
    const textH = Math.min(3.0, bodyItems.length * 0.52);
    // Add semi-transparent white backing box for readability over cloud graphics
    slide.addShape("roundRect", {
      x: 0.4,
      y: textY - pxToIn(16),
      w: 5.7,
      h: textH + pxToIn(16),
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
function renderDataChartSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, visualType, visualSpec, pxToIn) {
  // P2-5: Use spacing for dynamic positioning
  const paddingTop = layout && layout.spacing ? layout.spacing.paddingTop : 32;
  const titleY = pxToIn(paddingTop);
  slide.addText(spec.title || "", {
    x: 0.5,
    y: titleY,
    w: maxWidth / 96,
    h: 0.8,
    fontSize: fontSize.heading,
    bold: true,
    color: colors.text || "#1A1A1A",
  });

  // Chart rendering handled by pptxgenjs addChart
  if (visualSpec && visualSpec.chartType) {
    // Placeholder for chart data — P2-5: use spacing-based Y
    const chartY = titleY + pxToIn(48);
    slide.addShape("rect", {
      x: 0.5,
      y: chartY,
      w: maxWidth / 96,
      h: 4,
      fill: { color: colors.background || "#FFFFFF" },
      line: { color: "D1D5DB", width: 1 },
    });
    slide.addText("Chart placeholder", {
      x: 0.5,
      y: chartY + 2.0,
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
function renderDiagramSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, visualType, visualSpec, pxToIn) {
  // P2-5: Use spacing for dynamic positioning
  const paddingTop = layout && layout.spacing ? layout.spacing.paddingTop : 32;
  const titleY = pxToIn(paddingTop);
  slide.addText(spec.title || "", {
    x: 0.5,
    y: titleY,
    w: maxWidth / 96,
    h: 0.8,
    fontSize: fontSize.heading,
    bold: true,
    color: colors.text || "#1A1A1A",
  });

  if (visualType === "process" && visualSpec && visualSpec.steps) {
    const stepW = maxWidth / 96 / visualSpec.steps.length;
    // P2-5: Calculate step Y based on title position + gap
    const stepsY = titleY + pxToIn(48);
    visualSpec.steps.forEach((step, i) => {
      slide.addShape("rect", {
        x: 0.5 + i * stepW,
        y: stepsY,
        w: stepW * 0.8,
        h: 1.0,
        fill: { color: colors.accent || "#3B82F6" },
        line: { color: "FFFFFF", width: 2 },
      });
      slide.addText(step.title || "", {
        x: 0.5 + i * stepW,
        y: stepsY + pxToIn(16),
        w: stepW * 0.8,
        h: 0.5,
        fontSize: 10,
        color: "FFFFFF",
        align: "center",
        valign: "middle",
      });
    });
  } else if (visualType === "timeline" && visualSpec && visualSpec.events) {
    // P2-5: Calculate timeline Y based on title position
    const timelineY = titleY + pxToIn(48);
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
        y: timelineY - pxToIn(48),
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
        y: timelineY + pxToIn(16),
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
          y: timelineY + pxToIn(40),
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
