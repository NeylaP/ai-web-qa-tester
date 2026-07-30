---
sidebar_position: 3
title: AI Enrichment
---

# AI Enrichment

Without AI enrichment, tests only verify HTTP status codes (`expect(status).toBe(200)`). With `--enrich`, the tool sends each endpoint's metadata and controller source code to an LLM and generates:

- **`requestBody`** — realistic payload for POST/PUT/PATCH endpoints
- **`responseAssertions`** — up to 4 assertions about the response body structure
- **Error case tests** — e.g. missing required fields → 422
- **beforeAll/afterAll** — resource lifecycle setup and teardown

## Setup

Set your API key:

```bash
# OpenAI
export OPENAI_API_KEY=sk-...

# Or Anthropic
export ANTHROPIC_API_KEY=sk-ant-...
```

Provider auto-detection: `ANTHROPIC_API_KEY` is checked first, then `OPENAI_API_KEY`.

## Run with enrichment

```bash
qa-tester generate --backend ./api --enrich
# or full pipeline:
qa-tester pipeline --backend ./api --base-url http://localhost:3000 --enrich
```

## What gets generated

Given a `POST /api/jobs` endpoint with this controller:

```typescript
@Post()
async createJob(@Body() dto: CreateJobDto): Promise<Job> {
  return this.jobsService.create(dto);
}
```

Without enrichment:
```typescript
test('POST /api/jobs - exact', async ({ request }) => {
  const response = await request.post('/api/jobs', { data: {} });
  expect(response.status()).toBe(201);
});
```

With enrichment:
```typescript
test('POST /api/jobs - exact', async ({ request }) => {
  const response = await request.post('/api/jobs', {
    data: { title: 'Driver', description: 'CDL required', salary: 55000 },
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body).toHaveProperty('id');
  expect(typeof body.title).toBe('string');
  expect(body).toHaveProperty('createdAt');
});

test('POST /api/jobs with missing required fields returns 422', async ({ request }) => {
  const response = await request.post('/api/jobs', { data: {} });
  expect(response.status()).toBe(422);
  const body = await response.json();
  expect(body).toHaveProperty('message');
});
```

## Test isolation (beforeAll/afterAll)

For controllers that manage a resource lifecycle (POST creates, GET/PUT/DELETE operate on IDs), the AI generates a `beforeAll` that creates the resource and an `afterAll` that deletes it:

```typescript
test.describe('JobsController', () => {
  let _createdId: string | number;

  test.beforeAll(async ({ request }) => {
    const setupResponse = await request.post('/api/jobs', {
      data: { title: `Driver_${Date.now()}`, description: 'Test' },
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
  });
});
```

## Cost estimates

| Provider | Model | ~Cost per endpoint |
|----------|-------|-------------------|
| OpenAI | gpt-4o-mini | ~$0.0002 |
| Anthropic | claude-haiku-4-5 | ~$0.0003 |

A project with 100 endpoints costs roughly $0.02–$0.03 per run.

## Silent failures

If AI enrichment fails for any endpoint (rate limit, network error, invalid response), the test is generated without enrichment. The pipeline never fails due to AI errors alone.
