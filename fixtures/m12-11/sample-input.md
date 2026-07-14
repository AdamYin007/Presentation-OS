# AWE M12.11 CLI Skill Packaging Sample

## Introduction

This sample markdown validates the M12.11 command-line surface without relying
on a domain-specific document. It should produce an editable PowerPoint deck
through the existing Presentation OS pipeline.

## CLI Entry Point

The CLI command is a thin wrapper around the established markdown-to-PPTX
pipeline. It accepts an input markdown path, an output PPTX path, and a small
set of local flags for dry-run and JSON summary output.

## Skill Packaging

The packaging model keeps the same local runtime contract that Hermes skills can
call directly. It does not add cloud services, paid APIs, or a second
implementation of the parser, planner, layout, or renderer.

## Validation

Tests should verify argument handling, missing-file failures, dry-run summaries,
and successful PPTX generation from this markdown fixture.
