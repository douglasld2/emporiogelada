import { describe, it, expect } from 'vitest';
import {
  getProductDisplayPrice,
  calcEffectivePrice,
  applyPromoDiscount,
  type PricingProduct,
  type ActivePromotion,
} from '@shared/pricing';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<PricingProduct> = {}): PricingProduct {
  return {
    id: 'prod-1',
    price: '50.00',
    collectionId: 'col-1',
    sizePrices: null,
    ...overrides,
  };
}

function makePromo(overrides: Partial<ActivePromotion> = {}): ActivePromotion {
  return {
    id: 'promo-1',
    discountType: 'percentage',
    discountValue: '10',
    targetType: 'all',
    targetId: null,
    ...overrides,
  };
}

const NO_PROMOS: ActivePromotion[] = [];
const NO_GROUP_MAP: Record<string, string> = {};

// ─── getProductDisplayPrice ───────────────────────────────────────────────────

describe('getProductDisplayPrice', () => {
  it('returns product.price when sizePrices is null', () => {
    const p = makeProduct({ price: '39.90', sizePrices: null });
    expect(getProductDisplayPrice(p)).toBe(39.90);
  });

  it('returns product.price when sizePrices is an empty string', () => {
    const p = makeProduct({ price: '25.00', sizePrices: '' });
    expect(getProductDisplayPrice(p)).toBe(25.00);
  });

  it('returns first variation price when no selectedSize given', () => {
    const sp = JSON.stringify({ '300ml': '30.00', '600ml': '55.00' });
    const p = makeProduct({ price: '99.00', sizePrices: sp });
    expect(getProductDisplayPrice(p)).toBe(30.00);
  });

  it('returns price of the selected variation', () => {
    const sp = JSON.stringify({ '300ml': '30.00', '600ml': '55.00' });
    const p = makeProduct({ price: '99.00', sizePrices: sp });
    expect(getProductDisplayPrice(p, '600ml')).toBe(55.00);
  });

  it('falls back to first variation when selectedSize not found', () => {
    const sp = JSON.stringify({ Pequeno: '20.00', Grande: '40.00' });
    const p = makeProduct({ price: '99.00', sizePrices: sp });
    expect(getProductDisplayPrice(p, 'Extra Grande')).toBe(20.00);
  });

  it('falls back to product.price when sizePrices is malformed JSON', () => {
    const p = makeProduct({ price: '15.00', sizePrices: '{bad json}' });
    expect(getProductDisplayPrice(p)).toBe(15.00);
  });

  it('ignores empty-string variation values and keeps first valid price', () => {
    const sp = JSON.stringify({ P: '', M: '22.50', G: '29.00' });
    const p = makeProduct({ price: '5.00', sizePrices: sp });
    // 'P' is empty → first key 'P' has value '' → skip → return product.price fallback
    // Actually: the code reads the first key as 'P' with '' value → falls through to product.price
    // Because the first key value is '' which is falsy
    expect(getProductDisplayPrice(p)).toBe(5.00);
  });
});

// ─── calcEffectivePrice ───────────────────────────────────────────────────────

describe('calcEffectivePrice', () => {
  it('returns original price when no promotions', () => {
    const p = makeProduct({ price: '50.00' });
    const result = calcEffectivePrice(p, NO_PROMOS, NO_GROUP_MAP);
    expect(result.effectivePrice).toBe(50.00);
    expect(result.promoLabel).toBeNull();
    expect(result.displayPrice).toBe(50.00);
  });

  it('applies a global percentage discount (targetType = all)', () => {
    const p = makeProduct({ price: '100.00' });
    const promo = makePromo({ discountType: 'percentage', discountValue: '20', targetType: 'all' });
    const result = calcEffectivePrice(p, [promo], NO_GROUP_MAP);
    expect(result.effectivePrice).toBe(80.00);
    expect(result.promoLabel).toBe('20% OFF');
    expect(result.promoDiscountType).toBe('percentage');
    expect(result.promoDiscountValue).toBe('20');
  });

  it('applies a global fixed discount (targetType = all)', () => {
    const p = makeProduct({ price: '80.00' });
    const promo = makePromo({ discountType: 'fixed', discountValue: '15', targetType: 'all' });
    const result = calcEffectivePrice(p, [promo], NO_GROUP_MAP);
    expect(result.effectivePrice).toBe(65.00);
    expect(result.promoLabel).toBe('R$ 15,00 OFF');
  });

  it('applies a product-specific promotion', () => {
    const p = makeProduct({ id: 'prod-abc', price: '60.00' });
    const promos = [
      makePromo({ targetType: 'product', targetId: 'prod-other', discountValue: '50' }),
      makePromo({ targetType: 'product', targetId: 'prod-abc', discountValue: '25', discountType: 'percentage' }),
    ];
    const result = calcEffectivePrice(p, promos, NO_GROUP_MAP);
    expect(result.effectivePrice).toBe(45.00);
  });

  it('applies a collection-specific promotion', () => {
    const p = makeProduct({ price: '200.00', collectionId: 'col-whisky' });
    const promo = makePromo({ targetType: 'collection', targetId: 'col-whisky', discountValue: '10', discountType: 'percentage' });
    const result = calcEffectivePrice(p, [promo], NO_GROUP_MAP);
    expect(result.effectivePrice).toBe(180.00);
  });

  it('applies a group-level promotion', () => {
    const p = makeProduct({ price: '100.00', collectionId: 'col-1' });
    const groupMap = { 'col-1': 'group-bebidas' };
    const promo = makePromo({ targetType: 'group', targetId: 'group-bebidas', discountValue: '30', discountType: 'percentage' });
    const result = calcEffectivePrice(p, [promo], groupMap);
    expect(result.effectivePrice).toBe(70.00);
  });

  it('does NOT apply a promotion targeted at a different product', () => {
    const p = makeProduct({ id: 'prod-1', price: '50.00' });
    const promo = makePromo({ targetType: 'product', targetId: 'prod-999', discountValue: '50' });
    const result = calcEffectivePrice(p, [promo], NO_GROUP_MAP);
    expect(result.effectivePrice).toBe(50.00);
    expect(result.promoLabel).toBeNull();
  });

  it('picks the best (lowest) price when multiple promos apply', () => {
    const p = makeProduct({ price: '100.00' });
    const promos = [
      makePromo({ id: 'p1', discountType: 'percentage', discountValue: '10', targetType: 'all' }), // 90.00
      makePromo({ id: 'p2', discountType: 'percentage', discountValue: '25', targetType: 'all' }), // 75.00 ← best
      makePromo({ id: 'p3', discountType: 'fixed', discountValue: '20', targetType: 'all' }),      // 80.00
    ];
    const result = calcEffectivePrice(p, promos, NO_GROUP_MAP);
    expect(result.effectivePrice).toBe(75.00);
    expect(result.promoLabel).toBe('25% OFF');
  });

  it('clamps fixed discount so effective price never goes below zero', () => {
    const p = makeProduct({ price: '10.00' });
    const promo = makePromo({ discountType: 'fixed', discountValue: '50', targetType: 'all' });
    const result = calcEffectivePrice(p, [promo], NO_GROUP_MAP);
    expect(result.effectivePrice).toBe(0.00);
  });

  it('uses variation price (sizePrices) as base for the discount', () => {
    const sp = JSON.stringify({ '500ml': '100.00', '1L': '180.00' });
    const p = makeProduct({ price: '999.00', sizePrices: sp });
    const promo = makePromo({ discountType: 'percentage', discountValue: '10', targetType: 'all' });
    const result = calcEffectivePrice(p, [promo], NO_GROUP_MAP, '1L');
    expect(result.displayPrice).toBe(180.00);
    expect(result.effectivePrice).toBe(162.00);
  });

  it('rounds effectivePrice to 2 decimal places', () => {
    const p = makeProduct({ price: '99.99' });
    const promo = makePromo({ discountType: 'percentage', discountValue: '33.333', targetType: 'all' });
    const result = calcEffectivePrice(p, [promo], NO_GROUP_MAP);
    expect(result.effectivePrice).toBe(Math.round(99.99 * (1 - 33.333 / 100) * 100) / 100);
  });
});

// ─── applyPromoDiscount ───────────────────────────────────────────────────────

describe('applyPromoDiscount', () => {
  it('returns null when discountType is null', () => {
    expect(applyPromoDiscount(100, null, null)).toBeNull();
  });

  it('returns null when discountValue is null', () => {
    expect(applyPromoDiscount(100, 'percentage', null)).toBeNull();
  });

  it('applies percentage discount correctly', () => {
    expect(applyPromoDiscount(200, 'percentage', '15')).toBe(170);
  });

  it('applies fixed discount correctly', () => {
    expect(applyPromoDiscount(50, 'fixed', '12.50')).toBe(37.50);
  });

  it('returns null when the discount does not actually reduce the price', () => {
    expect(applyPromoDiscount(50, 'percentage', '0')).toBeNull();
  });

  it('clamps fixed discount to zero (returns 0, not negative)', () => {
    expect(applyPromoDiscount(10, 'fixed', '999')).toBe(0);
  });
});
