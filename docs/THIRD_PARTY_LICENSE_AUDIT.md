# Third-Party License Audit

**Project**: Presentation OS
**Date**: 2026-07-21
**Scope**: All dependencies declared in `package.json`

## Method

Audit based on `npm ls --all --json` output and known license databases. Entries marked UNKNOWN require manual verification.

## Dependencies

| Name | Version | License | Direct? | Risk Level | Action Required |
|------|---------|---------|---------|------------|-----------------|
| @anthropic-ai/sdk | 0.53.0 | MIT | Yes | Low | None |
| @modelcontextprotocol/sdk | 1.17.9 | MIT | Yes | Low | None |
| @types/node | 22.18.13 | MIT | Yes | Low | None |
| ai | 4.3.19 | Apache-2.0 | Yes | Low | None |
| chalk | 5.6.2 | MIT | Yes | Low | None |
| commander | 13.1.0 | MIT | Yes | Low | None |
| dotenv | 17.2.3 | BSD-2-Clause | Yes | Low | None |
| execa | 9.6.0 | MIT | Yes | Low | None |
| glob | 11.0.3 | ISC | Yes | Low | None |
| openai | 5.21.0 | Apache-2.0 | Yes | Low | None |
| prettier | 3.7.4 | MIT | Yes | Low | None |
| zod | 3.25.76 | MIT | Yes | Low | None |
| puppeteer | 24.15.0 | Apache-2.0 | Yes | Medium | Chromium binary license check |
| sharp | 0.34.5 | Apache-2.0 + LGPLv3 | Yes | **Medium** | Native binding uses libvips (LGPLv3) |
| pdf-parse | 1.1.1 | MIT | Yes | Low | None |
| pptxgenjs | 4.1.1 | MIT | Yes | Low | None |
| tree-sitter-wasms | 0.1.11 | MIT | Yes | Low | None |
| tree-sitter-typescript | 0.46.0 | MIT | Yes | Low | None |
| typescript | 5.9.3 | Apache-2.0 | Yes | Low | None |
| vitest | 3.2.1 | MIT | Yes | Low | None |
| pino | 9.9.0 | MIT | Yes | Low | None |
| pino-pretty | 13.1.1 | MIT | Yes | Low | None |
| winston | 3.17.0 | MIT | Yes | Low | None |
| winston-consumer | 2.0.0 | MIT | Yes | Low | None |
| winston-daily-rotate-file | 5.0.0 | MIT | Yes | Low | None |
| winston-loglevel-to-winston | 1.0.0 | MIT | Yes | Low | None |
| winston-loki | 6.1.4 | MIT | Yes | Low | None |
| winston-slack-webhook-bundle | 1.0.0 | MIT | Yes | Low | None |
| winston-transport | 4.9.0 | ISC | Yes | Low | None |
| ws | 8.18.3 | MIT | Yes | Low | None |
| yargs | 17.7.2 | MIT | Yes | Low | None |

## Risk Summary

### Low Risk (MIT, ISC, BSD-2, Apache-2.0)
- No copyleft obligations
- Attribution required via NOTICE file
- Safe for proprietary/closed-source integration

### Medium Risk

| Dependency | Issue | Mitigation |
|-----------|-------|------------|
| `sharp` | Bundles libvips under LGPLv3 | Ensure sharp is used as a dynamic link, not statically linked. Review Sharp's licensing FAQ. Consider replacing with `jimp` or `canvas` if strict proprietary distribution is needed. |
| `puppeteer` | Downloads Chromium (Chromium license) | Chromium is BSD-style. Verify no GPL components are bundled. |

### Unknown / Requires Verification

| Dependency | Status |
|-----------|--------|
| `winston-consumer@2.0.0` | License field present as MIT but verify on npm registry |
| `winston-loglevel-to-winston@1.0.0` | License field present as MIT but verify on npm registry |
| `winston-slack-webhook-bundle@1.0.0` | License field present as MIT but verify on npm registry |

## Copyleft / AGPL / SSPL Check

- **No AGPL dependencies detected.**
- **No SSPL dependencies detected.**
- **No GPL dependencies detected.**
- `sharp` uses LGPLv3 via libvips — this is a **weak copyleft** license that does NOT infect the host application if dynamically linked.

## Recommendations

1. **Retain all current dependencies** — no immediate license conflicts identified.
2. **Review `sharp` LGPL compliance** — confirm dynamic linking only.
3. **Verify unknown licenses** on npm registry before next release.
4. **Update NOTICE.md** with third-party attribution if distributing commercially.
5. **Run `npm audit`** regularly for security vulnerabilities.

---

*This audit is based on package metadata. License terms may change between versions. Always verify against the actual license text in `node_modules/<package>/LICENSE*`.*
