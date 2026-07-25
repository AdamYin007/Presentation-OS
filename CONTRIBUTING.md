# Contributing to Presentation OS

Thank you for considering contributing to Presentation OS. This guide establishes the intellectual property, security, and code review requirements for all contributions.

## Important Notice

**Presentation OS is proprietary, closed-source software.** All contributions are subject to the terms in [LICENSE.md](LICENSE.md) and [NOTICE.md](NOTICE.md). By contributing, you confirm that:

1. You have the right to submit the content
2. The content does not violate any third-party intellectual property rights
3. You agree to the terms outlined in this document

## How to Contribute

### 1. Fork and Clone

```bash
git clone https://github.com/AdamYin007/Presentation-OS.git
cd Presentation-OS
```

### 2. Create a Branch

**All changes must go through branches and Pull Requests.** Never push directly to `develop` or `main`.

```bash
git checkout -b feat/your-feature-name develop
# or
git checkout -b fix/your-fix-name develop
# or
git checkout -b docs/your-doc-change develop
```

### 3. Make Changes

- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation as needed
- **Do NOT commit secrets, tokens, API keys, customer data, or personal information**

### 4. Commit

Use clear, descriptive commit messages:

```bash
feat(packages/cli): add new command for template analysis
fix(packages/renderer): resolve background image injection bug
docs: update contributing guidelines
```

### 5. Push and Open PR

```bash
git push origin feat/your-feature-name
```

Then open a Pull Request using the provided [PR Template](.github/pull_request_template.md).

## Intellectual Property Requirements

### Copyright Confirmation

By submitting a Pull Request, you confirm that:

- You own the copyright to your contributions, OR
- You have obtained written permission from the copyright holder, OR
- The contributions are your original work created within the scope of your employment/contract, AND your employer has assigned rights to you or the project owner

### External Contributors

External contributors (contractors, freelancers, vendors) MUST:

1. Sign a [Contributor License Agreement (CLA)](TODO: add CLA link) or equivalent written IP agreement before contributions can be merged
2. Confirm that no third-party code is included without proper attribution and license compliance
3. Disclose any AI-generated code and confirm human review

**Note**: DCO (Developer Certificate of Origin) alone does NOT constitute copyright assignment. Employment, contractor, and outsourcing IP ownership is governed by individual contracts.

### AI-Generated Code

If you use AI tools to generate code:

- [ ] You have reviewed the generated code for correctness
- [ ] You have checked for third-party copyright conflicts
- [ ] You have verified license compatibility
- [ ] You have assessed security implications
- [ ] You have confirmed maintainability

AI-generated code does NOT transfer copyright to you unless you have the legal right to do so.

## Security Requirements

### Sensitive Data

**NEVER commit:**

- `.env` files or environment variables containing secrets
- API keys, tokens, passwords, or credentials
- Customer data, test patient data, or personal information
- Private keys (SSH, GPG, SSL/TLS)
- Internal configuration with production endpoints
- Screenshots containing sensitive information

### Reporting Vulnerabilities

If you discover a security vulnerability:

1. **Do NOT disclose it publicly**
2. Report it privately per [SECURITY.md](SECURITY.md)
3. Do NOT access data beyond what is necessary to reproduce the issue

## Code Review

### Review Process

All Pull Requests require:

1. **At least 1 approval** from a maintainer
2. **Code Owner approval** for core directories (`packages/`, `core/`, `schemas/`, `templates/`)
3. **All CI checks passing**
4. **All review threads resolved**
5. **No force pushes** after initial submission (new commits revoke old approvals)

### Review Checklist

Reviewers should verify:

- [ ] Code follows existing patterns and conventions
- [ ] No sensitive data or secrets included
- [ ] Tests added/updated where appropriate
- [ ] Documentation updated
- [ ] IP source is confirmed
- [ ] No third-party code without proper license
- [ ] Security implications considered
- [ ] Performance impact assessed

## Dependency Management

When adding new dependencies:

1. Check license compatibility (see [THIRD_PARTY_LICENSE_AUDIT.md](docs/THIRD_PARTY_LICENSE_AUDIT.md))
2. Record in dependency audit file
3. Prefer well-maintained, widely-used packages
4. Avoid copyleft licenses (GPL, AGPL) unless approved by legal counsel
5. Document why the dependency is needed

## Commit Signing

We encourage signed commits for integrity and non-repudiation. See [docs/COMMIT_SIGNING_SETUP.md](docs/COMMIT_SIGNING_SETUP.md) for setup instructions.

## Questions?

Open a GitHub Discussion or contact the maintainers.

---

*This contributing guide does not constitute legal advice. For IP or licensing questions, consult qualified legal counsel.*
