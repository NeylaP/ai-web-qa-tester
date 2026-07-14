import { test, expect } from '@playwright/test';

test.describe('ProductsController', () => {
  test('GET /api/products - exact', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('products');
    expect(body).toHaveProperty('totalCount');
    expect(body).toHaveProperty('pageInfo');
  });

  test('POST /api/products - exact', async ({ request }) => {
    const response = await request.post('/api/products', { data: {"name":"Wireless Bluetooth Headphones","description":"Noise-cancelling over-ear headphones with long battery life.","price":89.99,"category":"Electronics","stock":150,"sku":"WH-1200-BT","brand":"SoundMax","attributes":{"color":"Black","weight":"250g","batteryLife":"20 hours"}} });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('createdAt');
    expect(body).toHaveProperty('updatedAt');
  });
});
