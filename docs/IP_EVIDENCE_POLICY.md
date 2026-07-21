# IP Evidence Policy

Every official release of Presentation OS should maintain an evidence package suitable for software copyright registration and infringement disputes.

## What to Archive Per Release

For each正式 version (tagged release), save the following:

### 1. Source Code Archive

- Full source tree at the release commit (excluding `.git`, `node_modules`, build artifacts).
- Use `scripts/create-ip-evidence-package.sh` to generate.

### 2. Cryptographic Hashes

- SHA-256 of the source archive.
- SHA-256 of each critical file (LICENSE, core packages, key schemas).

### 3. Signed Tag

- Create an annotated, GPG/SSH-signed tag for each release.
- Record the tag name, commit hash, signing key fingerprint, and timestamp.

### 4. GitHub Release Information

- Release title, body, assets, and publication time.
- Screenshot or JSON export of the release page.

### 5. Architecture & Design Documents

- `docs/ARCHITECTURE.md`
- Any design RFCs or MILESTONE documents tied to the release.

### 6. User Documentation

- README, API docs, deployment guides.

### 7. Requirements Documents

- Content plans, feature specs, product requirement notes.

### 8. Test Reports

- QA manifests, regression reports, visual QA screenshots.
- Test pass/fail summaries.

### 9. Dependency & License Inventory

- `docs/THIRD_PARTY_LICENSE_AUDIT.md`
- Lock file snapshots (`package-lock.json`).

### 10. Contributor List

- `git shortlog -sn` at the release commit.
- CLA/DCO records if applicable.

### 11. Ownership Contracts

- Employment contracts, contractor agreements, NDA records.
- Outsourcing delivery acceptance documents.

### 12. Key Meeting & Review Records

- Minutes from architecture reviews, product reviews, IP ownership meetings.

### 13. Trusted Timestamp / Notarization

- For high-value releases, consider:
  - RFC 3161 trusted timestamping
  - Notarization by a Chinese notary public
  - Copyright registration with China National Copyright Administration (NCAC)

### 14. Software Copyright Registration Materials

- See `docs/CN_SOFTWARE_COPYRIGHT_REGISTRATION_CHECKLIST.md`.

## Storage Recommendations

- Store evidence packages in a separate, access-controlled location (not in the public repo).
- Use encrypted storage if storing offline.
- Maintain a manifest file listing all evidence items with checksums.

## When to Create

- Every official release tag.
- Before any public demo, paper, or sales material publication.
- After any suspected infringement discovery.

---

*This policy does not constitute legal advice. Consult qualified counsel for copyright registration and enforcement decisions.*
