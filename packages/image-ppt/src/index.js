/**
 * Image-Based PPT Generator Module
 *
 * Architecture:
 * 1. ImagePromptGenerator: Generate prompts for each slide
 * 2. ImageGenerator: Call AI image generation API (DALL-E 3 / GPT-Image-2)
 * 3. ImageComposer: Assemble images into PPTX
 *
 * Flow:
 * SlideSpec[] → Image Prompts → AI Images → PPTX (images + text overlay)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

// ── Configuration ─────────────────────────────────────────────────

/**
 * Image generation API configuration
 */
const IMAGE_API_CONFIG = {
  // OpenAI DALL-E 3
  dallE3: {
    endpoint: "https://api.openai.com/v1/images/generations",
    model: "dall-e-3",
    size: "1024x1024",
    quality: "hd",
    style: "vivid",
  },
  // OpenAI GPT-Image-2
  gptImage2: {
    endpoint: "https://api.openai.com/v1/images/generations",
    model: "gpt-image-2",
    size: "1024x1024",
    quality: "hd",
  },
  // Custom API (OpenAI compatible)
  custom: {
    endpoint: "",
    model: "",
    size: "1024x1024",
  },
};

/**
 * Default image generation options
 */
const DEFAULT_IMAGE_OPTIONS = {
  api: "dall-e-3",
  size: "1920x1080",  // 16:9 for PPT slides
  quality: "hd",
  style: "vivid",
  aspectRatio: "16:9",
};

/**
 * Style presets for different presentation styles
 */
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

// ── Image Prompt Generation ───────────────────────────────────────

/**
 * Generate image prompt for a slide
 */
function generateImagePrompt(slideSpec, style, options = {}) {
  const styleConfig = STYLE_PRESETS[style] || STYLE_PRESETS["business-professional"];
  
  // Base prompt structure
  const prompt = {
    // Core content
    topic: slideSpec.title,
    keyMessage: slideSpec.keyMessage,
    role: slideSpec.role,
    visualType: slideSpec.visualType,
    
    // Style
    style: styleConfig.style,
    mood: styleConfig.mood,
    colors: styleConfig.colors.slice(0, 3).join(", "),
    
    // Composition
    composition: styleConfig.composition,
    lighting: styleConfig.lighting,
    
    // Aspect ratio
    aspectRatio: options.aspectRatio || "16:9",
    
    // Quality
    quality: options.quality || "hd",
  };
  
  // Generate natural language prompt
  let naturalPrompt = generateNaturalLanguagePrompt(prompt);
  
  return naturalPrompt;
}

/**
 * Generate natural language image prompt
 */
function generateNaturalLanguagePrompt(prompt) {
  const parts = [];
  
  // Content description
  parts.push(`Professional presentation slide titled "${prompt.topic}"`);
  parts.push(`Key message: ${prompt.keyMessage}`);
  
  // Style
  parts.push(`${prompt.style} style, ${prompt.mood} atmosphere`);
  
  // Colors
  parts.push(`Color palette: ${prompt.colors}`);
  
  // Composition
  parts.push(`${prompt.composition} layout`);
  
  // Lighting
  parts.push(`${prompt.lighting} lighting`);
  
  // Technical specs
  parts.push(`${prompt.aspectRatio} aspect ratio`);
  parts.push(`${prompt.quality} quality`);
  
  return parts.join(", ");
}

/**
 * Generate prompts for all slides
 */
function generateAllImagePrompts(slideSpecs, style, options = {}) {
  return slideSpecs.map((spec, index) => ({
    slideIndex: index,
    slideId: spec.id,
    prompt: generateImagePrompt(spec, style, options),
    spec: spec,
  }));
}

// ── Image Generation ──────────────────────────────────────────────

/**
 * Generate images using OpenAI API
 */
async function generateImages(prompts, options = {}) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  
  const apiConfig = IMAGE_API_CONFIG[options.api] || IMAGE_API_CONFIG.dallE3;
  const model = options.model || apiConfig.model;
  const size = options.size || apiConfig.size;
  
  const results = [];
  
  for (const promptItem of prompts) {
    try {
      const imageUrl = await callImageGenerationAPI({
        apiKey,
        model,
        prompt: promptItem.prompt,
        size,
        n: 1,
      });
      
      results.push({
        ...promptItem,
        imageUrl,
        status: "success",
      });
    } catch (error) {
      results.push({
        ...promptItem,
        imageUrl: null,
        status: "error",
        error: error.message,
      });
    }
  }
  
  return results;
}

/**
 * Call OpenAI image generation API
 */
async function callImageGenerationAPI({ apiKey, model, prompt, size, n = 1 }) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n,
      size,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data[0].url;
}

/**
 * Download image from URL to local file
 */
async function downloadImage(imageUrl, outputPath) {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  return outputPath;
}

// ── Image Composer ────────────────────────────────────────────────

/**
 * Compose images into PPTX with text overlay
 */
async function composeImagePptx(imageResults, style = "business-professional") {
  const pptx = new PptxGenJS();
  
  // Configure theme
  const styleConfig = STYLE_PRESETS[style] || STYLE_PRESETS["business-professional"];
  pptx.author = "AWE Presentation-OS";
  pptx.title = "Image-Based Presentation";
  
  for (const result of imageResults) {
    if (!result.imageUrl || result.status !== "success") {
      continue;
    }
    
    const slide = pptx.addSlide();
    
    // Set background to image
    slide.background = {
      url: result.imageUrl,
    };
    
    // Add text overlay (title + key message)
    const spec = result.spec;
    
    // Title
    slide.addText(spec.title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 1,
      fontSize: 44,
      fontFace: "Arial",
      color: styleConfig.colors[0],
      bold: true,
      align: "left",
    });
    
    // Key message
    slide.addText(spec.keyMessage, {
      x: 0.5,
      y: 1.8,
      w: 9,
      h: 0.8,
      fontSize: 24,
      fontFace: "Arial",
      color: styleConfig.colors[2],
      align: "left",
    });
    
    // Body content (if any)
    if (spec.body && spec.body.length > 0) {
      slide.addText(spec.body.slice(0, 5), {
        x: 0.5,
        y: 2.8,
        w: 9,
        h: 3,
        fontSize: 18,
        fontFace: "Arial",
        color: styleConfig.colors[0],
        align: "left",
        valign: "top",
      });
    }
    
    // Speaker notes
    if (spec.speakerNotes) {
      slide.notes = spec.speakerNotes;
    }
  }
  
  return pptx;
}

// ── Main Entry Point ──────────────────────────────────────────────

/**
 * Generate image-based PPTX from slide specs
 *
 * @param {Object} options
 * @param {Array} options.slideSpecs - Array of SlideSpec
 * @param {string} options.style - Style preset name
 * @param {string} options.apiKey - OpenAI API key
 * @param {string} [options.api] - API to use (dall-e-3, gpt-image-2)
 * @param {string} [options.outputDir] - Directory to save images
 * @returns {Promise<Object>} - { pptx, images, prompts }
 */
async function generateImagePptx(options) {
  const {
    slideSpecs,
    style = "business-professional",
    apiKey,
    api = "dall-e-3",
    outputDir = "./image-ppt-output",
  } = options;
  
  if (!apiKey) {
    throw new Error("apiKey is required for image generation");
  }
  
  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Step 1: Generate prompts
  const prompts = generateAllImagePrompts(slideSpecs, style);
  console.log(`Generated ${prompts.length} image prompts`);
  
  // Step 2: Generate images
  console.log("Generating images...");
  const imageResults = await generateImages(prompts, { apiKey, api });
  
  const successCount = imageResults.filter(r => r.status === "success").length;
  console.log(`Generated ${successCount}/${imageResults.length} images successfully`);
  
  // Step 3: Download images
  console.log("Downloading images...");
  for (const result of imageResults) {
    if (result.status === "success" && result.imageUrl) {
      const outputPath = path.join(outputDir, `${result.slideId}.jpg`);
      await downloadImage(result.imageUrl, outputPath);
      result.localPath = outputPath;
    }
  }
  
  // Step 4: Compose PPTX
  console.log("Composing PPTX...");
  const pptx = await composeImagePptx(imageResults, style);
  
  // Save PPTX
  const pptxPath = path.join(outputDir, "presentation.pptx");
  await pptx.writeFile({ fileName: pptxPath });
  
  console.log(`PPTX saved to: ${pptxPath}`);
  
  return {
    pptxPath,
    images: imageResults,
    prompts,
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
  STYLE_PRESETS,
  DEFAULT_IMAGE_OPTIONS,
  IMAGE_API_CONFIG,
};
