# M12.31 Template Analyzer Quality Control Specification

**Status**: Complete  
**PR**: feat/m12-31-template-analyzer-quality-control  
**Date**: 2026-08-04

---

## Overview

M12.31 establishes quality control for the template analysis pipeline by introducing:
1. Schema validation for output structure
2. XML parsing with xml2js library (replacing fragile regex-based parsing)
3. Cross-validation of analysis results against template structure
4. Comprehensive test suite covering all quality aspects

---

## Components

### 1. Schema Definition (`packages/template-analyzer/src/schema.js`)

Defines the output contract for template analysis:

```javascript
{
  metadata: {
    totalSlides: number,           // Must match actual slide count
    generatedAt: string,           // ISO 8601 timestamp
    sourceFile: string,            // Template filename
    schemaVersion: string          // Always "1.0.0"
  },
  commonElements: {
    mustPreserve: string[],        // Categories to preserve
    brandElements: object[],       // Logo/watermark elements
    footers: object[],             // Page number/copyright
    backgrounds: string[]          // Background patterns
  },
  uniqueByType: {
    cover: object[],               // Cover slide elements
    content: object[],             // Content slide elements
    end: object[]                  // End slide elements
  },
  slideTypes: {
    cover: number[],               // Slide numbers
    agenda: number[],
    sectionDivider: number[],
    content: number[],
    end: number[]
  },
  styleTokens: {
    colors: { [key]: string },     // Named colors (#RRGGBB)
    fonts: { latin: string, eastAsian: string },
    spacing: object
  },
  recommendations: [{
    priority: "critical"|"high"|"medium",
    rule: string,                  // snake_case identifier
    description: string
  }],
  warnings: string[]
}
```

### 2. Validation Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `validatePrinciples(principles)` | Validate full output structure | `{ ok: boolean, errors: string[] }` |
| `validateSlideElement(element)` | Validate single element | `{ ok: boolean, errors: string[] }` |
| `validateSlide(slide)` | Validate slide structure | `{ ok: boolean, errors: string[] }` |
| `crossValidate(slides, principles)` | Cross-check analysis results | `string[]` (warnings) |

### 3. XML Parsing Improvements (`packages/template-analyzer/src/index.js`)

**Before (Regex-based):**
```javascript
const shapeMatches = xml.match(/<p:sp>([\s\S]*?)<\/p:sp>/g);
const textMatch = xml.match(/<a:t>([^<]*)<\/a:t>/);
```

**After (xml2js):**
```javascript
const { parseString } = require("xml2js");
const parsed = parseStringSync(xml);
const shapes = parsed.slide.spTree.sp;
const text = shapes.txBody.p.a.t;
```

**Benefits:**
- Handles nested tags correctly
- Handles XML namespaces properly
- Handles special characters in text content
- More maintainable and readable

### 4. Cross-Validation Checks

The `crossValidate()` function performs these checks:

1. **Metadata Consistency**: `totalSlides` must match actual slide count
2. **Empty Slide Detection**: Warns if slides have no extractable elements
3. **Text Content Check**: Warns if slides have no text content
4. **Schema Compliance**: Validates output against schema definitions

---

## Test Suite (`tests/m12-31-template-analyzer.test.js`)

**58 focused tests** across 10 suites:

### Suite 1: Schema Validation (8 tests)
- Valid principles structure
- Missing required fields
- Invalid priority in recommendation
- Invalid timestamp format
- Slide element validation

### Suite 2: XML Parsing (3 tests)
- Schema uses xml2js (not regex)
- XML parsing integration

### Suite 3: Element Extraction (13 tests)
- Parse shapes from XML
- Categorize shapes correctly (7 test cases)

### Suite 4: Cross-Validation (4 tests)
- Validate metadata totalSlides matches
- Mismatched totalSlides
- Empty slides
- Slides without text

### Suite 5: Common Element Identification (5 tests)
- Identify common elements across slides
- Rare elements should not be common

### Suite 6: Slide Type Classification (8 tests)
- Classify slides by content (Chinese keywords)
- Classify slides by content (English keywords)

### Suite 7: Style Token Extraction (6 tests)
- Extract colors from theme XML
- Extract fonts from master XML
- Empty theme XML handling

### Suite 8: Error Handling (5 tests)
- Invalid template path
- File not found
- Options validation

### Suite 9: Markdown Generation (4 tests)
- Generate valid markdown with all sections

### Suite 10: npm Script Registration (3 tests)
- Script is registered
- Script points to correct file
- Integrated into check script

---

## Usage

### Command Line
```bash
# Run the test suite
npm run check:m12-31-template-analyzer

# Run all checks
npm run check

# Run all checks + doctor
npm run check:all
```

### Programmatic Usage
```javascript
const { analyzeTemplate } = require("./packages/template-analyzer/src/index.js");
const { validatePrinciples } = require("./packages/template-analyzer/src/schema.js");

// Analyze template
const result = analyzeTemplate("./template.pptx", {
  outputDir: "./output",
  validate: true  // Enable schema validation
});

// Check results
if (result.validation && !result.validation.ok) {
  console.error("Schema validation errors:", result.validation.errors);
}

if (result.warnings.length > 0) {
  console.warn("Analysis warnings:", result.warnings);
}

// Output is saved to ./output/template-principles.md
```

---

## Quality Guarantees

### Schema Compliance
All output from `analyzeTemplate()` is validated against the schema before being returned. If validation fails, warnings are added to the result (never throws).

### XML Parsing Reliability
Using xml2js ensures:
- Correct handling of nested XML structures
- Proper namespace resolution
- Safe text extraction (no regex edge cases)

### Cross-Validation
Analysis results are cross-validated against the original template structure to catch:
- Metadata mismatches
- Empty slides
- Missing content

---

## Files Modified/Created

| File | Status | Purpose |
|------|--------|---------|
| `packages/template-analyzer/src/schema.js` | Created | Output contract and validation |
| `packages/template-analyzer/src/index.js` | Modified | xml2js integration + schema validation |
| `tests/m12-31-template-analyzer.test.js` | Created | 58 focused tests |
| `package.json` | Modified | Added npm script + check integration |
| `docs/ROADMAP.md` | Modified | Documented M12.31 progress |
| `docs/M12_31_TEMPLATE_ANALYZER_QUALITY_CONTROL_SPEC.md` | Created | This specification |

---

## Dependencies

- `xml2js`: ^0.6.2 (added to package.json dependencies)

---

## Success Criteria

- [x] Schema validation passes for valid output
- [x] Schema validation catches invalid output
- [x] XML parsing uses xml2js (verified in source)
- [x] No regex-based XML parsing in main code
- [x] Cross-validation detects mismatches
- [x] All 58 tests pass
- [x] npm script integrated into check and check:all
- [x] Documentation updated

---

## Future Improvements

1. **Add PPTX fixtures**: Create sample PPTX templates for integration testing
2. **Improve slide classification**: Add ML-based classification for better accuracy
3. **Add visual quality checks**: Compare extracted elements against expected design
4. **Performance benchmarks**: Measure parsing speed for large templates
