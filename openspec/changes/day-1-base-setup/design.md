# Design: Day 1 Base Setup

## Technical Approach

Two-phase execution: Phase 0 runs a disposable spike to validate Angular + Vitest on Windows with a real `TestBed` test; Phase 1 creates the real workspace using the confirmed test runner. All version selections are documented in ADR-0001 before any generator runs.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Nx workspace preset | `--preset=ts`, `--preset=empty`, `--preset=angular-monorepo` | `--preset=empty` | **Spike finding**: `--preset=ts` creates TypeScript project references incompatible with Angular (confirmed on Nx v21.6.11). `--preset=empty` avoids project references entirely; Angular and NestJS are still peers |
| Version pinning | `latest`, `^21`, exact patch | Exact patch (e.g., `21.x.y`) | Nx breaks between minors; exact pin ensures reproducible installs on Windows/Linux/macOS |
| Lib structure | Single `shared`, inline in `api`, separate libs | `core-domain` + `core-application` | Hexagonal architecture requires domain/application separation; prevents use case logic from bleeding into domain entities |
| Angular test runner | Vitest, Jest | **Vitest** — `--unitTestRunner=vitest` (native Nx flag) | Spike confirmed: `@nx/angular@21.6.11` supports Vitest natively. Generates TestBed tests + installs `@analogjs/vitest-angular` automatically. No fallback needed. |
| Module boundary enforcement | Manual review, Nx ESLint rule | `@nx/enforce-module-boundaries` with tags | Machine-enforced — zero reliance on discipline; catches violations in lint and CI |

## Data Flow

```
PHASE 0 — Spike (disposable, in temp dir)
  ┌────────────────────────────────────────────────────────────────┐
  │  create-nx-workspace@21.6.11 spike --preset=empty              │
  │  inspect: nx g @nx/angular:application --help                  │
  │    → --unitTestRunner accepts: jest | vitest | none (default: jest) │
  │  nx g @nx/angular:application web --unitTestRunner=vitest      │
  │    → Generates TestBed tests + installs @analogjs/vitest-angular │
  │  nx test web  ✅  (Vitest confirmed natively in Nx v21.6.11)   │
  │  delete spike dir                                              │
  │  RESULT: --unitTestRunner=vitest, --preset=empty               │
  └────────────────────────────────────────────────────────────────┘
                          ↓
PHASE 1 — Real Workspace
  ┌────────────────────────────────────────────────────────────────┐
  │  create-nx-workspace@21.6.11 ai-web-qa-tester --preset=empty   │
  │  nx g @nx/nest:application api                                 │
  │  nx g @nx/angular:application web --unitTestRunner=<confirmed> │
  │  nx g @nx/node:application cli                                 │
  │  nx g @nx/js:library core-domain --bundler=tsc                 │
  │  nx g @nx/js:library core-application --bundler=tsc            │
  │  add tags to each project.json                                 │
  │  configure @nx/enforce-module-boundaries in .eslintrc.json     │
  │  configure tsconfig.base.json (strict + path aliases)          │
  │  add placeholder tests per project                             │
  │  nx run-many -t lint test build --all                          │
  │  write docs/decisions/ADR-0001.md                              │
  │  update openspec/config.yaml → strict_tdd: true                │
  └────────────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `nx.json` | Create | Nx workspace config, plugin registration |
| `package.json` | Create | Exact-pinned `nx` + all `@nx/*` packages (no `^`, `~`, `latest`) |
| `tsconfig.base.json` | Create | Strict TS, `@ai-web-qa-tester/*` path aliases |
| `.eslintrc.json` | Create | `@nx/enforce-module-boundaries` with tag constraint rules |
| `apps/api/project.json` | Create | tags: `type:app, scope:platform` |
| `apps/web/project.json` | Create | tags: `type:app, scope:platform` |
| `apps/cli/project.json` | Create | tags: `type:app, scope:platform` |
| `libs/core-domain/project.json` | Create | tags: `type:domain, scope:core` |
| `libs/core-application/project.json` | Create | tags: `type:application, scope:core` |
| `docs/decisions/ADR-0001.md` | Create | Nx version matrix, Angular test strategy, spike results |
| `openspec/config.yaml` | Modify | `strict_tdd: false → true` |

## Interfaces / Contracts

**Module boundary ESLint constraint** (root `.eslintrc.json`):
```json
{
  "sourceTag": "type:domain",
  "onlyDependOnLibsWithTags": []
},
{
  "sourceTag": "type:application",
  "onlyDependOnLibsWithTags": ["type:domain"]
},
{
  "sourceTag": "type:app",
  "onlyDependOnLibsWithTags": ["type:domain", "type:application"]
}
```

**tsconfig.base.json path aliases**:
```json
{
  "@ai-web-qa-tester/core-domain": ["libs/core-domain/src/index.ts"],
  "@ai-web-qa-tester/core-application": ["libs/core-application/src/index.ts"]
}
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Structural | Boundary constraints enforced | Introduce intentional violation in `core-domain` → `nx lint core-domain` must fail |
| Unit | Placeholder test in each of 5 projects | `nx run-many -t test --all` must pass |
| Component | Angular `TestBed` render | Confirmed by spike; real component, not trivial assertion |
| Full validation | All 5 projects: compile + test + lint | `npx nx run-many -t lint test build --all` |

## Migration / Rollout

No migration required. Rollback: delete workspace directory and spike dir. No external state affected.

## Open Questions

None — all decisions resolved prior to design.
