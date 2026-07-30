# Roadmap hacia producción — ai-web-qa-tester

Estado actual: **MVP completo — listo para primer cliente**  
Objetivo: **producto vendible a equipos Angular + NestJS**

---

## Resumen de estado (al 2026-07-29)

| Prioridad | Item | Estado |
|-----------|------|--------|
| P1.1 | Autenticación Bearer JWT + auto-login | ✅ implementado |
| P1.2 | Angular analyzer con proyecto real | ✅ verificado (51 HTTP calls en ta-jobs-frontend) |
| P1.3 | Fix DEP0190 (shell: false) | ✅ implementado |
| P1.4 | Vulnerabilidades npm | ✅ 0 vulnerabilidades en producción |
| P1.5 | npm publish como paquete instalable | ✅ v0.2.0 publicado en npm |
| P2.1 | Assertions con AI + source del controller | ✅ implementado |
| P2.2 | beforeAll/afterAll para aislamiento de tests | ✅ implementado |
| P2.3 | Mensajes de error comprensibles + --verbose | ✅ implementado |
| P2.4 | HTML report con historial, delta y dark mode | ✅ implementado |
| P2.5 | Timeouts configurables | ✅ implementado |
| P3.2 | Sitio de documentación (Docusaurus) | ❌ pendiente |
| P3.3 | Video demo | ❌ pendiente |
| P3.4 | Semver + CHANGELOG automático | ✅ nx release configurado |
| P3.5 | Telemetría opt-in | ❌ pendiente |

---

## Cómo leer este documento

Cada ítem tiene:
- **Qué falta** — descripción del gap
- **Cómo implementarlo** — enfoque técnico concreto
- **Estimado** — días de trabajo de un dev senior

Las prioridades están ordenadas: sin P1 no hay producto. Sin P2 no hay calidad. Sin P3 no hay ventas.

---

## Prioridad 1 — Bloqueantes críticos

### 1.1 Autenticación
**El bloqueo más gordo.** Cualquier API real requiere auth. Sin esto, el 100% de los tests devuelven 401.

**Qué falta:**
- Soporte para Bearer token (JWT), API key header, y cookie de sesión
- Configuración de auth por proyecto (no hardcodeada)

**Cómo implementarlo:**
1. Agregar flag `--auth-header "Authorization: Bearer <token>"` al CLI (pipeline, run, generate)
2. Agregar soporte para `.qa/auth.json` en el backend path:
   ```json
   {
     "type": "bearer",
     "token": "eyJhbGc...",
     "headers": { "x-api-key": "optional-extra-header" }
   }
   ```
3. Modificar `PlaywrightSpecWriter` para inyectar los headers en `playwright.run.config.ts` vía `extraHTTPHeaders`
4. Modificar el `renderFile()` del spec writer para que cada request incluya los headers configurados
5. Agregar `--auth-env` para leer el token de una variable de entorno (no exponerlo en el comando)
6. Documentar en README cómo obtener el token antes de correr el pipeline (script de login previo)

**Estimado: 3-4 días**

---

### 1.2 Angular analyzer — validación con proyecto real
**Nunca fue probado fuera del lab.** El ts-morph analyzer asume patrones que pueden no existir en proyectos enterprise.

**Qué falta:**
- Soporte para `inject()` (Angular 14+ function-based injection)
- Soporte para HTTP calls dentro de NgRx Effects / NGXS Actions
- Resolución de URLs desde `environment.ts` en lugar de strings literales
- Soporte para standalone components
- Detección de HttpClient a través de interceptors

**Cómo implementarlo:**
1. Correr el analyzer contra un proyecto Angular real (idealmente `ta-jobs`) y capturar qué no detecta
2. Fix `inject()`: en `ts-morph-angular-analyzer.ts`, buscar también `inject(HttpClient)` como CallExpression en constructores y en el body de la clase
3. Fix NgRx Effects: buscar archivos `*.effects.ts`, detectar `Actions` + `ofType()` con `switchMap`/`mergeMap` que contengan `HttpClient` calls
4. Fix environment URLs: cuando una URL es una referencia a variable (no un string literal), seguir la referencia hasta `environment.ts` y resolver el valor
5. Agregar tests de integración con fixtures de Angular real para cada patrón

**Estimado: 5-7 días** (los unknowns del proyecto real pueden extender esto)

---

### 1.3 Fix DEP0190 — security warning en cada corrida
**Impresión pésima.** Un tech lead que vea este warning rechaza el tool en el primer demo.

**Qué falta:**
- Eliminar `shell: true` del `spawn` en `PlaywrightTestRunner`

**Cómo implementarlo:**
1. En `playwright-test-runner.ts`, detectar la ruta de `npx` en el sistema:
   ```typescript
   import { execSync } from 'node:child_process';
   const npxPath = execSync(
     process.platform === 'win32' ? 'where npx' : 'which npx',
     { encoding: 'utf8' }
   ).trim().split('\n')[0];
   ```
2. Cambiar `spawn('npx', [...args], { shell: true })` por `spawn(npxPath, [...args], { shell: false })`
3. Fallback: si `which npx` falla, usar `process.execPath` (el mismo Node) con `npx` como módulo
4. Probar en Windows, macOS y Linux (el path de npx varía)

**Estimado: 1-2 días**

---

### 1.4 Vulnerabilidades de npm — 37 reportadas
**Bloqueante en empresas con due diligence.** `npm audit` antes de instalar cualquier tool.

**Qué falta:**
- Auditar cuáles son reales (runtime) vs. fantasmas (devDependencies)
- Actualizar o reemplazar los paquetes afectados

**Cómo implementarlo:**
1. Correr `npm audit --json > audit.json` y clasificar por `devDependencies` vs. `dependencies`
2. Las vulnerabilidades en devDeps no afectan al usuario final — documentarlo
3. Para runtime deps: actualizar versiones con `npm update` y verificar que no rompe nada
4. Si algún paquete no tiene fix: evaluar si se puede reemplazar o si el riesgo es aceptable
5. Agregar `npm audit --audit-level=high --production` al CI para fallar si hay vulnerabilidades en runtime

**Estimado: 2-3 días**

---

### 1.5 Publicación en npm — distribución como paquete instalable
**Hoy requiere clonar el monorepo completo.** Ningún equipo adopta eso.

**Qué falta:**
- Configurar el CLI para publicarse como paquete npm standalone
- Proceso de release con semver

**Cómo implementarlo:**
1. En `cli/project.json`, agregar target `publish` con `nx:release-publish`
2. Configurar `package.json` del CLI con:
   ```json
   {
     "name": "ai-web-qa-tester",
     "version": "1.0.0",
     "bin": { "qa-tester": "./main.js" },
     "main": "./main.js",
     "files": ["main.js"]
   }
   ```
3. Asegurar que el bundle generado por esbuild sea autocontenido (todas las deps bundleadas o listadas como peerDeps)
4. Agregar `.npmignore` para excluir fuentes, tests, etc.
5. Configurar `nx release` para semver automático desde conventional commits
6. Agregar step de publish en GitHub Actions (triggered on `release/**` branch o tag)
7. Probar instalación global: `npm install -g ai-web-qa-tester && qa-tester --version`

**Estimado: 2-3 días**

---

**Subtotal Prioridad 1: 13-19 días (~3-4 semanas)**

---

## Prioridad 2 — Calidad del producto

### 2.1 Tests que solo verifican status codes — valor muy bajo
**Diferencial insuficiente.** Postman hace esto gratis. El valor real es en las assertions sobre el body.

**Qué falta:**
- El AI enrichment necesita VER el código del controller para generar assertions correctas
- Tests de error cases (404, 400, 422) además del happy path

**Cómo implementarlo:**
1. Modificar `AiEnricher` para recibir el source code del controller como contexto adicional
2. En `GenerateTestsUseCase`, leer el archivo del controller y pasarlo al enricher
3. Mejorar el prompt de la IA para generar:
   - Assertions de estructura del body (`expect(body).toHaveProperty('id')`)
   - Assertions de tipos (`expect(typeof body.name).toBe('string')`)
   - Tests de error: POST con body inválido esperando 400/422
4. Agregar un paso de validación: correr el test generado contra el servidor, si falla revisar la assertion
5. Generar `beforeAll`/`afterAll` para tests que necesiten datos previos (GET by ID necesita un POST primero)

**Estimado: 5-7 días**

---

### 2.2 Aislamiento de tests — state compartido entre corridas
**Los tests no son confiables en múltiples corridas.** POST crea datos que el GET del día siguiente ve.

**Qué falta:**
- Seed/teardown de datos por suite de tests
- Tests deterministas que no dependan del estado previo

**Cómo implementarlo:**
1. Agregar `beforeAll` en specs generados para endpoints GET: primero crear el recurso vía POST, guardar el ID
2. Agregar `afterAll` para limpiar: DELETE del recurso creado en `beforeAll`
3. Para tests de POST: usar datos únicos (timestamp en el nombre) para evitar conflictos
4. Agregar opción `--clean-state` que llame a endpoints de reset si el backend los expone
5. Documentar en README qué patrones de aislamiento se generan

**Estimado: 3-4 días**

---

### 2.3 Mensajes de error comprensibles
**Hoy: stack traces. Lo que necesitás: mensajes accionables.**

**Qué falta:**
- Categorización de errores comunes con mensajes claros
- Flag `--verbose` para el stack trace completo

**Cómo implementarlo:**
1. Crear un `ErrorFormatter` en `core-application` que mapee excepciones conocidas a mensajes claros:
   - `ECONNREFUSED` → "El servidor no está corriendo en {url}. Verificá que el puerto esté disponible."
   - `ENOENT` → "No se encontró el directorio {path}. Verificá la ruta con --backend."
   - Timeout → "El servidor no respondió en {n}s. Aumentá el timeout con --startup-timeout."
   - TypeScript compile error → "Error de compilación en el backend. Corré 'npx nest build' manualmente para ver el detalle."
2. Agregar `--verbose` al CLI: si está activo, incluir el stack trace completo además del mensaje amigable
3. Agregar exit codes específicos por tipo de error (1=tests fallaron, 2=backend no levantó, 3=config inválida)

**Estimado: 2-3 días**

---

### 2.4 HTML report — necesita polish para presentar a clientes
**El reporte actual es funcional pero no impresiona.**

**Qué falta:**
- Comparación con el run anterior (regresiones)
- Tendencia histórica
- Opción de logo/branding del cliente
- Mejor diseño visual

**Cómo implementarlo:**
1. Guardar historial de runs en `.qa/history/` (JSON por fecha)
2. En `HtmlReportGenerator`, leer el run anterior y mostrar delta (tests nuevos, tests que regresaron)
3. Agregar mini-gráfico de tendencia con SVG inline (sin CDN)
4. Agregar opción `--report-title` y `--report-logo` para customización
5. Mejorar el CSS: mejor tipografía, colores más profesionales, dark mode toggle

**Estimado: 3-4 días**

---

### 2.5 Timeouts configurables
**Hoy: 120s hardcodeados para startup. Sin configuración de timeout de tests.**

**Cómo implementarlo:**
1. Agregar `--startup-timeout <ms>` al CLI (pipeline y run commands)
2. Agregar `--test-timeout <ms>` que se pase al config de Playwright
3. Documentar valores recomendados por tipo de proyecto

**Estimado: 0.5 días**

---

**Subtotal Prioridad 2: 13.5-18.5 días (~3 semanas)**

---

## Prioridad 3 — Producto y mercado

### 3.1 Modelo de negocio
**Decisión estratégica, no técnica.** Tres opciones:

| Modelo | Pros | Contras |
|--------|------|---------|
| Open source + soporte pago | Adopción rápida, comunidad | Ingresos lentos |
| SaaS (dashboard + API) | Ingresos recurrentes, telemetría | Requiere infra, mucho más desarrollo |
| Licencia anual enterprise | Ingresos grandes por cliente | Ciclo de ventas largo |

**Recomendación para empezar:** Open source con una versión Pro (autenticación avanzada, reporte con branding, soporte prioritario).

**Estimado: No aplica técnicamente — decisión de negocio**

---

### 3.2 Sitio de documentación
**Un README no es suficiente para vender.**

**Qué falta:**
- Quickstart (5 minutos de instalación a primer test)
- Tutorial completo con un proyecto de ejemplo
- Referencia del CLI (todos los comandos y flags)
- Sección de troubleshooting
- Ejemplos por framework/stack

**Cómo implementarlo:**
1. Usar Docusaurus (React, open source, fácil de hostear en GitHub Pages)
2. Estructura: Getting Started / Guides / CLI Reference / Examples / FAQ
3. Agregar playground online (opcional — mucho esfuerzo)
4. Configurar dominio propio (docs.ai-web-qa-tester.dev o similar)
5. CI para deploy automático en cada push a main

**Estimado: 5-7 días**

---

### 3.3 Video demo
**El 80% de las decisiones de compra de herramientas de dev empiezan con un video.**

**Qué necesitás:**
- Video de 2-3 minutos mostrando el flujo completo en un proyecto real
- Instalación → scan → generate → run → HTML report
- Con un proyecto Angular+NestJS que el espectador reconozca como real

**Cómo hacerlo:**
1. Preparar un proyecto de demo limpio y con datos realistas
2. Grabar en resolución 1080p con audio claro
3. Subtítulos en inglés y español
4. Publicar en YouTube + embed en README y docs

**Estimado: 2-3 días**

---

### 3.4 Semver y changelog
**Hoy todo va a master sin versiones. Un breaking change silencioso rompe a todos los usuarios.**

**Cómo implementarlo:**
1. Configurar `nx release` con conventional commits para versioning automático
2. Generar `CHANGELOG.md` en cada release
3. Tagear `v1.0.0` como primera versión estable
4. Proteger `main` branch — solo merges vía PR

**Estimado: 1 día**

---

### 3.5 Telemetría (opt-in)
**Sin datos no podés priorizar. Sin privacidad no te adoptan.**

**Cómo implementarlo:**
1. Integrar PostHog (open source, self-hosteable)
2. Trackear solo: comando usado, framework detectado, éxito/falla, duración — nunca código ni paths
3. Opt-in explícito: primer run pregunta si el usuario acepta; guardar preferencia en `~/.qa-tester/config.json`
4. Flag `--no-telemetry` para deshabilitar permanentemente
5. Documentar exactamente qué se trackea

**Estimado: 3-4 días**

---

**Subtotal Prioridad 3: 11-15 días (~2-3 semanas)**

---

## Estimado total de tiempo

| Prioridad | Descripción | Días estimados |
|-----------|-------------|----------------|
| P1 — Bloqueantes | Auth, Angular real, DEP0190, vulnerabilidades, npm publish | 13-19 días |
| P2 — Calidad | Assertions, aislamiento, errors, report, timeouts | 13.5-18.5 días |
| P3 — Producto | Docs, video, semver, telemetría | 11-15 días |
| **Total** | | **37.5-52.5 días** |

### En semanas de trabajo real (considerando reuniones, imprevistos, review)

```
Con 1 developer a tiempo completo:
  Optimista:  8 semanas  (~2 meses)
  Realista:  12 semanas  (~3 meses)
  Pesimista: 16 semanas  (~4 meses)

Con 2 developers (P1 y P2 en paralelo):
  Optimista:  5 semanas
  Realista:   8 semanas
  Pesimista: 11 semanas
```

### Hito mínimo para el primer cliente de pago

**✅ ALCANZADO** — todos los requisitos técnicos para el primer cliente están implementados:

- ✅ P1.1 Autenticación Bearer JWT + auto-login via `.qa/auth.json`
- ✅ P1.2 Angular analyzer validado con proyecto real (51 HTTP calls detectadas)
- ✅ P1.5 npm publish — `npx @npmoncada/ai-web-qa-tester@latest pipeline ...`
- ✅ P2.1 Assertions con AI + source del controller
- ✅ P3.4 Semver + CHANGELOG automático con nx release

**Lo que queda (P3.2/P3.3/P3.5) acelera la adopción pero no bloquea el primer cliente.**

---

*Última actualización: 2026-07-19*
