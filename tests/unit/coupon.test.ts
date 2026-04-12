import { describe, it, expect } from 'vitest';
import { calcCouponDiscount, type CouponData, type CartItemInput } from '@shared/pricing';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeCoupon(overrides: Partial<CouponData> = {}): CouponData {
  return {
    id: 'cpn-1',
    code: 'DESCONTO10',
    isActive: true,
    discountType: 'percentage',
    discountValue: '10',
    appliesTo: 'all',
    productIds: null,
    collectionIds: null,
    minOrderAmount: null,
    maxUsageCount: null,
    currentUsageCount: 0,
    startDate: null,
    expiresAt: null,
    ...overrides,
  };
}

function makeItem(overrides: Partial<CartItemInput> = {}): CartItemInput {
  return {
    productId: 'prod-1',
    collectionId: 'col-1',
    price: '100.00',
    quantity: 1,
    ...overrides,
  };
}

const FIXED_NOW = new Date('2025-06-15T12:00:00Z');

// ─── basic validity ───────────────────────────────────────────────────────────

describe('calcCouponDiscount — basic validity', () => {
  it('returns valid=false for an inactive coupon', () => {
    const coupon = makeCoupon({ isActive: false });
    const result = calcCouponDiscount(coupon, [makeItem()], 100, FIXED_NOW);
    expect(result.valid).toBe(false);
    expect(result.discountAmount).toBe(0);
    expect(result.reason).toMatch(/inativo/i);
  });

  it('returns valid=false when coupon has not started yet', () => {
    const coupon = makeCoupon({ startDate: new Date('2025-12-01') });
    const result = calcCouponDiscount(coupon, [makeItem()], 100, FIXED_NOW);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/disponível/i);
  });

  it('returns valid=false for an expired coupon', () => {
    const coupon = makeCoupon({ expiresAt: new Date('2024-01-01') });
    const result = calcCouponDiscount(coupon, [makeItem()], 100, FIXED_NOW);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/expirado/i);
  });

  it('returns valid=false when usage limit has been reached', () => {
    const coupon = makeCoupon({ maxUsageCount: 5, currentUsageCount: 5 });
    const result = calcCouponDiscount(coupon, [makeItem()], 100, FIXED_NOW);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/limite/i);
  });

  it('is valid when currentUsageCount < maxUsageCount', () => {
    const coupon = makeCoupon({ maxUsageCount: 10, currentUsageCount: 9 });
    const result = calcCouponDiscount(coupon, [makeItem()], 100, FIXED_NOW);
    expect(result.valid).toBe(true);
  });

  it('returns valid=false when minimum order amount is not met', () => {
    const coupon = makeCoupon({ minOrderAmount: '200.00' });
    const result = calcCouponDiscount(coupon, [makeItem()], 150, FIXED_NOW);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/mínimo/i);
  });

  it('is valid when subtotal exactly meets minimum order amount', () => {
    const coupon = makeCoupon({ minOrderAmount: '100.00' });
    const result = calcCouponDiscount(coupon, [makeItem()], 100, FIXED_NOW);
    expect(result.valid).toBe(true);
  });

  it('accepts a coupon that is within its valid date window', () => {
    const coupon = makeCoupon({
      startDate: new Date('2025-01-01'),
      expiresAt: new Date('2025-12-31'),
    });
    const result = calcCouponDiscount(coupon, [makeItem()], 100, FIXED_NOW);
    expect(result.valid).toBe(true);
  });
});

// ─── discount calculation ─────────────────────────────────────────────────────

describe('calcCouponDiscount — discount amounts', () => {
  it('applies a percentage discount to the full subtotal', () => {
    const coupon = makeCoupon({ discountType: 'percentage', discountValue: '15', appliesTo: 'all' });
    const result = calcCouponDiscount(coupon, [makeItem({ price: '200.00', quantity: 1 })], 200, FIXED_NOW);
    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(30.00);
  });

  it('applies a fixed discount to the full subtotal', () => {
    const coupon = makeCoupon({ discountType: 'fixed', discountValue: '25.00', appliesTo: 'all' });
    const result = calcCouponDiscount(coupon, [makeItem({ price: '100.00', quantity: 1 })], 100, FIXED_NOW);
    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(25.00);
  });

  it('clamps fixed discount to eligible subtotal (cannot exceed it)', () => {
    const coupon = makeCoupon({ discountType: 'fixed', discountValue: '500.00', appliesTo: 'all' });
    const result = calcCouponDiscount(coupon, [makeItem({ price: '80.00', quantity: 1 })], 80, FIXED_NOW);
    expect(result.discountAmount).toBe(80.00);
  });

  it('rounds discount amount to 2 decimal places', () => {
    const coupon = makeCoupon({ discountType: 'percentage', discountValue: '33.333', appliesTo: 'all' });
    const result = calcCouponDiscount(coupon, [makeItem({ price: '100.00', quantity: 1 })], 100, FIXED_NOW);
    expect(Number.isFinite(result.discountAmount)).toBe(true);
    const str = result.discountAmount.toString();
    const decimals = str.includes('.') ? str.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

// ─── scope: products ─────────────────────────────────────────────────────────

describe('calcCouponDiscount — appliesTo: products', () => {
  const coupon = makeCoupon({
    discountType: 'percentage',
    discountValue: '10',
    appliesTo: 'products',
    productIds: ['prod-A', 'prod-B'],
  });

  it('only discounts eligible products', () => {
    const items: CartItemInput[] = [
      makeItem({ productId: 'prod-A', price: '100.00', quantity: 1 }),
      makeItem({ productId: 'prod-C', price: '200.00', quantity: 1 }),
    ];
    const result = calcCouponDiscount(coupon, items, 300, FIXED_NOW);
    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(10.00); // only 100 × 10%
  });

  it('discounts zero when no items match the eligible product list', () => {
    const items: CartItemInput[] = [
      makeItem({ productId: 'prod-Z', price: '150.00', quantity: 1 }),
    ];
    const result = calcCouponDiscount(coupon, items, 150, FIXED_NOW);
    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(0);
  });

  it('discounts all items when all match', () => {
    const items: CartItemInput[] = [
      makeItem({ productId: 'prod-A', price: '50.00', quantity: 2 }),
      makeItem({ productId: 'prod-B', price: '30.00', quantity: 1 }),
    ];
    const result = calcCouponDiscount(coupon, items, 130, FIXED_NOW);
    expect(result.discountAmount).toBe(13.00); // 130 × 10%
  });
});

// ─── scope: collections ───────────────────────────────────────────────────────

describe('calcCouponDiscount — appliesTo: collections', () => {
  const coupon = makeCoupon({
    discountType: 'fixed',
    discountValue: '20.00',
    appliesTo: 'collections',
    collectionIds: ['col-whisky'],
  });

  it('only discounts items from eligible collections', () => {
    const items: CartItemInput[] = [
      makeItem({ productId: 'p1', collectionId: 'col-whisky', price: '150.00', quantity: 1 }),
      makeItem({ productId: 'p2', collectionId: 'col-rum', price: '80.00', quantity: 1 }),
    ];
    const result = calcCouponDiscount(coupon, items, 230, FIXED_NOW);
    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(20.00); // fixed off the 150 eligible
  });

  it('gives zero discount when no item matches the collection', () => {
    const items: CartItemInput[] = [
      makeItem({ productId: 'p1', collectionId: 'col-rum', price: '100.00', quantity: 1 }),
    ];
    const result = calcCouponDiscount(coupon, items, 100, FIXED_NOW);
    expect(result.discountAmount).toBe(0);
  });
});
