---
sidebar_position: 4
title: Reporte HTML
---

# Reporte HTML

El comando `report` genera un HTML autónomo desde `test-report.json`. Sin dependencias externas — funciona offline.

## Generar

```bash
qa-tester report \
  --backend ./api \
  [--output ./mi-reporte.html] \
  [--report-title "Jobs API QA"] \
  [--report-logo https://example.com/logo.png]
```

## Qué incluye el reporte

- **Barra de resumen** — total / passed / failed / skipped con barra de progreso
- **Resultados por test** — badge de estado, endpoint, tiempo de respuesta, detalles de error expandibles
- **Sección delta** — comparación con el run anterior (nuevos fallos, tests corregidos, nuevos skips)
- **Dark mode** — respeta `prefers-color-scheme`
- **Branding personalizado** — título y logo desde `--report-title` / `--report-logo`

## Historial de runs

Cada vez que ejecutás `qa-tester run` o `qa-tester pipeline`, el reporte actual se guarda en:

```
<backend>/.qa/history/test-report-<timestamp>.json
```

El próximo run lee el archivo más reciente y muestra el delta automáticamente.

## Upload como artefacto en CI

```yaml
- name: Upload QA report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: qa-report
    path: ruta/al/backend/.qa/test-report.html
```
