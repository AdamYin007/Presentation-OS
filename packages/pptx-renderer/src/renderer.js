/**
 * PPTX Renderer — M12.6 / M12.21
 *
 * Renders SlideSpec[] + LayoutPlan into a real editable .pptx using pptxgenjs.
 * First renderer should be boring but editable and reliable.
 * M12.21: brandConfig options override footer convention and title placement.
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

  const layoutFonts = layoutPlan && layoutPlan.themeTokens && layoutPlan.themeTokens.fonts
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
  const brandConfig = opts.brandConfig && typeof opts.brandConfig === "object" ? opts.brandConfig : null;
  const footerConvention = brandConfig && brandConfig.footerConvention ? brandConfig.footerConvention : "slide-number";
  const titlePlacement = brandConfig && brandConfig.titlePlacement ? brandConfig.titlePlacement : "top";
  const brandName = brandConfig && brandConfig.brandName ? brandConfig.brandName : "";

  for (let i = 0; i < slideSpecs.length; i++) {
    const spec = slideSpecs[i];
    const layout = layoutPlan.layouts.find((l) => l.slideId === spec.id);
    const slideNumber = (typeof spec.index === "number" && spec.index >= 1 && spec.index <= slideSpecs.length)
      ? spec.index
      : i + 1;
    renderSlide(pptx, spec, layout, opts, {
      footerConvention,
      titlePlacement,
      brandName,
      slideNumber,
      totalSlides: slideSpecs.length,
    });
  }

  return pptx;
}

/**
 * Render a single slide based on its SlideSpec and LayoutPlan entry.
 * M12.21: brandRenderOpts controls footer convention and title placement.
 */
function renderSlide(pptx, spec, layout, options, brandRenderOpts) {
  const opts = brandRenderOpts || {};
  const slide = pptx.addSlide();
  const colors = layout ? layout.colors : { background: "#FFFFFF", text: "#1A1A1A" };
  const spacing = layout ? layout.spacing : { padding: 32, margin: 16, gap: 12 };
  const fontSize = layout ? layout.fontSize : { heading: 24, body: 14 };
  const maxWidth = layout ? layout.maxWidth : 800;

  // Background
  slide.background = { fill: colors.background || "#FFFFFF" };

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
      renderClosingSlide(slide, spec, layout, colors, fontSize, maxWidth, titlePlacement, brandName, totalSlides);
      break;
    case "agenda":
      renderAgendaSlide(slide, spec, layout, colors, fontSize, maxWidth);
      break;
    case "executive-summary":
      renderExecutiveSummary(slide, spec, layout, colors, fontSize, maxWidth, spacing);
      break;
    case "data-chart":
      renderDataChartSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, visualType, visualSpec);
      break;
    default:
      // Check if visualType indicates a chart/diagram even for non-data-chart roles
      if (["bar-chart", "line-chart", "metric-cards"].includes(visualType)) {
        renderDataChartSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, visualType, visualSpec);
      } else if (["process", "timeline"].includes(visualType)) {
        renderDiagramSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, visualType, visualSpec);
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
      x: 0.5, y: 7.0, w: maxWidth / 96, h: 0.3,
      fontSize: 8, color: "9CA3AF", align: "left",
    });
  }
}

/**
 * Render title slide.
 * M12.21: titlePlacement controls vertical alignment ("top" or "center").
 */
function renderTitleSlide(slide, spec, layout, colors, fontSize, maxWidth, titlePlacement) {
  const y = titlePlacement === "center" ? 3.0 : 2.5;
  const titleStyle = {
    x: 1, y: y, w: maxWidth / 96, h: 1.5,
    fontSize: fontSize.heading, bold: true, color: colors.text || "#1A1A1A",
    align: "center", valign: "middle",
  };
  slide.addText(spec.title || "Untitled", titleStyle);

  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: 1, y: y + 2.0, w: maxWidth / 96, h: 0.5,
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
 * M12.21: titlePlacement and brandName are applied.
 */
function renderClosingSlide(slide, spec, layout, colors, fontSize, maxWidth, titlePlacement, brandName, totalSlides) {
  const y = titlePlacement === "center" ? 3.0 : 2.5;
  slide.addText(spec.title || "Thank You", {
    x: 1, y: y, w: maxWidth / 96, h: 1.5,
    fontSize: 36, bold: true, color: colors.text || "#1A1A1A",
    align: "center", valign: "middle",
  });

  if (spec.keyMessage) {
    slide.addText(spec.keyMessage, {
      x: 1, y: y + 2.0, w: maxWidth / 96, h: 0.5,
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
 * Render a data chart slide (bar chart, line chart, metric cards).
 * Uses PptxGenJS native shapes for fully editable visuals.
 */
function renderDataChartSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, visualType, visualSpec) {
  // Title
  slide.addText(spec.title || "Chart", {
    x: 0.5, y: 0.3, w: maxWidth / 96, h: 0.8,
    fontSize: fontSize.heading, bold: true, color: colors.text || "#1A1A1A",
  });

  const chartY = 1.3;
  const chartHeight = 4.5;

  if (visualType === "bar-chart") {
    renderBarChart(slide, visualSpec, colors, chartY, chartHeight, maxWidth, spacing);
  } else if (visualType === "line-chart") {
    renderLineChart(slide, visualSpec, colors, chartY, chartHeight, maxWidth, spacing);
  } else if (visualType === "metric-cards") {
    renderMetricCards(slide, visualSpec, colors, chartY, chartHeight, maxWidth, spacing);
  } else {
    // Fallback: render as generic bar chart if series data exists
    if (visualSpec.series && visualSpec.series.length > 0) {
      renderBarChart(slide, visualSpec, colors, chartY, chartHeight, maxWidth, spacing);
    } else {
      // Generic content fallback
      const bodyItems = Array.isArray(spec.body) ? spec.body : [];
      if (bodyItems.length > 0) {
        slide.addText(bodyItems.map((item) => ({
          text: item,
          options: { fontSize: fontSize.body, color: colors.text || "#1A1A1A", bullet: true, lineSpacingAfter: 15 },
        })), {
          x: 0.5, y: chartY, w: maxWidth / 96, h: chartHeight,
          fontSize: fontSize.body, color: colors.text || "#1A1A1A",
        });
      }
    }
  }
}

/**
 * Render a bar chart using PptxGenJS shapes.
 */
function renderBarChart(slide, visualSpec, colors, startY, height, maxWidth, spacing) {
  const series = visualSpec.series || [];
  if (series.length === 0) return;

  // Flatten all values to find max
  let maxValue = 0;
  for (const s of series) {
    for (const v of (s.values || [])) {
      if (v.value > maxValue) maxValue = v.value;
    }
  }
  if (maxValue <= 0) maxValue = 1;

  const palette = visualSpec.colors || [
    colors.accent || "#3B82F6",
    colors.primary || "#1A1A1A",
    "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  ];

  const chartAreaW = maxWidth / 96;
  const chartLeft = 0.8;
  const barGroupCount = (series[0].values || []).length;
  const barGap = 4;
  const barWidth = Math.max(12, Math.floor((chartAreaW * 80 - barGroupCount * barGap) / (barGroupCount * (series.length || 1))));

  let xPos = chartLeft * 96;
  const yBase = startY + height - 0.5;
  const yTop = startY + 0.3;

  // Draw Y-axis label
  if (visualSpec.yAxisLabel) {
    slide.addText(visualSpec.yAxisLabel, {
      x: 0.2, y: startY + height / 2 - 0.3, w: 0.5, h: 1.5,
      fontSize: 8, color: "6B7280", align: "center", rotate: 90,
    });
  }

  // Draw bars for each series
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    const barH = (s.values || []).map((v) => ((v.value / maxValue) * (yBase - yTop)));
    const offsetX = si * barWidth;

    for (let bi = 0; bi < barH.length; bi++) {
      const bh = Math.max(barH[bi], 2);
      slide.addShape("rect", {
        x: xPos + bi * (barWidth + barGap) + offsetX,
        y: yBase - bh,
        w: barWidth,
        h: bh,
        fill: { color: palette[si % palette.length] },
        shadow: { type: "outer", blur: 2, offset: 1, opacity: 0.15, color: "000000" },
      });
      // Value label on top of bar
      slide.addText(String(s.values[bi]?.value ?? ""), {
        x: xPos + bi * (barWidth + barGap) + offsetX,
        y: yBase - bh - 0.3,
        w: barWidth,
        h: 0.3,
        fontSize: 8,
        color: palette[si % palette.length],
        align: "center",
      });
    }
  }

  // X-axis labels
  const firstSeriesValues = (series[0].values || []);
  for (let bi = 0; bi < firstSeriesValues.length; bi++) {
    const label = firstSeriesValues[bi].label || "";
    if (label) {
      slide.addText(label, {
        x: xPos + bi * (barWidth + barGap),
        y: yBase + 0.1,
        w: barWidth,
        h: 0.3,
        fontSize: 8,
        color: "6B7280",
        align: "center",
      });
    }
  }

  // Legend
  if (series.length > 1) {
    let legendX = chartLeft;
    for (let si = 0; si < series.length; si++) {
      slide.addShape("rect", {
        x: legendX, y: startY + height + 0.6, w: 0.3, h: 0.3,
        fill: { color: palette[si % palette.length] },
      });
      slide.addText(series[si].name || "", {
        x: legendX + 0.35, y: startY + height + 0.6, w: 1.5, h: 0.3,
        fontSize: 8, color: "374151",
      });
      legendX += 1.8;
    }
  }
}

/**
 * Render a line chart using PptxGenJS shapes.
 */
function renderLineChart(slide, visualSpec, colors, startY, height, maxWidth, spacing) {
  const series = visualSpec.series || [];
  if (series.length === 0) return;

  // Find min/max for scaling
  let allPoints = [];
  for (const s of series) {
    allPoints = allPoints.concat(s.points || []);
  }
  if (allPoints.length === 0) return;

  let minY = Infinity, maxY = -Infinity, maxX = -Infinity, minX = Infinity;
  for (const p of allPoints) {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    maxX = Math.max(maxX, 1); // use count
    minX = Math.min(minX, 0);
  }
  if (minY === maxY) maxY = minY + 1;
  const yRange = maxY - minY;
  const yPad = yRange * 0.1;

  const palette = visualSpec.colors || [
    colors.accent || "#3B82F6",
    "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  ];

  const chartLeft = 0.8;
  const chartRight = chartLeft + maxWidth / 96 - 0.5;
  const yBase = startY + height - 0.3;
  const yTop = startY + 0.3;
  const chartH = yBase - yTop;
  const chartW = chartRight - chartLeft;

  // Gridlines
  if (visualSpec.showGrid !== false) {
    for (let i = 0; i <= 4; i++) {
      const gy = yTop + (chartH * i) / 4;
      slide.addShape("line", {
        x: chartLeft, y: gy,
        x2: chartRight, y2: gy,
        line: { color: "E5E7EB", width: 0.5 },
      });
    }
  }

  // Draw lines
  for (let si = 0; si < series.length; si++) {
    const pts = series[si].points || [];
    if (pts.length < 2) continue;

    const points = pts.map((p, idx) => ({
      x: chartLeft + (idx / Math.max(pts.length - 1, 1)) * chartW,
      y: yBase - ((p.y - (minY - yPad)) / (yRange + 2 * yPad)) * chartH,
    }));

    // Line
    slide.addShape("polyLine", {
      points,
      line: { color: palette[si % palette.length], width: 2.5 },
    });

    // Points
    for (const pt of points) {
      slide.addShape("ellipse", {
        x: pt.x - 0.06, y: pt.y - 0.06, w: 0.12, h: 0.12,
        fill: { color: palette[si % palette.length] },
      });
    }
  }

  // X-axis labels
  const firstPts = (series[0].points || []);
  for (let i = 0; i < firstPts.length; i++) {
    const x = chartLeft + (i / Math.max(firstPts.length - 1, 1)) * chartW;
    slide.addText(firstPts[i].x || String(i), {
      x: x - 0.3, y: yBase + 0.1, w: 0.6, h: 0.3,
      fontSize: 7, color: "6B7280", align: "center",
    });
  }

  // Legend
  if (series.length > 1) {
    let lx = chartLeft;
    for (let si = 0; si < series.length; si++) {
      slide.addShape("rect", {
        x: lx, y: startY + height + 0.3, w: 0.3, h: 0.2,
        fill: { color: palette[si % palette.length] },
      });
      slide.addText(series[si].name || "", {
        x: lx + 0.35, y: startY + height + 0.3, w: 1.5, h: 0.2,
        fontSize: 8, color: "374151",
      });
      lx += 1.8;
    }
  }
}

/**
 * Render KPI metric cards using PptxGenJS shapes.
 */
function renderMetricCards(slide, visualSpec, colors, startY, height, maxWidth, spacing) {
  const metrics = visualSpec.metrics || [];
  if (metrics.length === 0) return;

  const cols = visualSpec.columns || Math.min(metrics.length, 3);
  const cardW = maxWidth / 96 / cols;
  const cardH = height - 0.5;
  const startX = 0.5;
  const startYInner = startY + 0.5;

  const trendColors = {
    up: "#10B981",
    down: "#EF4444",
    flat: "#6B7280",
  };

  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * cardW;
    const cy = startYInner + row * (cardH + 0.3);

    // Card background
    slide.addShape("roundRect", {
      x: cx, y: cy, w: cardW - 0.1, h: cardH,
      fill: { color: "F9FAFB" },
      rectRadius: 0.15,
      line: { color: "E5E7EB", width: 1 },
    });

    // Metric label
    slide.addText(m.label || "", {
      x: cx + 0.15, y: cy + 0.1, w: cardW - 0.4, h: 0.4,
      fontSize: 10, color: "6B7280", align: "center",
    });

    // Metric value (large)
    slide.addText(String(m.value || ""), {
      x: cx + 0.15, y: cy + 0.5, w: cardW - 0.4, h: 0.8,
      fontSize: 24, bold: true, color: colors.text || "#1A1A1A", align: "center",
    });

    // Trend indicator
    if (m.trend) {
      const arrow = m.trend === "up" ? "\u2191" : m.trend === "down" ? "\u2193" : "\u2192";
      slide.addText(`${arrow} ${m.trend}`, {
        x: cx + 0.15, y: cy + 1.4, w: cardW - 0.4, h: 0.3,
        fontSize: 9, color: trendColors[m.trend] || "#6B7280", align: "center",
      });
    }
  }
}

/**
 * Render a process or timeline diagram slide.
 */
function renderDiagramSlide(slide, spec, layout, colors, fontSize, maxWidth, spacing, visualType, visualSpec) {
  // Title
  slide.addText(spec.title || "Diagram", {
    x: 0.5, y: 0.3, w: maxWidth / 96, h: 0.8,
    fontSize: fontSize.heading, bold: true, color: colors.text || "#1A1A1A",
  });

  if (visualType === "process") {
    renderProcessDiagram(slide, visualSpec, colors, fontSize, maxWidth);
  } else if (visualType === "timeline") {
    renderTimelineDiagram(slide, visualSpec, colors, fontSize, maxWidth);
  } else {
    // Fallback to content
    const bodyItems = Array.isArray(spec.body) ? spec.body : [];
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
}

/**
 * Render a process diagram with connected step boxes.
 */
function renderProcessDiagram(slide, visualSpec, colors, fontSize, maxWidth) {
  const steps = visualSpec.steps || [];
  if (steps.length === 0) return;

  const direction = visualSpec.direction || "horizontal";
  const palette = [
    colors.accent || "#3B82F6",
    "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4",
  ];

  if (direction === "horizontal") {
    const boxW = Math.min(1.5, (maxWidth / 96 - 1) / steps.length - 0.2);
    const boxH = 1.2;
    let xOff = 0.5;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const fill = palette[i % palette.length];

      // Step box
      slide.addShape("roundRect", {
        x: xOff, y: 1.5, w: boxW, h: boxH,
        fill: { color: fill },
        rectRadius: 0.1,
      });

      // Step title
      slide.addText(step.title || `Step ${i + 1}`, {
        x: xOff + 0.05, y: 1.6, w: boxW - 0.1, h: 0.4,
        fontSize: 11, bold: true, color: "#FFFFFF", align: "center",
      });

      // Description
      if (step.description) {
        slide.addText(step.description, {
          x: xOff + 0.05, y: 2.0, w: boxW - 0.1, h: 0.6,
          fontSize: 8, color: "E5E7EB", align: "center",
        });
      }

      // Arrow to next
      if (i < steps.length - 1) {
        slide.addShape("line", {
          x: xOff + boxW, y: 2.1,
          x2: xOff + boxW + 0.2, y2: 2.1,
          line: { color: "9CA3AF", width: 2 },
        });
        // Arrowhead
        slide.addShape("line", {
          x: xOff + boxW + 0.15, y: 2.0,
          x2: xOff + boxW + 0.25, y2: 2.1,
          line: { color: "9CA3AF", width: 2 },
        });
        slide.addShape("line", {
          x: xOff + boxW + 0.15, y: 2.2,
          x2: xOff + boxW + 0.25, y2: 2.1,
          line: { color: "9CA3AF", width: 2 },
        });
      }

      xOff += boxW + 0.2;
    }
  } else {
    // Vertical direction
    const boxW = maxWidth / 96 - 1;
    const boxH = 1.0;
    let yOff = 1.3;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const fill = palette[i % palette.length];

      slide.addShape("roundRect", {
        x: 0.5, y: yOff, w: boxW, h: boxH,
        fill: { color: fill },
        rectRadius: 0.1,
      });

      slide.addText(step.title || `Step ${i + 1}`, {
        x: 0.55, y: yOff + 0.1, w: boxW - 0.1, h: 0.35,
        fontSize: 11, bold: true, color: "#FFFFFF",
      });

      if (step.description) {
        slide.addText(step.description, {
          x: 0.55, y: yOff + 0.45, w: boxW - 0.1, h: 0.4,
          fontSize: 8, color: "E5E7EB",
        });
      }

      // Down arrow
      if (i < steps.length - 1) {
        slide.addShape("line", {
          x: 0.5 + boxW / 2, y: yOff + boxH,
          x2: 0.5 + boxW / 2, y2: yOff + boxH + 0.2,
          line: { color: "9CA3AF", width: 2 },
        });
      }

      yOff += boxH + 0.25;
    }
  }
}

/**
 * Render a timeline diagram with event markers.
 */
function renderTimelineDiagram(slide, visualSpec, colors, fontSize, maxWidth) {
  const events = visualSpec.events || [];
  if (events.length === 0) return;

  const timelineY = 2.0;
  const lineW = maxWidth / 96 - 1;
  const lineX = 0.5;

  // Timeline line
  slide.addShape("line", {
    x: lineX, y: timelineY,
    x2: lineX + lineW, y2: timelineY,
    line: { color: "D1D5DB", width: 2 },
  });

  const eventW = lineW / events.length;

  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    const cx = lineX + i * eventW + eventW / 2;
    const fill = colors.accent || "#3B82F6";

    // Circle marker
    slide.addShape("ellipse", {
      x: cx - 0.08, y: timelineY - 0.08, w: 0.16, h: 0.16,
      fill: { color: fill },
      line: { color: "FFFFFF", width: 2 },
    });

    // Year/title above
    slide.addText(evt.year || "", {
      x: cx - eventW / 4, y: 1.2, w: eventW / 2, h: 0.3,
      fontSize: 10, bold: true, color: fill, align: "center",
    });

    // Event title below
    slide.addText(evt.title || "", {
      x: cx - eventW / 4, y: timelineY + 0.3, w: eventW / 2, h: 0.4,
      fontSize: 9, bold: true, color: colors.text || "#1A1A1A", align: "center",
    });

    // Description below
    if (evt.description) {
      slide.addText(evt.description, {
        x: cx - eventW / 4, y: timelineY + 0.7, w: eventW / 2, h: 0.6,
        fontSize: 7, color: "6B7280", align: "center",
      });
    }
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
  return fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
}

/**
 * M12.21: Apply brand-driven footer to a slide.
 * Respects footerConvention from brand profile:
 *   - "none": no footer
 *   - "slide-number": page N of total
 *   - "brand-name": company/brand name
 *   - "both": brand name + page number
 */
function applyBrandFooter(slide, spec, layout, totalSlides, footerConvention, brandName, slideNumber) {
  if (!footerConvention || footerConvention === "none") return;

  const maxWidth = layout ? layout.maxWidth : 800;
  let footerText = "";
  const page = slideNumber || (typeof spec.index === "number" && spec.index >= 1 ? spec.index : 1);
  const total = totalSlides || page;

  switch (footerConvention) {
    case "slide-number":
      footerText = `${page} / ${total}`;
      break;
    case "brand-name":
      if (brandName) {
        footerText = brandName;
      } else {
        // Fallback to slide-number when brand name not provided
        footerText = `${page} / ${total}`;
      }
      break;
    case "both":
      if (brandName) {
        footerText = `© ${brandName} | ${page} / ${total}`;
      } else {
        footerText = `${page} / ${total}`;
      }
      break;
    default:
      // Unknown convention — fallback to slide-number
      footerText = `${page} / ${total}`;
      break;
  }

  if (!footerText) return;

  slide.addText(footerText, {
    x: 0.5, y: 7.0, w: maxWidth / 96, h: 0.3,
    fontSize: 8, color: "9CA3AF", align: "right",
  });
}

module.exports = {
  renderPptx,
  generateBuffer,
  applyBrandFooter,
  normalizeFontFace,
};
