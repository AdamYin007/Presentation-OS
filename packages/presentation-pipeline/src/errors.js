/**
 * Structured error handling utilities — AWE Presentation OS
 *
 * Provides consistent error classes and factories for all pipeline stages.
 * All errors include: type, message, stage, details, timestamp
 */
"use strict";

/**
 * Base presentation error with structured metadata.
 */
class PresentationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = options.name || "PresentationError";
    this.stage = options.stage || null;
    this.details = options.details || {};
    this.timestamp = new Date().toISOString();
    this.code = options.code || "UNKNOWN_ERROR";

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PresentationError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      stage: this.stage,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Pipeline stage errors
 */
class IngestError extends PresentationError {
  constructor(message, details = {}) {
    super(message, {
      name: "IngestError",
      stage: "ingest",
      code: "INGEST_ERROR",
      details,
    });
  }
}

class IntentError extends PresentationError {
  constructor(message, details = {}) {
    super(message, {
      name: "IntentError",
      stage: "intent",
      code: "INTENT_ERROR",
      details,
    });
  }
}

class StoryPlanningError extends PresentationError {
  constructor(message, details = {}) {
    super(message, {
      name: "StoryPlanningError",
      stage: "story-planning",
      code: "STORY_PLANNING_ERROR",
      details,
    });
  }
}

class SlideSpecError extends PresentationError {
  constructor(message, details = {}) {
    super(message, {
      name: "SlideSpecError",
      stage: "slidespec",
      code: "SLIDE_SPEC_ERROR",
      details,
    });
  }
}

class AudienceEngineError extends PresentationError {
  constructor(message, details = {}) {
    super(message, {
      name: "AudienceEngineError",
      stage: "audience-engine",
      code: "AUDIENCE_ENGINE_ERROR",
      details,
    });
  }
}

class ThemeLayoutError extends PresentationError {
  constructor(message, details = {}) {
    super(message, {
      name: "ThemeLayoutError",
      stage: "theme-layout",
      code: "THEME_LAYOUT_ERROR",
      details,
    });
  }
}

class CompilerError extends PresentationError {
  constructor(message, details = {}) {
    super(message, {
      name: "CompilerError",
      stage: "compiler",
      code: "COMPILER_ERROR",
      details,
    });
  }
}

class RendererError extends PresentationError {
  constructor(message, details = {}) {
    super(message, {
      name: "RendererError",
      stage: "renderer",
      code: "RENDERER_ERROR",
      details,
    });
  }
}

class QualityCheckError extends PresentationError {
  constructor(message, details = {}) {
    super(message, {
      name: "QualityCheckError",
      stage: "quality-check",
      code: "QUALITY_CHECK_ERROR",
      details,
    });
  }
}

module.exports = {
  PresentationError,
  IngestError,
  IntentError,
  StoryPlanningError,
  SlideSpecError,
  AudienceEngineError,
  ThemeLayoutError,
  CompilerError,
  RendererError,
  QualityCheckError,
};
