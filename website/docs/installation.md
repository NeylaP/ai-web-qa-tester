---
sidebar_position: 2
title: Installation
---

# Installation

## Requirements

- **Node.js** 20+
- **npm** 10+
- A **NestJS** backend project
- (Optional) An **Angular** frontend project for route mapping
- (Optional) `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for AI enrichment

---

## Install via npx (recommended)

No global install needed. Run the tool directly:

```bash
npx @npmoncada/ai-web-qa-tester@latest pipeline \
  --backend path/to/backend \
  --base-url http://localhost:3000
```

---

## Install globally

```bash
npm install -g @npmoncada/ai-web-qa-tester
qa-tester --version
```

---

## Install in a project

```bash
npm install --save-dev @npmoncada/ai-web-qa-tester
```

Then in `package.json`:

```json
{
  "scripts": {
    "qa": "qa-tester pipeline --backend . --base-url http://localhost:3000"
  }
}
```

---

## Peer dependencies

Playwright is a peer dependency. Install it if you don't have it:

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

---

## Verify installation

```bash
qa-tester --version
# 0.2.0
```

---

## Next: Quickstart

Run your first QA pipeline in [5 minutes →](quickstart)
