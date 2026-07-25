# SECURITY.md — Security Policy

## Reporting a Vulnerability

**Do NOT disclose security vulnerabilities through public GitHub Issues.**

If you discover a security vulnerability in this project, please report it privately through the following channel:

> 📧 **[SECURITY CONTACT TO BE CONFIGURED]**

Please include:
- A description of the vulnerability
- Steps to reproduce (code, commands, configuration)
- Affected version(s)
- Potential impact assessment (if known)

## Response Process

1. **Acknowledge**: We will acknowledge receipt within 48 hours.
2. **Assess**: The security team will triage and classify the severity.
3. **Fix**: A fix will be developed and tested.
4. **Disclose**: After the fix is released, we will coordinate public disclosure with the reporter.

## Scope

- Source code vulnerabilities (injection, XSS, auth bypass, etc.)
- Dependency vulnerabilities with exploitable impact
- Infrastructure/configuration issues that could lead to data exposure
- Authentication/authorization flaws

## Out of Scope

- Issues in third-party dependencies (report to upstream maintainers)
- Social engineering attacks against users
- Denial-of-service against our infrastructure
- Requests for access beyond your authorization level

## Rules for Reporters

- Do **not** access, modify, or delete data beyond what is necessary to reproduce the issue.
- Do **not** publicly disclose the vulnerability before a fix is available.
- Do **not** attempt to exploit the vulnerability beyond proof-of-concept.
- Do **not** publish or share real secrets, tokens, credentials, or personal data found during testing.

## Security vs. Feature Issues

| Category | Channel |
|----------|---------|
| Security vulnerability | Private report via SECURITY.md contact |
| Bug / feature request | GitHub Issue |
| General question | GitHub Discussion / community channel |

## Commit Signing

We encourage all contributors to sign commits with GPG or SSH signatures. See [docs/COMMIT_SIGNING_SETUP.md](docs/COMMIT_SIGNING_SETUP.md) for setup instructions.

---

*This policy does not constitute legal advice. For legal matters, consult qualified counsel.*
