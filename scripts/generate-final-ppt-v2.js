#!/usr/bin/env node
/**
 * FINAL: Clean 10-slide PPT with template elements + AI images
 *
 * Key fixes vs previous scripts:
 * 1. Delete outputPptx BEFORE zip (zip appends to existing archives, never removes entries)
 * 2. Replace the LARGEST picture per slide (background) with AI image
 * 3. For slides without pictures, INSERT the AI image as full-slide background
 * 4. Remove slides 11-45 from BOTH filesystem AND presentation.xml.rels
 * 5. Preserve all template design elements (logo, decorations, footers)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function main() {
  const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");
  const templatePath = "./.hermes/desktop-attachments/91360宫颈细胞学全流程智慧解决方案介绍-20260616-1.pptx";
  const outputPptx = path.join(outputDir, "presentation.pptx");
  const workDir = path.join(outputDir, ".work");

  console.log("=== FINAL Clean PPT: template elements + AI images ===\n");

  // Step 1: Copy template
  console.log("Step 1: Copying template...");
  execSync(`cp "${templatePath}" "${outputPptx}"`, { stdio: "pipe" });

  // Step 2: Unzip
  console.log("Step 2: Unzipping...");
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });
  execSync(`unzip -o "${outputPptx}" -d "${workDir}"`, { stdio: "pipe" });

  // Step 3: Read AI slide images
  const slideImages = fs.readdirSync(outputDir)
    .filter(f => f.startsWith("slide-") && f.endsWith(".jpg"))
    .sort((a, b) => parseInt(a.replace("slide-", "").replace(".jpg", "")) - parseInt(b.replace("slide-", "").replace(".jpg", "")));
  console.log(`  Found ${slideImages.length} AI images`);

  // Step 4: Get slide size from presentation.xml
  const presPath = path.join(workDir, "ppt", "presentation.xml");
  let presXml = fs.readFileSync(presPath, "utf8");
  const sldSz = presXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  const slideW = sldSz ? parseInt(sldSz[1]) : 12192000;
  const slideH = sldSz ? parseInt(sldSz[2]) : 6858000;
  console.log(`  Slide size: ${slideW} x ${slideH} EMU`);

  // Step 5: Replace/insert background images for slides 1-10
  console.log("\nStep 5: Replacing backgrounds...");
  const slidesDir = path.join(workDir, "ppt", "slides");
  const relsDir = path.join(slidesDir, "_rels");
  const mediaDir = path.join(workDir, "ppt", "media");

  for (let i = 0; i < Math.min(10, slideImages.length); i++) {
    const slideNum = i + 1;
    const slideXmlPath = path.join(slidesDir, `slide${slideNum}.xml`);
    const relsPath = path.join(relsDir, `slide${slideNum}.xml.rels`);

    if (!fs.existsSync(slideXmlPath)) {
      console.log(`  Slide ${slideNum}: XML not found, skipping`);
      continue;
    }

    let slideXml = fs.readFileSync(slideXmlPath, "utf8");
    let relsXml = fs.existsSync(relsPath) ? fs.readFileSync(relsPath, "utf8") : "";

    // Copy AI image into media dir with unique name
    const aiImgName = `aibg-${slideNum}.jpg`;
    fs.copyFileSync(path.join(outputDir, slideImages[i]), path.join(mediaDir, aiImgName));

    // Find all pics: extract cNvPr (name/descr), blip rId, and size
    const pics = [];
    const picBlockRegex = /<p:pic>([\s\S]*?)<\/p:pic>/g;
    let picBlock;
    while ((picBlock = picBlockRegex.exec(slideXml)) !== null) {
      const block = picBlock[1];
      const cNvPr = block.match(/<p:cNvPr[^>]*\/>/) || [""];
      const cNvPrText = cNvPr[0];
      const descrMatch = cNvPrText.match(/descr="([^"]*)"/);
      const nameMatch = cNvPrText.match(/name="([^"]*)"/);
      const descr = descrMatch ? descrMatch[1] : (nameMatch ? nameMatch[1] : "");
      const rIdMatch = block.match(/<a:blip r:embed="rId(\d+)"/);
      const extMatch = block.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
      if (!rIdMatch) continue;
      const rId = rIdMatch[1];
      const cx = extMatch ? parseInt(extMatch[1]) : 0;
      const cy = extMatch ? parseInt(extMatch[2]) : 0;
      pics.push({ rId, cx, cy, area: cx * cy, descr });
    }

    // Separate logo pics (MUST preserve) from replaceable pics
    const logoPics = pics.filter(p => /logo/i.test(p.descr));
    const replaceable = pics.filter(p => !/logo/i.test(p.descr));

    if (replaceable.length > 0) {
      // Replace the largest NON-LOGO pic (background) with AI image
      replaceable.sort((a, b) => b.area - a.area);
      const bgPic = replaceable[0];
      const newRId = bgPic.rId;

      // Update rels: point that rId to the AI image
      if (relsXml.includes(`Id="rId${newRId}"`)) {
        relsXml = relsXml.replace(
          new RegExp(`(Id="rId${newRId}"[^>]*Target=")[^"]+`),
          `$1../media/${aiImgName}`
        );
      } else {
        // No rels entry - add one
        const newRelId = `rId${newRId}`;
        relsXml = relsXml.replace(
          /<\/Relationships>/,
          `<Relationship Id="${newRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${aiImgName}"/></Relationships>`
        );
      }
      console.log(`  Slide ${slideNum}: replaced bg (${pics.length} pics, largest non-logo ${bgPic.cx}x${bgPic.cy}) -> ${aiImgName}${logoPics.length ? `, kept ${logoPics.length} logo(s)` : ""}`);
    } else {
      // No replaceable pics - INSERT AI image as full-slide background at the top of spTree
      // Find next available rId (max existing + 1)
      const ridRegex = /Id="rId(\d+)"/g;
      let maxRid = 1;
      let m;
      while ((m = ridRegex.exec(relsXml)) !== null) {
        maxRid = Math.max(maxRid, parseInt(m[1]));
      }
      const newRid = maxRid + 1;

      // Add relationship
      if (relsXml.includes("</Relationships>")) {
        relsXml = relsXml.replace(
          /<\/Relationships>/,
          `<Relationship Id="rId${newRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${aiImgName}"/></Relationships>`
        );
      }

      // Insert pic element right after <p:spTree> (bottom layer)
      const picXml = `<p:pic><p:nvPicPr><p:cNvPr id="900${slideNum}" name="AI Background ${slideNum}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId${newRid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${slideW}" cy="${slideH}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
      slideXml = slideXml.replace(/<p:spTree>/, `<p:spTree>${picXml}`);
      console.log(`  Slide ${slideNum}: NO pics - inserted AI background (rId${newRid}) -> ${aiImgName}`);
    }

    fs.writeFileSync(slideXmlPath, slideXml);
    if (relsXml) fs.writeFileSync(relsPath, relsXml);
  }

  // Step 6: Remove slides 11-45
  console.log("\nStep 6: Removing slides 11-45...");
  const allSlides = fs.readdirSync(slidesDir)
    .filter(f => /^slide\d+\.xml$/.test(f))
    .map(f => parseInt(f.replace("slide", "").replace(".xml", "")))
    .filter(n => n > 10)
    .sort((a, b) => b - a);

  for (const n of allSlides) {
    fs.unlinkSync(path.join(slidesDir, `slide${n}.xml`));
    const relsFile = path.join(relsDir, `slide${n}.xml.rels`);
    if (fs.existsSync(relsFile)) fs.unlinkSync(relsFile);
  }
  console.log(`  Removed ${allSlides.length} slide files`);

  // Remove slide references from presentation.xml.rels
  const presRelsPath = path.join(workDir, "ppt", "_rels", "presentation.xml.rels");
  let presRels = fs.readFileSync(presRelsPath, "utf8");
  presRels = presRels.replace(
    /<Relationship[^>]*Target="slides\/slide(1[1-9]|[2-4][0-9]|45)\.xml"[^>]*\/>/g,
    ""
  );
  fs.writeFileSync(presRelsPath, presRels);
  console.log("  Cleaned presentation.xml.rels");

  // Step 7: Update presentation.xml slideIdLst (keep only 10 slideIds)
  console.log("\nStep 7: Updating presentation.xml...");
  const slideIdRegex = /<p:sldId[^>]*\/>/g;
  const slideIds = presXml.match(slideIdRegex) || [];
  if (slideIds.length > 10) {
    const kept = slideIds.slice(0, 10).join("");
    presXml = presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${kept}</p:sldIdLst>`);
  }
  fs.writeFileSync(presPath, presXml);
  console.log(`  slideIdLst: ${Math.min(10, slideIds.length)} slides`);

  // Step 8: Clean notes slides 11-45
  console.log("\nStep 8: Cleaning notes slides...");
  const notesDir = path.join(workDir, "ppt", "notesSlides");
  if (fs.existsSync(notesDir)) {
    for (const f of fs.readdirSync(notesDir)) {
      const m = f.match(/^notesSlide(\d+)\.xml(\.rels)?$/);
      if (m && parseInt(m[1]) > 10) fs.unlinkSync(path.join(notesDir, f));
    }
  }

  // Step 9: REPACK - CRITICAL: delete output first so zip creates a fresh archive
  console.log("\nStep 9: Repacking (fresh zip)...");
  fs.rmSync(outputPptx, { force: true });
  execSync(`cd "${workDir}" && zip -r "${outputPptx}" . -x "*.DS_Store"`, { stdio: "pipe" });

  // Step 10: Cleanup
  fs.rmSync(workDir, { recursive: true, force: true });

  const sizeMB = Math.round(fs.statSync(outputPptx).size / 1024 / 1024 * 100) / 100;
  console.log(`\n✅ PPTX saved: ${outputPptx}`);
  console.log(`   Size: ${sizeMB} MB, 10 slides`);
  console.log(`   Template elements preserved (logo, decorations, footers) + AI backgrounds`);
}

try {
  main();
} catch (e) {
  console.error("ERROR:", e.message);
  process.exit(1);
}
