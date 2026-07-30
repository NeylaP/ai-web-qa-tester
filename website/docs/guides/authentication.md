---
sidebar_position: 2
title: Authentication
---

# Authentication

Most real APIs require authentication. `ai-web-qa-tester` supports Bearer JWT tokens via three methods, checked in this order:

1. `--auth-token <token>` — inline flag
2. `--auth-env <VAR>` — environment variable
3. `.qa/auth.json` — config file with optional auto-login

## Option 1 — Inline flag

```bash
qa-tester pipeline \
  --backend ./api \
  --base-url http://localhost:3000 \
  --auth-token "eyJhbGciOiJSUzI1NiJ9..."
```

:::warning
Avoid this in CI — the token will appear in logs.
:::

## Option 2 — Environment variable (recommended for CI)

```bash
export QA_AUTH_TOKEN=eyJhbGciOiJSUzI1NiJ9...

qa-tester pipeline \
  --backend ./api \
  --base-url http://localhost:3000 \
  --auth-env QA_AUTH_TOKEN
```

In GitHub Actions:

```yaml
- name: Run QA
  run: |
    qa-tester pipeline \
      --backend ./api \
      --base-url http://localhost:3000 \
      --auth-env QA_AUTH_TOKEN
  env:
    QA_AUTH_TOKEN: ${{ secrets.QA_AUTH_TOKEN }}
```

## Option 3 — `.qa/auth.json` with static token

Create `.qa/auth.json` inside your backend project:

```json
{
  "type": "bearer",
  "token": "eyJhbGciOiJSUzI1NiJ9..."
}
```

## Option 4 — `.qa/auth.json` with auto-login

The tool will POST to your login endpoint, extract the token, and use it:

```json
{
  "type": "bearer",
  "login": {
    "url": "http://localhost:3000/auth/login",
    "body": {
      "username": "qa-user@example.com",
      "password": "super-secret"
    },
    "tokenPath": "access_token"
  }
}
```

The `tokenPath` is a dot-notation path to the JWT in the response. For example:
- `"access_token"` → `response.access_token`
- `"data.token"` → `response.data.token`
- `"auth.jwt"` → `response.auth.jwt`

:::caution
Add `.qa/auth.json` to `.gitignore` if it contains credentials.
:::

## How the token is injected

The token is added as `extraHTTPHeaders` in the Playwright config that the tool generates:

```typescript
use: {
  baseURL: 'http://localhost:3000',
  extraHTTPHeaders: {
    Authorization: 'Bearer eyJhbGc...',
  },
},
```

All generated tests inherit this header automatically — no changes needed in the test files.

## Multi-tenant backends (origin_dev)

Some backends require an additional `origin_dev` header to identify the tenant:

```bash
qa-tester pipeline \
  --backend ./api \
  --base-url http://localhost:3000 \
  --auth-token "eyJ..." \
  --origin-header "https://my-tenant.example.com"
```
