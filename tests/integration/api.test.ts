/**
 * Integration tests: hit the running Express server over HTTP.
 * Server must already be running on port 5000 (the Start application workflow).
 */
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = `http://localhost:${process.env.PORT ?? 5000}`;

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// Wait for server readiness before tests run
beforeAll(async () => {
  let attempts = 10;
  while (attempts-- > 0) {
    try {
      const res = await fetch(`${BASE}/api/groups`);
      if (res.ok || res.status === 401) break;
    } catch { /* not ready */ }
    await new Promise(r => setTimeout(r, 1000));
  }
});

// ─── groups ──────────────────────────────────────────────────────────────────

describe('GET /api/groups', () => {
  it('returns 200 and an array', async () => {
    const { status, body } = await get('/api/groups');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

// ─── collections ─────────────────────────────────────────────────────────────

describe('GET /api/collections', () => {
  it('returns 200 and an array', async () => {
    const { status, body } = await get('/api/collections');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

// ─── products ────────────────────────────────────────────────────────────────

describe('GET /api/products', () => {
  it('returns 200 and an array', async () => {
    const { status, body } = await get('/api/products');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it('each product has the required display fields', async () => {
    const { body } = await get('/api/products');
    if ((body as any[]).length === 0) return; // no products seeded yet
    const first = (body as any[])[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('displayPrice');
    // displayPrice may be returned as a number or numeric string from the server
    expect(['number', 'string']).toContain(typeof first.displayPrice);
    if (typeof first.displayPrice === 'number') {
      expect(isNaN(first.displayPrice)).toBe(false);
    } else {
      expect(isNaN(parseFloat(first.displayPrice))).toBe(false);
    }
  });

  it('can filter by collectionId query param without error', async () => {
    const { status } = await get('/api/products?collectionId=nonexistent-col');
    expect(status).toBe(200);
  });
});

// ─── auth boundary ────────────────────────────────────────────────────────────

describe('Auth-protected routes (no session)', () => {
  it('GET /api/cart returns 401 when not logged in', async () => {
    const { status } = await get('/api/cart');
    expect(status).toBe(401);
  });

  it('GET /api/orders returns 401 when not logged in', async () => {
    const { status } = await get('/api/orders');
    expect(status).toBe(401);
  });

  it('GET /api/admin/orders returns 401 when not logged in', async () => {
    const { status } = await get('/api/admin/orders');
    expect(status).toBe(401);
  });
});

// ─── promotions (public) ─────────────────────────────────────────────────────

describe('GET /api/promotions/active', () => {
  it('returns 200 and an array', async () => {
    const { status, body } = await get('/api/promotions/active');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

// ─── coupon validation ────────────────────────────────────────────────────────

describe('POST /api/coupons/validate', () => {
  it('returns 400 or 404 for an unknown coupon code', async () => {
    const { status } = await post('/api/coupons/validate', {
      code: 'INVALID_COUPON_XYZ_9999',
      subtotal: 100,
    });
    expect([400, 404]).toContain(status);
  });

  it('returns 400 or 422 when code field is missing', async () => {
    const { status } = await post('/api/coupons/validate', { subtotal: 100 });
    expect([400, 422]).toContain(status);
  });
});

// ─── kits (bundles) ──────────────────────────────────────────────────────────

describe('GET /api/kits', () => {
  it('returns 200 and an array', async () => {
    const { status, body } = await get('/api/kits');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});
