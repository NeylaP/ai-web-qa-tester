---
sidebar_position: 5
title: CI / GitHub Actions
---

# CI / GitHub Actions

## Workflow mínimo

```yaml title=".github/workflows/qa.yml"
name: QA Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Instalar qa-tester
        run: npm install -g @npmoncada/ai-web-qa-tester

      - name: Instalar Playwright
        run: npx playwright install chromium --with-deps

      - name: Instalar dependencias del backend
        run: npm ci
        working-directory: ruta/al/backend

      - name: Ejecutar pipeline de QA
        run: |
          qa-tester pipeline \
            --backend ruta/al/backend \
            --base-url http://localhost:3000 \
            --start-command "npx nest start"

      - name: Subir reporte
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: qa-report
          path: ruta/al/backend/.qa/test-report.html
```

## Con autenticación

```yaml
      - name: Ejecutar pipeline de QA
        run: |
          qa-tester pipeline \
            --backend ruta/al/backend \
            --base-url http://localhost:3000 \
            --auth-env QA_AUTH_TOKEN \
            --start-command "npx nest start"
        env:
          QA_AUTH_TOKEN: ${{ secrets.QA_AUTH_TOKEN }}
```

Agregá `QA_AUTH_TOKEN` a los secrets de tu repositorio: **Settings → Secrets and variables → Actions → New repository secret**.

## Códigos de salida

El comando `pipeline` sale con:
- `0` — todos los tests pasaron
- `1` — uno o más tests fallaron (GitHub marca el job como fallido)

Esto bloquea automáticamente los merges de pull requests si los tests fallan.
