---
sidebar_position: 1
title: Angular + NestJS
---

# Example — Angular + NestJS

A complete working example of running `ai-web-qa-tester` against a standard Angular + NestJS stack.

## Project structure

```
my-project/
├── frontend/          ← Angular app
│   └── src/app/core/services/
│       └── jobs.service.ts
└── backend/           ← NestJS API
    └── src/jobs/
        ├── jobs.controller.ts
        └── jobs.service.ts
```

## Angular service (jobs.service.ts)

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

  create(payload: unknown) {
    return this.http.post(ROUTES_PRIVATE.JOBS, payload);
  }

  update(id: string, payload: unknown) {
    return this.http.put(`${ROUTES_PRIVATE.JOBS}/${id}`, payload);
  }

  delete(id: string) {
    return this.http.delete(`${ROUTES_PRIVATE.JOBS}/${id}`);
  }
}
```

The tool resolves `ROUTES_PRIVATE.JOBS` through the constants chain automatically.

## NestJS controller (jobs.controller.ts)

```typescript
@Controller('api/jobs')
export class JobsController {
  @Get()
  findAll() { ... }

  @Get(':id')
  findOne(@Param('id') id: string) { ... }

  @Post()
  create(@Body() dto: CreateJobDto) { ... }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) { ... }

  @Delete(':id')
  remove(@Param('id') id: string) { ... }
}
```

## Running the pipeline

```bash
qa-tester pipeline \
  --frontend ./frontend \
  --backend ./backend \
  --base-url http://localhost:3000 \
  --auth-token "eyJhbGc..." \
  --enrich
```

## Generated route map (excerpt)

```json
[
  {
    "angularService": "JobsService",
    "httpCall": { "method": "GET", "urlPattern": "https://api.example.com/api/private/jobs" },
    "matchedEndpoint": { "controller": "JobsController", "endpoint": { "method": "GET", "path": "/api/jobs" } },
    "confidence": "exact"
  },
  {
    "angularService": "JobsService",
    "httpCall": { "method": "GET", "urlPattern": "https://api.example.com/api/private/jobs/:param" },
    "matchedEndpoint": { "controller": "JobsController", "endpoint": { "method": "GET", "path": "/api/jobs/:id" } },
    "confidence": "exact"
  }
]
```

## Generated test (with AI enrichment)

```typescript
// backend/.qa/tests/JobsController.spec.ts
import { test, expect } from '@playwright/test';

test.describe('JobsController', () => {
  let _createdId: string | number;

  test.beforeAll(async ({ request }) => {
    const setupResponse = await request.post('/api/jobs', {
      data: { title: `Software Engineer_${Date.now()}`, description: 'Full-stack position' },
    });
    const setupBody = await setupResponse.json();
    _createdId = setupBody.id;
  });

  test.afterAll(async ({ request }) => {
    if (_createdId !== undefined) {
      await request.delete(`/api/jobs/${_createdId}`);
    }
  });

  test('GET /api/jobs - exact', async ({ request }) => {
    const response = await request.get('/api/jobs');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
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
