// AWE Presentation OS — Frontend Application

const API_BASE_URL = "http://localhost:3000";
const API_KEY = "demo-key-123";

class AweApp {
  constructor() {
    this.input = document.getElementById("markdown-input");
    this.compilerToggle = document.getElementById("compiler-toggle");
    this.audienceToggle = document.getElementById("audience-toggle");
    this.generateBtn = document.getElementById("generate-btn");
    this.loading = document.getElementById("loading");
    this.result = document.getElementById("result");
    this.error = document.getElementById("error");
    this.slideCountEl = document.getElementById("slide-count");
    this.downloadLink = document.getElementById("download-link");

    this.bindEvents();
    this.showWelcome();
  }

  bindEvents() {
    this.generateBtn.addEventListener("click", () => this.handleGenerate());

    // Enter key shortcut (Ctrl/Cmd + Enter)
    this.input.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.handleGenerate();
      }
    });
  }

  showWelcome() {
    console.log("🎨 AWE Presentation OS loaded");
    console.log("Press Ctrl+Enter to generate");
  }

  async handleGenerate() {
    const markdown = this.input.value.trim();

    if (!markdown) {
      this.showError("Please enter some content first.");
      return;
    }

    this.setLoading(true);
    this.hideResult();
    this.hideError();

    try {
      const options = {};

      if (this.compilerToggle.checked) {
        options.compiler = true;
      }

      if (this.audienceToggle.checked) {
        options.audienceEngine = {
          speaker: "executive",
          audience: "board"
        };
      }

      const response = await fetch(`${API_BASE_URL}/v1/generate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ markdown, options })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Generation failed");
      }

      const blob = await response.blob();
      const slidesCount = response.headers.get("x-slides-count");

      this.showResult(blob, slidesCount);
    } catch (err) {
      this.showError(err.message);
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(isLoading) {
    this.generateBtn.disabled = isLoading;
    this.generateBtn.textContent = isLoading ? "⏳ Generating..." : "🚀 Generate Presentation";
    this.loading.classList.toggle("hidden", !isLoading);
  }

  showResult(blob, slideCount) {
    const url = URL.createObjectURL(blob);

    this.slideCountEl.textContent = `Generated ${slideCount} slides in ~3s`;
    this.downloadLink.href = url;
    this.downloadLink.download = `presentation-${Date.now()}.pptx`;

    this.result.classList.remove("hidden");
  }

  showError(message) {
    document.getElementById("error-message").textContent = message;
    this.error.classList.remove("hidden");
  }

  hideResult() {
    this.result.classList.add("hidden");
  }

  hideError() {
    this.error.classList.add("hidden");
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.aweApp = new AweApp();
});
