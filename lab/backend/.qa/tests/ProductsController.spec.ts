import { test, expect } from '@playwright/test';

test.describe('ProductsController', () => {
  test('GET /api/products - exact', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.status()).toBe(200);
  });

  test('POST /api/products - exact', async ({ request }) => {
    const response = await request.post('/api/products', { data: {} });
    expect(response.status()).toBe(201);
  });
});
