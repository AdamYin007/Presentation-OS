#!/bin/bash
# Re-generate Bilingual Pathology PPT with Image-Based Style

set -e

cd /Users/adamyin/Projects/awe

echo "Starting image-based PPT generation..."
echo "Input: /tmp/bingli-presentation.md"
echo "Output: ./deliverables/bingli-presentation-image/"
echo ""

node scripts/regenerate-bingli-ppt.js

echo ""
echo "=== Generation Complete ==="
echo "Check the output directory for results."
