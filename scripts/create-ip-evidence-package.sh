#!/bin/bash
# create-ip-evidence-package.sh — Generate IP evidence package for a release
# Usage: bash scripts/create-ip-evidence-package.sh [--dry-run] [version]

set -euo pipefail

DRY_RUN=false
VERSION=""
OUTPUT_DIR="ip-evidence"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=true; shift ;;
        *) VERSION="$1"; shift ;;
    esac
done

if [[ -z "$VERSION" ]]; then
    VERSION=$(git describe --tags --always 2>/dev/null || echo "unreleased")
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
PACKAGE_NAME="ip-evidence-${VERSION}-${TIMESTAMP}"

echo "=== IP Evidence Package ==="
echo "Version: $VERSION"
echo "Timestamp: $TIMESTAMP"
echo "Repository: $REPO_ROOT"
echo "Dry run: $DRY_RUN"
echo ""

# Safety check: ensure we're in a git repo
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "ERROR: Not a git repository."
    exit 1
fi

# Check for sensitive files that should NOT be included
SENSITIVE_PATTERNS=(
    "*.pem" "*.key" "*.p12" "*.pfx" "*.cer"
    ".env" ".env.*"
    "*.secret" "*.credential"
    "node_modules/"
    ".git/"
    "*.log"
    "dist/"
    "build/"
)

FOUND_SENSITIVE=()
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    # Skip .gitignore patterns that match directories
    if [[ "$pattern" == */ ]]; then
        dir_name="${pattern%/}"
        if [[ -d "$dir_name" ]]; then
            FOUND_SENSITIVE+=("$pattern")
        fi
    else
        matches=$(find . -name "$pattern" -not -path "./.git/*" -not -path "./node_modules/*" 2>/dev/null | head -5)
        if [[ -n "$matches" ]]; then
            FOUND_SENSITIVE+=("$pattern")
        fi
    fi
done

if [[ ${#FOUND_SENSITIVE[@]} -gt 0 ]]; then
    echo "WARNING: Potentially sensitive files found:"
    for s in "${FOUND_SENSITIVE[@]}"; do
        echo "  - $s"
    done
    echo "These will be excluded from the evidence package."
    echo ""
fi

if $DRY_RUN; then
    echo "[DRY RUN] Would create package: $PACKAGE_NAME"
    echo "[DRY RUN] Files to include:"
    git ls-files | grep -v -E "(node_modules|\.git|\.env|\.pem|\.key|\.log)" | head -20
    echo "... (truncated)"
    exit 0
fi

# Create output directory
mkdir -p "$OUTPUT_DIR/$PACKAGE_NAME"

# Generate source code archive (excluding sensitive files)
git ls-files | grep -v -E "(node_modules|\.git|\.env|\.pem|\.key|\.log|dist/|build/)" > \
    "$OUTPUT_DIR/$PACKAGE_NAME/file-list.txt"

tar czf "$OUTPUT_DIR/$PACKAGE_NAME/source-code.tar.gz" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude=".env*" \
    --exclude="*.pem" \
    --exclude="*.key" \
    --exclude="*.log" \
    --exclude="dist/" \
    --exclude="build/" \
    -T "$OUTPUT_DIR/$PACKAGE_NAME/file-list.txt"

# Generate SHA-256 hashes
sha256sum "$OUTPUT_DIR/$PACKAGE_NAME/source-code.tar.gz" > \
    "$OUTPUT_DIR/$PACKAGE_NAME/source-code.tar.gz.sha256"

# Git commit information
{
    echo "Git Commit: $(git rev-parse HEAD)"
    echo "Tag: $VERSION"
    echo "Branch: $(git branch --show-current)"
    echo "Generated: $TIMESTAMP"
    echo "Commit Message: $(git log -1 --pretty=%B)"
} > "$OUTPUT_DIR/$PACKAGE_NAME/git-info.txt"

# Dependency list
npm ls --all --json 2>/dev/null > "$OUTPUT_DIR/$PACKAGE_NAME/dependencies.json" || \
    echo "Failed to generate dependency list" > "$OUTPUT_DIR/$PACKAGE_NAME/dependencies.json"

# Third-party license summary
{
    echo "# Third-Party License Summary"
    echo ""
    echo "Generated: $TIMESTAMP"
    echo ""
    npm ls --all --json 2>/dev/null | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
function walk(node, depth = 0) {
    if (!node || !node.name) return;
    const license = node.license ? node.license : 'UNKNOWN';
    console.log(\`\${'  '.repeat(depth)}\${node.name}@\${node.version} — License: \${license}\`);
    if (node.dependencies) {
        Object.values(node.dependencies).forEach(child => walk(child, depth + 1));
    }
}
walk(data);
" > "$OUTPUT_DIR/$PACKAGE_NAME/license-summary.md" 2>/dev/null || \
    echo "License summary generation failed" > "$OUTPUT_DIR/$PACKAGE_NAME/license-summary.md"
}

# Contributor summary
{
    echo "# Contributors"
    echo ""
    git shortlog -sn --all | while read count name; do
        echo "- $name ($count commits)"
    done
} > "$OUTPUT_DIR/$PACKAGE_NAME/contributors.txt"

echo "✅ IP Evidence Package created:"
echo "   $OUTPUT_DIR/$PACKAGE_NAME/"
echo ""
echo "Contents:"
ls -la "$OUTPUT_DIR/$PACKAGE_NAME/"
echo ""
echo "SHA-256: $(cat "$OUTPUT_DIR/$PACKAGE_NAME/source-code.tar.gz.sha256")"
