---
sidebar_position: 3
title: Enriquecimiento IA
---

# Enriquecimiento con IA

Sin enriquecimiento, los tests solo verifican status codes HTTP. Con `--enrich`, el tool envía los metadatos de cada endpoint y el código fuente del controlador a un LLM y genera:

- **`requestBody`** — payload realista para endpoints POST/PUT/PATCH
- **`responseAssertions`** — hasta 4 assertions sobre la estructura del body de respuesta
- **Tests de casos de error** — ej. campos requeridos faltantes → 422
- **beforeAll/afterAll** — setup y teardown del ciclo de vida del recurso

## Setup

Configurá tu API key:

```bash
# OpenAI
export OPENAI_API_KEY=sk-...

# O Anthropic
export ANTHROPIC_API_KEY=sk-ant-...
```

Detección automática del provider: se verifica `ANTHROPIC_API_KEY` primero, luego `OPENAI_API_KEY`.

## Ejecutar con enriquecimiento

```bash
qa-tester generate --backend ./api --enrich
# o pipeline completo:
qa-tester pipeline --backend ./api --base-url http://localhost:3000 --enrich
```

## Estimación de costos

| Provider | Modelo | ~Costo por endpoint |
|----------|--------|---------------------|
| OpenAI | gpt-4o-mini | ~$0.0002 |
| Anthropic | claude-haiku-4-5 | ~$0.0003 |

Un proyecto con 100 endpoints cuesta aproximadamente $0.02–$0.03 por run.

## Fallos silenciosos

Si el enriquecimiento falla para cualquier endpoint (rate limit, error de red, respuesta inválida), el test se genera sin enriquecimiento. El pipeline nunca falla solo por errores de IA.
