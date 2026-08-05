#!/usr/bin/env node
/**
 * Manual color extraction from template using Python
 */

const { execSync } = require("child_process");
const path = require("path");

const templatePath = "./.hermes/desktop-attachments/91360宫颈细胞学全流程智慧解决方案介绍-20260616-1.pptx";

try {
  const result = execSync(
    `python3 -c "
import zipfile
import xml.etree.ElementTree as ET
import re

with zipfile.ZipFile('${templatePath}') as z:
    if 'ppt/theme/theme1.xml' in z.namelist():
        with z.open('ppt/theme/theme1.xml') as f:
            content = f.read().decode('utf-8')
            colors = re.findall(r'#[0-9A-Fa-f]{6}', content)
            print('Theme colors:', ','.join(colors[:10]))
    else:
        print('No theme file found')
"`,
    { encoding: "utf-8" }
  );
  console.log(result.trim());
} catch (error) {
  console.error("Error:", error.message);
}
