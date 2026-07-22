# SESSION RESTORE — ai-web-qa-tester

> Este archivo es para Claude. Cuando el usuario diga "ejecutá .claude/RESTORE.md",
> seguí estos pasos en orden antes de responder cualquier otra cosa.

## Paso 1 — Leer el HANDOFF
Lee el archivo `HANDOFF.md` en la raíz del proyecto.
Ese archivo tiene: qué se hizo en la última sesión, el estado exacto, y los próximos pasos en orden.

## Paso 2 — Recuperar memoria de Engram
Ejecutá en orden:
1. `mem_context` — recupera el historial reciente de sesiones del proyecto
2. `mem_search` con query "P2.1 assertions error cases ai-enricher" — trae los detalles técnicos de lo último implementado
3. `mem_search` con query "npm publish cli roadmap" — trae contexto de P1.5 y el estado del CLI

## Paso 3 — Verificar estado del repo
Corré `git log --oneline -5` para ver los últimos commits y confirmar que el pull está al día.

## Paso 4 — Presentarte al usuario
Una vez que tenés todo el contexto, respondé con:

```
Contexto recuperado. Último commit: [commit message].

Estado actual del roadmap:
- ✅ P1.5 — npm publish (@npmoncada/ai-web-qa-tester@0.1.3)
- ✅ P2.1 — Error cases (400/422) + typed assertions
- 🔲 P2.1 parte 2 — pasar controllerSource al enricher
- 🔲 P3.4 — Semver + CHANGELOG
- 🔲 P1.4 — npm audit

¿Arrancamos con P2.1 parte 2 o preferís otro ítem?
```

## Contexto del proyecto (siempre válido)
- Stack: Nx monorepo, TypeScript, Vitest, Playwright
- Usuario tiene OpenAI key (gpt-4o-mini), NO Anthropic
- `npm install --legacy-peer-deps` SIEMPRE
- NO buildear después de cambios — el usuario lo hace manualmente
- Backend target real: Laravel (PHP), no NestJS
- CLI publicado como `@npmoncada/ai-web-qa-tester` en npm
