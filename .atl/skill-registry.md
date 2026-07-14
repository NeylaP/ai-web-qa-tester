# Skill Registry
**Project**: ai-web-qa-tester
**Generated**: 2026-07-11
**Source**: sdd-init

## Convention Files
| File | Scope | Purpose |
|------|-------|---------|
| `~/.config/opencode/AGENTS.md` | Global | Agent personality, SDD workflow, Engram protocol, PR guard, Handoff |

## SDD Workflow Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `sdd-init` | `/sdd-init` | Initialize SDD context in project |
| `sdd-explore` | `/sdd-explore <topic>` | Explore ideas, investigate codebase before committing |
| `sdd-propose` | `/sdd-propose <name>` | Create change proposal with intent and scope |
| `sdd-spec` | `/sdd-spec <change>` | Write Given/When/Then specifications |
| `sdd-design` | `/sdd-design <change>` | Technical design + sequence diagrams + ADRs |
| `sdd-tasks` | `/sdd-tasks <change>` | Break change into hierarchical task checklist |
| `sdd-apply` | `/sdd-apply <change>` | Implement tasks from a change |
| `sdd-verify` | `/sdd-verify <change>` | Validate implementation vs specs |
| `sdd-archive` | `/sdd-archive <change>` | Sync delta specs and archive completed change |
| `sdd-onboard` | `/sdd-onboard` | Guided end-to-end SDD walkthrough |

## QA & Testing Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `qa-test-generator` | "generate test cases", "crear test cases", "quiero testear el flujo de", screenshots + URL | Generate QA Automation Center test case JSON configs |

## Project Management Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `task-intake` | Trello card URL provided, or session close with active card | Trello card intake and session tracking |
| `branch-pr` | Creating PR, preparing changes for review | PR creation workflow |
| `issue-creation` | Creating GitHub issue, reporting bug, requesting feature | GitHub issue creation workflow |

## Code Quality Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `judgment-day` | "judgment day", "review adversarial", "dual review", "juzgar" | Parallel adversarial review — two blind judge agents |
| `skill-creator` | Creating new skill, adding agent instructions | Create new AI agent skills following spec |
| `skill-registry` | "update skills", "skill registry", "update registry" | Create/update skill registry |
| `customize-opencode` | Editing opencode config, AGENTS.md, MCP servers | Customize opencode configuration |

## Most Relevant for This Project

Given the stack (NestJS + Angular + Playwright + Nx monorepo):

1. **sdd-*** — Full SDD workflow for every feature (all 34 stages)
2. **judgment-day** — Critical for code review on analyzers, AI orchestrator, and domain contracts
3. **qa-test-generator** — Relevant for testing the platform's own QA output
4. **task-intake** — If using Trello for sprint tracking during the 2-week MVP

## Notes

- `go-testing` skill is available globally but not applicable to this project (TypeScript/Nx stack)
- `customize-opencode` is for opencode config only, not project code
- SDD skills follow the full proposal → spec → design → tasks → apply → verify → archive cycle
