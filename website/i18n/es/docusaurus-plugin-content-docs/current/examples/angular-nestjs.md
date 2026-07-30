---
sidebar_position: 1
title: Angular + NestJS
---

# Ejemplo — Angular + NestJS

Un ejemplo completo de ejecución de `ai-web-qa-tester` contra un stack estándar Angular + NestJS.

## Estructura del proyecto

```
mi-proyecto/
├── frontend/          ← App Angular
│   └── src/app/core/services/
│       └── jobs.service.ts
└── backend/           ← API NestJS
    └── src/jobs/
        ├── jobs.controller.ts
        └── jobs.service.ts
```

## Servicio Angular (jobs.service.ts)

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ROUTES_PRIVATE } from '../constants/routes';

@Injectable({ providedIn: 'root' })
export class JobsService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get(ROUTES_PRIVATE.JOBS);
  }

  getById(id: string) {
    return this.http.get(`${ROUTES_PRIVATE.JOBS}/${id}`);
  }
}
```

El tool resuelve `ROUTES_PRIVATE.JOBS` a través de la cadena de constantes automáticamente.

## Ejecutar el pipeline

```bash
qa-tester pipeline \
  --frontend ./frontend \
  --backend ./backend \
  --base-url http://localhost:3000 \
  --auth-token "eyJhbGc..." \
  --enrich
```

## Test generado (con enriquecimiento IA)

```typescript
test.describe('JobsController', () => {
  let _createdId: string | number;

  test.beforeAll(async ({ request }) => {
    const setupResponse = await request.post('/api/jobs', {
      data: { title: `Driver_${Date.now()}`, description: 'CDL requerido' },
    });
    const setupBody = await setupResponse.json();
    _createdId = setupBody.id;
  });

  test.afterAll(async ({ request }) => {
    if (_createdId !== undefined) {
      await request.delete(`/api/jobs/${_createdId}`);
    }
  });

  test('GET /api/jobs/:param - exact', async ({ request }) => {
    const response = await request.get(`/api/jobs/${_createdId}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(typeof body.title).toBe('string');
  });
});
```
