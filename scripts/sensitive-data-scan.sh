#!/bin/bash
# sensitive-data-scan.sh — Pre-commit sensitive data scanner
# Usage: bash scripts/sensitive-data-scan.sh [--staged-only]

set -euo pipefail

STAGED_ONLY=false
REPO_ROOT=$(git rev-parse --show-toplevel)

while [[ $# -gt 0 ]]; do
    case "$1" in
        --staged-only) STAGED_ONLY=true; shift ;;
        *) echo "Unknown argument: $1"; exit 1 ;;
    esac
done

echo "=== Sensitive Data Scan ==="
echo "Repository: $REPO_ROOT"
echo "Mode: $([ "$STAGED_ONLY" = true ] && echo 'staged only' || echo 'full working tree')"
echo ""

FOUND=0

scan_pattern() {
    local pattern="$1"
    local description="$2"
    local matches=""

    if [ "$STAGED_ONLY" = true ]; then
        matches=$(git diff --cached --diff-filter=ACMRT --name-only | grep -E "$pattern" 2>/dev/null || true)
    else
        matches=$(git ls-files | grep -E "$pattern" 2>/dev/null || true)
        # Also check untracked files
        local untracked
        untracked=$(git ls-files --others --exclude-standard | grep -E "$pattern" 2>/dev/null || true)
        if [ -n "$untracked" ]; then
            matches="$matches"$'\n'"$untracked"
        fi
    fi

    if [ -n "$matches" ]; then
        FOUND=$((FOUND + 1))
        echo "⚠️  $description:"
        echo "$matches" | while read -r f; do
            echo "   - $f"
        done
        echo ""
    fi
}

# Environment files
scan_pattern '\.env$|\.env\..*\.local$|\.env\.test$' "Environment/secrets files"

# Key and certificate files
scan_pattern '\.(pem|key|p12|pfx|jks|secret|credentials)$' "Key/certificate/credential files"

# SSH/GPG private keys
scan_pattern 'id_rsa$|id_ed25519$|\.gpg$|\.asc$' "SSH/GPG private key files"

# Database files (could contain customer data)
scan_pattern '\.(sqlite|sqlite3|db)$' "Local database files"

# Log files
scan_pattern '\.log$' "Log files"

# Build/test output that may contain secrets
scan_pattern '(npm-debug|yarn-debug|yarn-error)\.log$' "NPM/Yarn debug logs"

echo "---"
if [ "$FOUND" -gt 0 ]; then
    echo "❌ Found $FOUND category of potentially sensitive files."
    echo "   Review and remove before committing."
    exit 1
else
    echo "✅ No sensitive files detected."
    exit 0
fi
