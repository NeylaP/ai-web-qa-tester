---
sidebar_position: 1
title: Tutorial completo
---

# Tutorial completo — Angular + NestJS

Este tutorial te guía por el flujo completo usando un proyecto Angular + NestJS real.

## Paso 1 — Instalá

```bash
npm install -g @npmoncada/ai-web-qa-tester
npx playwright install chromium
```

## Paso 2 — Escaneá el proyecto

```bash
qa-tester scan \
  --frontend ./mi-angular-app \
  --backend ./mi-nestjs-api
```

## Paso 3 — Analizá el código fuente

```bash
qa-tester analyze \
  --frontend ./mi-angular-app \
  --backend ./mi-nestjs-api
```

## Paso 4 — Construí el route map

```bash
qa-tester map --backend ./mi-nestjs-api
```

## Paso 5 — Generá los specs

```bash
export OPENAI_API_KEY=sk-...
qa-tester generate --backend ./mi-nestjs-api --enrich
```

## Paso 6 — Ejecutá los tests

```bash
qa-tester run \
  --backend ./mi-nestjs-api \
  --base-url http://localhost:3000 \
  --auth-env QA_AUTH_TOKEN
```

## Paso 7 — Mirá el reporte

```bash
qa-tester report --backend ./mi-nestjs-api
```

## Todo en un comando

```bash
export OPENAI_API_KEY=sk-...
qa-tester pipeline \
  --frontend ./mi-angular-app \
  --backend ./mi-nestjs-api \
  --base-url http://localhost:3000 \
  --auth-env QA_AUTH_TOKEN \
  --enrich
```
