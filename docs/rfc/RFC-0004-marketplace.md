# RFC-0004 — Marketplace Specification

> **Status**: Draft  
> **Authors**: Presentation OS Architecture Board  
> **Date**: 2026-07-01  
> **Version**: 1.0.0  
> **Track**: Platform  
> **Supersedes**: None  
> **Depends On**: RFC-0001, RFC-0002, RFC-0003

---

## 1. Status

**Draft**

This RFC defines the Marketplace specification — how Presentation Packs are distributed, discovered, installed, and updated.

---

## 2. Authors

Presentation OS Architecture Board

---

## 3. Motivation

### Why a Marketplace?

Presentation Packs are the industry knowledge layer of the platform. Without a distribution mechanism:

- Pack authors have no way to share their work
- Pack users have no way to discover available Packs
- Pack installation is manual and error-prone
- Pack updates are not coordinated

A Marketplace provides:
- Centralized Pack discovery and installation
- Automated Pack updates
- Pack version management
- Trust and reputation system

### Why Not Just Use npm?

npm is a code package manager. Presentation Packs are **data + code bundles** with specific requirements:

- Packs need to be validated against the Core SDK before installation.
- Packs may contain binary assets (SVG icons, example PPTX files).
- Packs have Core version compatibility requirements.
- Packs may depend on other Packs.

A dedicated Marketplace layer addresses these requirements while optionally leveraging existing package registries.

---

## 4. Goals

1. **Pack Discovery** — Users can find Packs relevant to their industry.

2. **Pack Installation** — Users can install Packs with a single command.

3. **Pack Updates** — Pack updates are automatic and safe.

4. **Trust System** — Pack authors and reviewers are identifiable and accountable.

5. **Offline Support** — Packs can be cached and used offline.

---

## 5. Non-Goals

This RFC does NOT define:

- **Pack payment or pricing** — Commercial transactions are out of scope.
- **Pack copyright enforcement** — Legal matters are out of scope.
- **Pack content moderation** — Quality is enforced by validation, not curation.
- **Pack analytics or telemetry** — Usage data collection is out of scope.
- **Pack review UI** — User interfaces are out of scope.
- **Pack subscription management** — Billing is out of scope.

---

## 6. Marketplace Architecture

```
Presentation OS Marketplace
├── Registry (Pack index)
├── Installer (Pack deployment)
├── Validator (Pack verification)
├── Updater (Pack lifecycle)
└── Cache (Pack storage)
```

### Registry

Central index of all available Packs. Contains:
- Pack metadata (name, version, description, author).
- Pack download URLs.
- Pack compatibility matrix (Core version, other Packs).
- Pack checksums for integrity verification.

### Installer

Deploys Packs to the local system. Handles:
- Downloading Pack files.
- Validating Pack integrity (checksums).
- Installing Pack to the correct directory.
- Registering Pack with the platform.

### Validator

Verifies Packs before installation:
- Validates `pack.json` manifest.
- Checks Core version compatibility.
- Runs static validation (schema checks).
- Runs dynamic validation (sandboxed execution).

### Updater

Manages Pack lifecycle:
- Detects available updates.
- Downloads and validates new versions.
- Rolls back on failure.
- Maintains version history.

### Cache

Local storage for Packs:
- Cached Pack downloads (offline support).
- Cached validation results.
- Cached Pack metadata.

---

## 7. Pack Registry

### 7.1 Registry Format

The registry is a JSON index:

```json
{
  "name": "presentation-os-marketplace",
  "version": "1.0.0",
  "packages": {
    "digital-pathology-pack": {
      "name": "digital-pathology-pack",
      "version": "1.0.0",
      "description": "Presentation templates for digital pathology",
      "author": "AWE Medical Team",
      "license": "MIT",
      "minCoreVersion": "1.0.0",
      "maxCoreVersion": "1.99.99",
      "type": "story",
      "downloads": [
        {
          "url": "https://registry.example.com/packs/digital-pathology-pack/1.0.0.tgz",
          "integrity": "sha512-abc123..."
        }
      ],
      "dependencies": [],
      "tags": ["medical", "pathology"],
      "publishedAt": "2026-07-01T00:00:00Z",
      "verified": true
    }
  }
}
```

### 7.2 Registry Fields

| Field | Type | Description |
|---|---|---|
| `name` | string | Pack unique identifier |
| `version` | string | Pack version (semver) |
| `description` | string | Pack description |
| `author` | string | Pack author name |
| `license` | string | SPDX license identifier |
| `minCoreVersion` | string | Minimum compatible Core version |
| `maxCoreVersion` | string | Maximum compatible Core version |
| `type` | string | Primary Pack type |
| `downloads` | array | Download URLs with integrity hashes |
| `dependencies` | array | Other Pack names this Pack depends on |
| `tags` | array | Search tags |
| `publishedAt` | string | ISO 8601 publication date |
| `verified` | boolean | Whether the Pack has been validated |

---

## 8. Pack Installation

### 8.1 Install Command

```bash
# Install a Pack from registry
aos pack install digital-pathology-pack

# Install a specific version
aos pack install digital-pathology-pack@1.0.0

# Install from local file
aos pack install ./my-pack.tgz

# Install from URL
aos pack install https://example.com/my-pack.tgz
```

### 8.2 Install Process

```
User runs `aos pack install <pack-name>`
  ↓
Registry lookup: find latest compatible version
  ↓
Download Pack archive
  ↓
Validate integrity (checksum)
  ↓
Validate manifest (pack.json)
  ↓
Check Core compatibility
  ↓
Run static validation
  ↓
Install to local directory
  ↓
Register with platform
  ↓
Success or rollback
```

### 8.3 Rollback

If installation fails at any step:
1. Remove partially installed Pack.
2. Restore previous state.
3. Report error to user.

---

## 9. Pack Updates

### 9.1 Update Command

```bash
# Update all installed Packs
aos pack update

# Update a specific Pack
aos pack update digital-pathology-pack

# Check for available updates
aos pack list --updates
```

### 9.2 Update Process

1. Compare installed Pack version with registry version.
2. Download new Pack archive.
3. Validate new Pack.
4. Install new Pack (atomic swap).
5. If validation fails → rollback to previous version.

### 9.3 Update Safety

- Updates are atomic: install succeeds completely or rolls back completely.
- Previous version is preserved until the new version passes validation.
- Core version compatibility is re-checked on every update.

---

## 10. Pack Verification

### 10.1 Verification Levels

| Level | Description | Trust |
|---|---|---|
| **Unverified** | Pack not validated by registry | Low — use at own risk |
| **Static Validated** | Pack passes schema validation | Medium — structure is correct |
| **Core Tested** | Pack passes integration tests with Core | High — Pack works with Core |
| **Community Verified** | Pack reviewed by community | Highest — trusted by users |

### 10.2 Verification Process

```
Pack submission
  ↓
Static validation (automated)
  ↓
Core integration test (automated)
  ↓
Security audit (manual, for high-trust packs)
  ↓
Verification level assigned
```

---

## 11. Pack Caching

### 11.1 Cache Location

```
~/.aos/cache/
├── packs/              # Downloaded Pack archives
├── validation/         # Cached validation results
├── registry/           # Cached registry index
└── metadata/           # Pack metadata
```

### 11.2 Cache Invalidation

Cache is invalidated when:
- Pack version changes.
- Registry index is updated.
- Cache exceeds size limit (1 GB default).
- User runs `aos pack cache clear`.

---

## 12. Local Registry

### 12.1 Purpose

Not all organizations want to use a public registry. A local registry provides:

- Internal Pack distribution.
- Offline Pack installation.
- Custom Pack validation policies.

### 12.2 Local Registry Setup

```bash
# Initialize local registry
aos registry init --local

# Publish Pack to local registry
aos registry publish my-pack.tgz

# Install from local registry
aos registry install my-pack --local
```

### 12.3 Local Registry Format

Identical to the public registry format. Stored locally at `~/.aos/registry/`.

---

## 13. Pack Dependencies

### 13.1 Declaring Dependencies

Packs can declare dependencies on other Packs:

```json
{
  "dependencies": [
    "medical-icons-pack",
    "healthcare-validation-pack"
  ]
}
```

### 13.2 Dependency Resolution

When installing a Pack:
1. Resolve all dependencies recursively.
2. Check version compatibility between dependent Packs.
3. Check Core compatibility for all Packs.
4. Install dependencies before the main Pack.

### 13.3 Circular Dependencies

Circular Pack dependencies are not allowed. The installer detects and rejects them.

---

## 14. Security Model

### 14.1 Integrity Verification

All Pack downloads are verified using SHA-256 checksums stored in the registry.

### 14.2 Signed Packages (Future)

Future versions may support cryptographic signing:

```json
{
  "signature": "-----BEGIN SIGNATURE-----\n<base64-encoded-signature>\n-----END SIGNATURE-----",
  "signer": "author@example.com",
  "algorithm": "RSA-SHA256"
}
```

### 14.3 Sandbox Enforcement

Packs installed via the Marketplace run in the same sandbox as manually installed Packs (defined in RFC-0003).

---

## 15. Extension Rules

### 15.1 Adding a New Registry Backend

1. Define the registry interface.
2. Implement the backend.
3. No RFC required (additive change).

### 15.2 Changing Verification Levels

1. Define the new level.
2. Update validation pipeline.
3. Require RFC-0004 amendment.

### 15.3 Adding Cryptographic Signing

1. Define the signing format.
2. Implement verification in the installer.
3. Require RFC-0004 amendment.

---

## 16. Future RFCs

| RFC | Topic | Relationship |
|---|---|---|
| RFC-0001 | Platform Specification | Defines the platform this Marketplace serves |
| RFC-0002 | SDK Specification | Defines the SDK Packs use |
| RFC-0003 | Presentation Pack Specification | Defines Pack format this Marketplace distributes |

---

## 17. Implementation Status

**Not for Immediate Implementation**

RFC-0004 defines the Marketplace — a distribution and discovery layer for Presentation Packs. This is an infrastructure concern that depends on RFC-0002 (SDK) and RFC-0003 (Pack spec) being stable. The registry format, installer, and updater are well-defined but should not be implemented until there is demand for third-party Pack distribution. The Pack lifecycle (Section 9 in RFC-0003) covers manual distribution; the Marketplace automates this.

---

## Appendix A: Marketplace Version History

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-07-01 | Initial Marketplace specification. Registry, installer, updater, validator, cache, local registry, dependencies, security. |

---

*This RFC defines the Marketplace specification. It will be updated as the platform evolves. Last reviewed: 2026-07-01.*
