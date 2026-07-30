---
sidebar_position: 5
title: FAQ y Troubleshooting
---

# FAQ y Troubleshooting

## General

### ¿Funciona con proyectos que no usan Angular?

El flag `--frontend` es opcional. Si lo omitís, el tool saltea el scan y analyze y usa los archivos `.qa/tests/` existentes o genera tests desde un `route-map.json` pre-existente.

### ¿Funciona con backends que no son NestJS?

Parcialmente. El analizador NestJS usa ts-morph para encontrar controladores TypeScript. Para otros stacks, podés proveer un `route-map.json` manualmente o usar `--constants-file`.

---

## Tests fallidos

### Todos los tests devuelven 401

Tu API requiere autenticación. Agregá un token:

```bash
qa-tester pipeline \
  --backend ./api \
  --base-url http://localhost:3000 \
  --auth-env QA_AUTH_TOKEN
```

Ver la [guía de autenticación](guides/authentication).

### El backend no inicia dentro del timeout

Aumentá el timeout de inicio:

```bash
qa-tester pipeline ... --startup-timeout 300000
```

O iniciá el backend manualmente y usá `--skip-backend`.

---

## npm / Instalación

### `qa-tester: command not found`

```bash
npm install -g @npmoncada/ai-web-qa-tester
```

O usá npx sin instalación global:

```bash
npx @npmoncada/ai-web-qa-tester pipeline ...
```

### Advertencias de peer dependency

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```
