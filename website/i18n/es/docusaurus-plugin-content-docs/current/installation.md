---
sidebar_position: 2
title: Instalación
---

# Instalación

## Requisitos

- **Node.js** 20+
- **npm** 10+
- Un proyecto **NestJS** backend
- (Opcional) Un proyecto **Angular** frontend para el mapeo de rutas
- (Opcional) `OPENAI_API_KEY` o `ANTHROPIC_API_KEY` para el enriquecimiento con IA

---

## Instalación con npx (recomendado)

Sin instalación global. Ejecutá directamente:

```bash
npx @npmoncada/ai-web-qa-tester@latest pipeline \
  --backend ruta/al/backend \
  --base-url http://localhost:3000
```

---

## Instalación global

```bash
npm install -g @npmoncada/ai-web-qa-tester
qa-tester --version
```

---

## Instalación en un proyecto

```bash
npm install --save-dev @npmoncada/ai-web-qa-tester
```

En `package.json`:

```json
{
  "scripts": {
    "qa": "qa-tester pipeline --backend . --base-url http://localhost:3000"
  }
}
```

---

## Dependencias peer

Playwright es una dependencia peer. Instalala si no la tenés:

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

---

## Verificar instalación

```bash
qa-tester --version
# 0.2.0
```

---

## Siguiente: Quickstart

Ejecutá tu primer pipeline de QA en [5 minutos →](quickstart)
