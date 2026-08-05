/**
 * Image-Based PPT Generator Module
 *
 * Supports:
 * - Agnes Image API (agnes-image-2.1-flash)
 * - OpenAI DALL-E 3 / GPT-Image-2
 * - Azure OpenAI (image generation)
 * - Custom OpenAI-compatible APIs
 *
 * Features:
 * - Prompt generation from SlideSpec
 * - Sample preview (2-3 slides)
 * - Full PPT generation
 */

"use strict";

const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

// ── Configuration ─────────────────────────────────────────────────

const API_CONFIG = {
  // Agnes Image API (primary)
  "agnes-image-2.1-flash": {
    endpoint: "https://apihub.agnes-ai.cn/v1/images/generations",
    model: "agnes-image-2.1-flash",
    size: "1792x1024",
    quality: "hd",
  },
  // OpenAI DALL-E 3
  "dall-e-3": {
    endpoint: "https://api.openai.com/v1/images/generations",
    model: "dall-e-3",
    size: "1792x1024",
    quality: "hd",
  },
  // OpenAI GPT-Image-2
  "gpt-image-2": {
    endpoint: "https://api.openai.com/v1/images/generations",
    model: "gpt-image-2",
    size: "1792x1024",
    quality: "hd",
  },
  // Azure OpenAI (image generation)
  azure: {
    endpoint: "",  // e.g., https://your-resource.openai.azure.com/openai/deployments/your-deployment/images/generations:submit?api-version=2024-02-01
    model: "",
    size: "1024x1024",
  },
  // Custom API (OpenAI compatible)
  custom: {
    endpoint: "",
    model: "",
    size: "1024x1024",
  },
};

const STYLE_PRESETS = {
  "business-professional": {
    style: "professional",
    colors: ["#1a365d", "#2c5282", "#4299e1", "#63b3ed", "#90cdf4"],
    mood: "clean, corporate, trustworthy",
    lighting: "soft, even",
    composition: "minimalist, lots of white space",
  },
  "tech-modern": {
    style: "modern",
    colors: ["#0d1117", "#161b22", "#21262d", "#58a6ff", "#79c0ff"],
    mood: "futuristic, innovative, tech-savvy",
    lighting: "dramatic, neon accents",
    composition: "dynamic, geometric",
  },
  "minimalist": {
    style: "minimalist",
    colors: ["#ffffff", "#f7fafc", "#edf2f7", "#cbd5e0", "#a0aec0"],
    mood: "clean, simple, elegant",
    lighting: "natural, soft shadows",
    composition: "balanced, grid-based",
  },
  "creative-vibrant": {
    style: "creative",
    colors: ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff"],
    mood: "energetic, playful, bold",
    lighting: "bright, saturated",
    composition: "asymmetric, dynamic",
  },
};

// ── Prompt Generation ─────────────────────────────────────────────

function generateImagePrompt(slideSpec, style, options = {}) {
  const styleConfig = STYLE_PRESETS[style] || STYLE_PRESETS["business-professional"];

  const parts = [
    `Professional presentation slide titled "${slideSpec.title}"`,
    `Key message: ${slideSpec.keyMessage}`,
    `${styleConfig.style} style, ${styleConfig.mood} atmosphere`,
    `Color palette: ${styleConfig.colors.slice(0, 3).join(", ")}`,
    `${styleConfig.composition} layout`,
    `${styleConfig.lighting} lighting`,
    `${options.aspectRatio || "16:9"} aspect ratio`,
    `${options.quality || "hd"} quality`,
  ];

  return parts.join(", ");
}

function generateAllImagePrompts(slideSpecs, style, options = {}) {
  return slideSpecs.map((spec, index) => ({
    slideIndex: index,
    slideId: spec.id,
    prompt: generateImagePrompt(spec, style, options),
    spec,
  }));
}

// ── Image Generation ──────────────────────────────────────────────

async function generateImages(prompts, options = {}) {
  const {
    apiKey,
    api = "dall-e-3",
    endpoint,
    model,
    size,
    azureApiKey,
  } = options;

  const resolvedApiKey = apiKey || azureApiKey || process.env.OPENAI_API_KEY;
  if (!resolvedApiKey) {
    throw new Error("API key required. Pass apiKey option or set OPENAI_API_KEY environment variable.");
  }

  const apiConfig = API_CONFIG[api] || API_CONFIG["dall-e-3"];
  const resolvedModel = model || apiConfig.model;
  const resolvedSize = size || apiConfig.size;
  const resolvedEndpoint = endpoint || apiConfig.endpoint;

  const results = [];

  for (const promptItem of prompts) {
    try {
      const imageUrl = await callImageGenerationAPI({
        apiKey: resolvedApiKey,
        model: resolvedModel,
        prompt: promptItem.prompt,
        size: resolvedSize,
        endpoint: resolvedEndpoint,
        n: 1,
      });

      results.push({ ...promptItem, imageUrl, status: "success" });
    } catch (error) {
      results.push({ ...promptItem, imageUrl: null, status: "error", error: error.message });
    }
  }

  return results;
}

async function callImageGenerationAPI({ apiKey, model, prompt, size, endpoint, n = 1 }) {
  const isAzure = endpoint && endpoint.includes("openai.azure.com");

  let url;
  let headers = { "Content-Type": "application/json" };
  let body;

  if (isAzure) {
    url = endpoint;
    headers["api-key"] = apiKey;
    body = JSON.stringify({ prompt, n, size, model });
  } else {
    url = endpoint || "https://api.openai.com/v1/images/generations";
    headers["Authorization"] = `Bearer ${apiKey}`;
    body = JSON.stringify({ model, prompt, n, size });
  }

  const response = await fetch(url, { method: "POST", headers, body });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image generation failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (data.data && data.data[0]) {
    return data.data[0].url || data.data[0].b64_json;
  }

  throw new Error("Unexpected API response format");
}

// ── Sample Preview ────────────────────────────────────────────────

async function generateSamplePreview(slideSpecs, style, options = {}) {
  const {
    apiKey,
    api = "dall-e-3",
    count = 3,
    outputDir = "./image-ppt-preview",
  } = options;

  fs.mkdirSync(outputDir, { recursive: true });

  // Select sample slides: first, middle, last
  const sampleIndices = [];
  if (slideSpecs.length >= 3) {
    sampleIndices.push(0);
    sampleIndices.push(Math.floor(slideSpecs.length / 2));
    sampleIndices.push(slideSpecs.length - 1);
  } else if (slideSpecs.length >= 2) {
    sampleIndices.push(0);
    sampleIndices.push(slideSpecs.length - 1);
  } else {
    sampleIndices.push(0);
  }

  const samplePrompts = sampleIndices.map((index) => ({
    slideIndex: index,
    slideId: slideSpecs[index].id,
    prompt: generateImagePrompt(slideSpecs[index], style),
    spec: slideSpecs[index],
  }));

  console.log(`Generating ${samplePrompts.length} sample preview images...`);
  const imageResults = await generateImages(samplePrompts, { apiKey, api });

  for (const result of imageResults) {
    if (result.status === "success" && result.imageUrl) {
      const outputPath = path.join(outputDir, `sample-${result.slideIndex}.jpg`);
      await downloadImage(result.imageUrl, outputPath);
      result.localPath = outputPath;
    }
  }

  return {
    samples: imageResults,
    outputDir,
    count: imageResults.length,
  };
}

async function downloadImage(imageUrl, outputPath) {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  return outputPath;
}

// ── Image Composer ────────────────────────────────────────────────

async function composeImagePptx(imageResults, style = "business-professional") {
  const pptx = new PptxGenJS();
  const styleConfig = STYLE_PRESETS[style] || STYLE_PRESETS["business-professional"];

  pptx.author = "AWE Presentation-OS";
  pptx.title = "Image-Based Presentation";

  for (const result of imageResults) {
    if (!result.imageUrl || result.status !== "success") continue;

    const slide = pptx.addSlide();
    slide.background = { url: result.imageUrl };

    const spec = result.spec;

    slide.addText(spec.title, {
      x: 0.5, y: 0.5, w: 9, h: 1,
      fontSize: 44, fontFace: "Arial",
      color: styleConfig.colors[0], bold: true, align: "left",
    });

    slide.addText(spec.keyMessage, {
      x: 0.5, y: 1.8, w: 9, h: 0.8,
      fontSize: 24, fontFace: "Arial",
      color: styleConfig.colors[2], align: "left",
    });

    if (spec.body && spec.body.length > 0) {
      slide.addText(spec.body.slice(0, 5), {
        x: 0.5, y: 2.8, w: 9, h: 3,
        fontSize: 18, fontFace: "Arial",
        color: styleConfig.colors[0], align: "left", valign: "top",
      });
    }

    if (spec.speakerNotes) {
      slide.notes = spec.speakerNotes;
    }
  }

  return pptx;
}

// ── Main Entry Point ──────────────────────────────────────────────

async function generateImagePptx(options) {
  const {
    slideSpecs,
    style = "business-professional",
    apiKey,
    api = "agnes-image-2.1-flash",
    endpoint,
    model,
    outputDir = "./image-ppt-output",
    previewOnly = false,
    generateSamples = true,
  } = options;

  if (!apiKey) {
    throw new Error("apiKey is required for image generation");
  }

  fs.mkdirSync(outputDir, { recursive: true });

  // Step 1: Generate sample preview (optional)
  let samplePreview = null;
  if (generateSamples) {
    console.log("Generating sample preview...");
    samplePreview = await generateSamplePreview(slideSpecs, style, { apiKey, api, outputDir });
    console.log(`Generated ${samplePreview.count} sample preview images`);

    console.log("\nSample previews saved to:");
    for (const sample of samplePreview.samples) {
      if (sample.localPath) {
        console.log(`  - ${sample.localPath}`);
      }
    }

    if (previewOnly) {
      return { preview: samplePreview, stats: { total: slideSpecs.length, samples: samplePreview.count } };
    }
  }

  // Step 2: Generate prompts for all slides
  const prompts = generateAllImagePrompts(slideSpecs, style);
  console.log(`Generated ${prompts.length} image prompts`);

  // Step 3: Generate images
  console.log("Generating images...");
  const imageResults = await generateImages(prompts, { apiKey, api, endpoint, model });

  const successCount = imageResults.filter((r) => r.status === "success").length;
  console.log(`Generated ${successCount}/${imageResults.length} images successfully`);

  // Step 4: Download images
  console.log("Downloading images...");
  for (const result of imageResults) {
    if (result.status === "success" && result.imageUrl) {
      const outputPath = path.join(outputDir, `${result.slideId}.jpg`);
      await downloadImage(result.imageUrl, outputPath);
      result.localPath = outputPath;
    }
  }

  // Step 5: Compose PPTX
  console.log("Composing PPTX...");
  const pptx = await composeImagePptx(imageResults, style);

  const pptxPath = path.join(outputDir, "presentation.pptx");
  await pptx.writeFile({ fileName: pptxPath });

  console.log(`PPTX saved to: ${pptxPath}`);

  return {
    pptxPath,
    images: imageResults,
    prompts,
    samplePreview,
    stats: {
      total: imageResults.length,
      success: successCount,
      failed: imageResults.length - successCount,
    },
  };
}

// ── Exports ───────────────────────────────────────────────────────

module.exports = {
  generateImagePptx,
  generateImagePrompt,
  generateAllImagePrompts,
  generateImages,
  composeImagePptx,
  downloadImage,
  generateSamplePreview,
  STYLE_PRESETS,
  API_CONFIG,
};
