---
sidebar_position: 3
title: Quickstart
---

# Quickstart — 5 minutos

Esta guía ejecuta el pipeline completo de QA contra un backend NestJS. No se requiere proyecto Angular para este quickstart.

## Paso 1 — Instalá

```bash
npm install -g @npmoncada/ai-web-qa-tester
npx playwright install chromium
```

## Paso 2 — Pipeline completo con frontend Angular

```bash
qa-tester pipeline \
  --frontend ruta/al/proyecto-angular \
  --backend ruta/al/proyecto-nestjs \
  --base-url http://localhost:3000
```

Esto ejecuta los 6 pasos y produce un reporte en `.qa/test-report.html`.

## Paso 3 — Con enriquecimiento IA

Configurá tu API key y agregá `--enrich`:

```bash
export OPENAI_API_KEY=sk-...
qa-tester pipeline \
  --frontend ruta/al/proyecto-angular \
  --backend ruta/al/proyecto-nestjs \
  --base-url http://localhost:3000 \
  --enrich
```

La IA agrega payloads de request realistas y assertions de estructura de body basados en el código fuente de tus controladores.

## Paso 4 — Ver el reporte

Abrí `.qa/test-report.html` en tu navegador. El reporte muestra:
- Estado pass/fail por endpoint
- Tiempo de respuesta por test
- Delta respecto al run anterior
- Detalles de error en los fallos

---

## Qué pasó

```
[1/6] Scanning project...     done
[2/6] Analyzing source code... done
[3/6] Building route map...   done
[4/6] Generating test specs... done
[5/6] Running tests...        done
[6/6] Generating HTML report... done

────────────────────────────────────────────────
Pipeline complete
Tests: 42 passed  3 failed  5 skipped  (50 total)
Report: ruta/al/backend/.qa/test-report.html
```

---

## Próximos pasos

- [Guía de autenticación](guides/authentication) — agregá Bearer JWT a tus tests
- [CLI Reference](cli-reference) — todos los flags y opciones
- [Tutorial completo](guides/full-tutorial) — de punta a punta con un proyecto real
