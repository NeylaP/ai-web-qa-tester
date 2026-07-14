# Proposal: Day 1 Base Setup

## Intent

Bootstrap the Nx v21 monorepo from a completely empty directory. Produce exactly **5 projects** (3 apps + 2 core libs) that compile, test, and lint. Validate Angular + Vitest compatibility via a disposable spike before committing to the final workspace. All tooling must work on Windows, Linux, and macOS without undocumented manual configuration.

## Scope

### In Scope
- Nx v21 workspace (exact patch version pinned, `--preset=ts`, npm, Node 20+ LTS)
- 3 app scaffolds: `api` (NestJS), `web` (Angular), `cli` (Node/Commander)
- 2 core libs: `core-domain` (entities, value objects, contracts, domain errors — zero framework deps), `core-application` (use cases, ports, application interfaces)
- Disposable compatibility spike: Angular + Vitest via `@analogjs/vitest-angular` on Nx v21, validated on Windows
- Vitest for `api`, `cli`, and all libs; Angular test runner determined by spike result
- ESLint + Prettier via Nx defaults
- TypeScript strict mode across all 5 projects
- Nx module boundary tags + constraint rules enforced and tested with an intentional violation
- ADR documenting exact Nx version matrix and Angular testing strategy decision
- Installation documentation
- Flip `openspec/config.yaml` → `strict_tdd: true` after Vitest verified

### Out of Scope
- `mcp-server` and `worker` apps (deferred — no logic to justify maintaining them yet)
- All specialized libs beyond `core-domain` and `core-application`
- `@libsql/client` and any SQLite configuration (decision sealed, install deferred to persistence stage)
- Pino (deferred to Day 1 NestJS module setup — no logging context yet)
- Playwright (deferred to Day 7 — no E2E scenarios to run)
- Domain entities, interfaces, or business logic
- NestJS modules beyond root AppModule
- Angular routes, components, or modules beyond scaffolded shell
- Docker, CI/CD pipelines
- E2E test scenarios

## Capabilities

### New Capabilities
- `workspace-bootstrap`: Nx v21 workspace with 5 projects, strict TS, ESLint, Prettier, passing builds
- `testing-infrastructure`: Vitest for NestJS/CLI/libs + Angular test strategy validated by spike

### Modified Capabilities
None — greenfield project.

## Approach

**Phase 0 — Compatibility Spike (disposable workspace)**

1. Create throwaway workspace with exact Nx v21 patch version
2. Inspect real generator options: `npx nx g @nx/angular:application --help`
3. Install `@nx/angular`, `@nx/vite`, and Analog packages at compatible versions
4. Generate Angular app and configure Vitest using the options actually available in Nx v21
5. Run `npx nx test web` — must pass
6. Run `npx nx test web --coverage` — must pass
7. Run a real component test using `TestBed` (not a trivial `1 + 1` assertion)
8. Validate all of the above on Windows without undocumented manual config
9. **If spike passes** → Vitest for Angular confirmed. **If spike fails** → fallback to Jest for Angular only; document via ADR; do not invest more Day 1 time forcing the integration

**Phase 1 — Real Workspace**

1. `npx create-nx-workspace@<exact-patch> ai-web-qa-tester --preset=ts --pm=npm`
2. Generate `api`, `web`, `cli` apps with the test runner confirmed in Phase 0
3. Generate `core-domain` and `core-application` as `@nx/js` libs with `--bundler=tsc`
4. Configure `tsconfig.base.json`: strict mode, path aliases (`@ai-web-qa-tester/*`)
5. Apply module boundary tags and constraint rules in `.eslintrc.json`
6. Run `npx nx run-many -t lint test build --all` — all must pass

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `/` (root) | New | `nx.json`, `package.json` (exact pinned versions), `tsconfig.base.json`, `.prettierrc`, `.eslintrc.json` |
| `apps/api` | New | NestJS scaffold, Vitest |
| `apps/web` | New | Angular scaffold, Vitest or Jest per spike |
| `apps/cli` | New | Node scaffold, Vitest |
| `libs/core-domain` | New | Entities, value objects, contracts, domain errors — zero framework imports |
| `libs/core-application` | New | Use cases, ports, app interfaces — can depend on `core-domain` only |
| `openspec/config.yaml` | Modified | `strict_tdd: false → true` |
| `docs/decisions/` | New | ADR-0001: Nx version matrix + Angular testing strategy |

## Module Boundary Tags

```
apps/api:               type:app, scope:platform
apps/web:               type:app, scope:platform
apps/cli:               type:app, scope:platform
libs/core-domain:       type:domain, scope:core
libs/core-application:  type:application, scope:core
```

Constraint rules:
- `core-domain` → no deps on NestJS, Angular, Playwright, persistence, or infrastructure
- `core-application` → can depend on `core-domain`; cannot depend on apps
- Apps → can depend on `core-application` and `core-domain`
- No library can depend on an application

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `@analogjs/vitest-angular` incompatible with Nx v21 on Windows | Med | Spike validates before final workspace; fallback to Jest for Angular |
| Nx v21 generator option names differ from docs | Med | Run `--help` on generators; document actual options used in ADR |
| `ts-morph` composite project alignment (needed Day 3+) | Low | Validate tsconfig project references on Day 1 |

## Rollback Plan

Delete the workspace directory. The spike workspace is disposable — delete it after Phase 0 regardless of outcome. No external state modified, no packages published.

## Dependencies

- Node.js 20+ LTS
- npm
- Internet access for package downloads
- Windows: no native build tools required (no native bindings installed on Day 1)

## Success Criteria

- [ ] Workspace Nx v21 created with exact pinned patch versions
- [ ] `apps/api` compiles
- [ ] `apps/web` compiles
- [ ] `apps/cli` compiles
- [ ] `libs/core-domain` compiles and has passing tests
- [ ] `libs/core-application` compiles and has passing tests
- [ ] Vitest works for `api`, `cli`, and both libs
- [ ] Selected Angular test strategy executes a real `TestBed` component test
- [ ] `npx nx run-many -t lint test build --all` passes with zero errors
- [ ] Module boundary tags configured; intentional violation produces lint error
- [ ] No circular dependencies
- [ ] No TypeScript errors (`tsc --noEmit` or `nx typecheck`)
- [ ] `docs/decisions/ADR-0001.md` exists with Nx version matrix and Angular strategy
- [ ] Installation documentation exists
- [ ] `strict_tdd: true` in `openspec/config.yaml`
