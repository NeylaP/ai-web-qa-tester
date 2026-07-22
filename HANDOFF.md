# HANDOFF — 2026-07-22
**De**: Claude (PC principal) → **A**: Claude (otro PC)
**Estado**: EN PROGRESO

## Tarea activa
Implementación del roadmap hacia producción de `ai-web-qa-tester` — P2.1 recién terminado.

## Hecho en esta sesión
- ✅ **P1.5** — `@npmoncada/ai-web-qa-tester@0.1.3` publicado en npm (instalable con `npm install -g @npmoncada/ai-web-qa-tester`)
- ✅ **P2.1** — AiEnricher ahora genera error cases (400/422) y assertions tipadas sobre el body

## Estado exacto al cerrar
- Commit pusheado: `feat(ai): P2.1 — error case tests and typed body assertions`
- 32/32 tests verdes en `ai-orchestrator` y `core-application`
- `controllerSource` ya está como parámetro opcional en el port y el adapter, pero **aún no se pasa desde el use-case** — ese es el próximo paso de P2.1

## Próximos pasos (en orden)

1. **P2.1 parte 2 — pasar `controllerSource` al enricher**
   - `RouteMapEntry` necesita exponer la ruta del archivo del controller (hoy solo tiene el nombre como string)
   - En `core-domain/src/lib/route-map.ts` agregar `controllerFile?: string` a `RouteMapEntry`
   - En el scanner NestJS (`scanner/`) poblar ese campo buscando el archivo `.controller.ts` que matchea el nombre
   - En `GenerateTestsUseCase`, leer el archivo con `fs.readFileSync` y pasarlo como segundo argumento a `aiEnricher.enrich(spec, controllerSource)`

2. **P3.4 — Semver + CHANGELOG**
   - `nx release` con conventional commits
   - Tagear `v1.0.0` como primera versión estable
   - Proteger `main` branch (solo merges via PR)

3. **P1.4 — npm audit**
   - Correr `npm audit --json` y clasificar: runtime vs devDependencies
   - Las vulns en devDeps no afectan al usuario final
   - Agregar `npm audit --audit-level=high --production` al CI

## Archivos relevantes
- `core-application/src/lib/ports/ai-enricher.port.ts` — contrato del enricher (AiEnrichment, ErrorCaseSpec)
- `ai-orchestrator/src/lib/ai-enricher.adapter.ts` — implementación con OpenAI, prompt mejorado
- `core-application/src/lib/use-cases/generate-tests.use-case.ts` — orquesta el flatten de error cases
- `core-domain/src/lib/route-map.ts` — PRÓXIMO: agregar `controllerFile?` a RouteMapEntry
- `docs/ROADMAP.md` — referencia completa de prioridades
- `cli/package.json` — paquete npm publicado como `@npmoncada/ai-web-qa-tester`

## Contexto / Advertencias
- `npm install --legacy-peer-deps` es OBLIGATORIO en este proyecto
- El usuario tiene OpenAI key, NO Anthropic — usar `gpt-4o-mini` como default
- NO buildear después de cambios — el usuario lo hace manualmente
- El backend target es Laravel (PHP), NO NestJS — el `TsMorphNestAnalyzer` no sirve para `ta-portal`
- Los error cases se pushean ANTES del happy path en el array entries — `entries[0]` = error case, `entries[1]` = happy path para POST/PUT/PATCH
- Release flow del CLI: `npx nx run cli:add-shebang` → `Push-Location dist/cli; npm publish --access public; Pop-Location`
