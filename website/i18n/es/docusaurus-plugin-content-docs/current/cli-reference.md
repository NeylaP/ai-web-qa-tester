---
sidebar_position: 4
title: CLI Reference
---

# CLI Reference

Todos los comandos están disponibles via `qa-tester` (instalación global) o `npx @npmoncada/ai-web-qa-tester`.

## Flags globales

| Flag | Descripción |
|------|-------------|
| `--verbose` | Muestra el stack trace completo en errores |
| `--version` | Imprime la versión instalada |
| `--help` | Muestra ayuda para un comando |

---

## `pipeline`

Ejecuta el ciclo completo de QA: scan → analyze → map → generate → run → report.

```bash
qa-tester pipeline \
  --backend <ruta> \
  --base-url <url> \
  [opciones]
```

### Requeridos

| Flag | Descripción |
|------|-------------|
| `--backend <ruta>` | Ruta al proyecto NestJS backend |
| `--base-url <url>` | URL base donde escucha el servidor (ej. `http://localhost:3000`) |

### Opcionales

| Flag | Default | Descripción |
|------|---------|-------------|
| `--frontend <ruta>` | — | Ruta al frontend Angular (habilita scan + analyze) |
| `--enrich` | off | Enriquecer tests con IA (requiere `OPENAI_API_KEY` o `ANTHROPIC_API_KEY`) |
| `--start-command <cmd>` | `npx nest build && node dist/main.js` | Comando para iniciar el backend |
| `--skip-backend` | off | Saltear el inicio del backend (usalo cuando ya está corriendo) |
| `--auth-token <token>` | — | Bearer token para el header `Authorization` |
| `--auth-env <var>` | — | Leer el Bearer token de una variable de entorno |
| `--origin-header <url>` | — | Valor enviado como header `origin_dev` (backends multi-tenant) |
| `--clean-state <url>` | — | POST a esta URL para resetear el estado del backend antes de los tests |
| `--startup-timeout <ms>` | `120000` | Milisegundos para esperar que el backend inicie |
| `--test-timeout <ms>` | `30000` | Milisegundos por test |
| `--report-title <título>` | — | Título personalizado en el header del reporte HTML |
| `--report-logo <url>` | — | URL de una imagen de logo para el reporte HTML |

### Códigos de salida

| Código | Significado |
|--------|-------------|
| `0` | Todos los tests pasaron |
| `1` | Uno o más tests fallaron |
| `2` | El backend no inició dentro del `--startup-timeout` |
| `3` | Error de configuración |

---

Para la referencia completa de cada comando individual, ver la versión en inglés de esta misma página.
