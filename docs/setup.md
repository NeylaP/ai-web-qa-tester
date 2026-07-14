# Setup Guide

## Prerequisites

- **Node.js**: v20+ LTS (validated on v24.15.0)
- **npm**: bundled with Node (no separate install needed)
- **OS**: Windows, macOS, or Linux (all supported)

## Install

```bash
npm ci
```

## Verify

Run all targets across all 5 projects:

```bash
npx nx run-many -t lint test build --all
```

Expected output: all targets green, zero errors.

## Projects

| Project | Type | Path | Tags |
|---------|------|------|------|
| `api` | NestJS application | `api/` | `type:app, scope:platform` |
| `web` | Angular application | `web/` | `type:app, scope:platform` |
| `cli` | Node CLI | `cli/` | `type:app, scope:platform` |
| `core-domain` | Domain library | `core-domain/` | `type:domain, scope:core` |
| `core-application` | Application library | `core-application/` | `type:application, scope:core` |

## Run individual targets

```bash
# Test one project
npx nx test api

# Test all
npx nx run-many -t test --all

# Lint one project
npx nx lint core-domain

# Build one project
npx nx build web
```

## Module boundaries

The monorepo enforces import constraints via `@nx/enforce-module-boundaries`:
- `core-domain` cannot import from any other monorepo project
- `core-application` can only import from `core-domain`
- `api`, `web`, `cli` can import from both `core-domain` and `core-application`

Violations are caught at lint time (`nx lint <project>`).

## Known gotchas

- Angular tests require `pool: 'forks'` in `web/vite.config.mts` — already configured. Removing it causes `NG0401: No platform exists!`.
- Nx v21 infers test targets as `vite:test`, not `test`. All projects have explicit `test` targets defined in their `project.json` to avoid this.
