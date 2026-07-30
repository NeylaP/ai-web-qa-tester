---
sidebar_position: 1
title: Introducción
---

# ai-web-qa-tester

**Automatización de QA con IA para proyectos Angular + NestJS.**

Analizá tu código fuente, mapeá las llamadas HTTP de Angular a los endpoints de NestJS, generá specs de Playwright, ejecutalos contra un servidor real y producí un reporte HTML — todo desde un solo comando.

```bash
npx @npmoncada/ai-web-qa-tester pipeline \
  --backend ruta/al/backend \
  --base-url http://localhost:3000 \
  --frontend ruta/al/frontend \
  --enrich
```

---

## Qué hace

1. **Escanea** tu frontend Angular con ts-morph para encontrar todas las llamadas HTTP (incluyendo template literals e `inject()`)
2. **Mapea** esas llamadas a endpoints NestJS con puntuación de confianza
3. **Genera** archivos `.spec.ts` de Playwright por controlador
4. **Enriquece** (opcionalmente) cada test con cuerpos de request y assertions generados por IA
5. **Ejecuta** los tests contra el backend en vivo (lo inicia automáticamente si es necesario)
6. **Reporta** los resultados como un HTML autónomo con delta respecto al run anterior

---

## Características principales

| Característica | Descripción |
|---------------|-------------|
| Auto-discovery | Análisis estático con ts-morph — sin runtime requerido |
| Route mapping | Matching exacto y parcial con puntuación de confianza |
| Enriquecimiento IA | OpenAI o Anthropic para payloads realistas y assertions |
| Autenticación | Bearer JWT via flag, variable de entorno, o `.qa/auth.json` con auto-login |
| Reportes HTML | Dark mode, historial de runs, delta respecto al anterior, branding personalizado |
| CI-ready | Un comando, sale con código 1 si algún test falla |

---

## Próximos pasos

- [Instalación](installation) — instalá y ejecutá tu primer pipeline en 5 minutos
- [CLI Reference](cli-reference) — todos los comandos y flags
- [Tutorial completo](guides/full-tutorial) — guía de punta a punta con un proyecto real
