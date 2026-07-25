# IP Infringement Response Procedure

**Purpose**: Define the response process when Presentation OS intellectual property is suspected to be infringed.

## Trigger Conditions

- Unauthorized copying of source code
- Use of project name, logo, or branding without permission
- Distribution of derivative works without license
- Scraping/cloning of repository content
- Commercial use without authorization

## Response Steps

### Step 1: Do NOT Publicly Dispute

- Do NOT post accusations on social media or public issues
- Do NOT engage in public arguments
- Preserve all evidence quietly

### Step 2: Collect and Preserve Evidence

Document the following with timestamps and SHA-256 hashes where applicable:

- [ ] URL of infringing page/repository
- [ ] Full page source/archive (use `wget --mirror` or web archive)
- [ ] Repository commit history and author information
- [ ] Release/download files with SHA-256
- [ ] Fork relationships and clone activity
- [ ] Screenshots of infringing code, UI, branding
- [ ] Date/time of discovery and evidence collection method

### Step 3: Technical Comparison

Compare the suspected infringing material against our codebase:

- [ ] Identical code blocks (line-by-line comparison)
- [ ] Same comments, variable names, naming conventions
- [ ] Identical directory structure
- [ ] Same bugs, edge-case errors, or "fingerprints" in code
- [ ] Similar commit sequence or refactoring patterns
- [ ] Matching architectural decisions or design patterns

### Step 4: Confirm Rights Holder

- [ ] Verify we are the legitimate rights holder
- [ ] Check employment/contractor IP assignment agreements
- [ ] Confirm no prior licensing or authorization was granted
- [ ] Review contributor agreements for any transferred rights

### Step 5: Legal Assessment

- [ ] Determine the type of IP involved (copyright, trademark, trade secret, patent)
- [ ] Check if the infringer may have obtained legitimate authorization
- [ ] Assess damage scope and commercial impact
- [ ] Consult qualified IP attorney before taking action

### Step 6: Choose Response Method

Based on legal assessment, select appropriate action:

| Severity | Action |
|----------|--------|
| Minor / accidental | Contact letter requesting takedown |
| Commercial misuse | Attorney letter (律师函) |
| Platform-hosted infringement | DMCA takedown notice |
| Major / willful | Litigation consideration |

### Step 7: Execute and Document

- [ ] Send chosen notice through proper legal channels
- [ ] Record all correspondence
- [ ] Monitor for compliance
- [ ] Escalate if no response within reasonable timeframe

## DMCA Notice Guidelines

- DMCA applies ONLY to specific copyright infringement, NOT trademark, patent, contract, or trade secret violations.
- Complaint content must be TRUE and ACCURATE. False claims carry legal risk.
- Include: identification of copyrighted work, URL of infringing material, contact info, good faith statement, accuracy statement under penalty of perjury.
- Submit to the platform's designated DMCA agent (not general support).

## Evidence Preservation Tools

```bash
# Archive a webpage
wget --mirror --convert-links --adjust-extension --page-requisites \
  --no-parent https://example.com/infringing-page

# Hash downloaded files
sha256sum infringing-code.zip

# Git clone for analysis (read-only)
git clone --depth 1 https://github.com/example/infringing-repo /tmp/evidence-<date>
```

## When to Escalate to Counsel

- Any commercial-scale infringement
- Repeat offenders
- Cross-border infringement
- Cases involving trade secrets
- When DMCA counter-notice is received
- Any litigation threat

---

*This procedure does not constitute legal advice. Major incidents should be handled by professional legal counsel.*
