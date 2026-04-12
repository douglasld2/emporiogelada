import { describe, it, expect } from 'vitest';
import { calcCartSubtotal, type CartItemInput } from '@shared/pricing';

function makeItem(overrides: Partial<CartItemInput> = {}): CartItemInput {
  return {
    productId: 'prod-1',
    collectionId: 'col-1',
    price: '10.00',
    quantity: 1,
    ...overrides,
  };
}

describe('calcCartSubtotal', () => {
  it('returns 0 for an empty cart', () => {
    expect(calcCartSubtotal([])).toBe(0);
  });

  it('returns the item price for a single item with quantity 1', () => {
    expect(calcCartSubtotal([makeItem({ price: '29.90', quantity: 1 })])).toBe(29.90);
  });

  it('multiplies price by quantity', () => {
    expect(calcCartSubtotal([makeItem({ price: '15.00', quantity: 3 })])).toBe(45.00);
  });

  it('sums multiple items correctly', () => {
    const items: CartItemInput[] = [
      makeItem({ productId: 'p1', price: '20.00', quantity: 2 }),
      makeItem({ productId: 'p2', price: '5.50', quantity: 4 }),
    ];
    expect(calcCartSubtotal(items)).toBe(62.00);
  });

  it('handles float prices without precision drift', () => {
    const items: CartItemInput[] = [
      makeItem({ price: '12.90', quantity: 3 }),  // 38.70
      makeItem({ price: '7.99', quantity: 2 }),   // 15.98
    ];
    expect(calcCartSubtotal(items)).toBe(54.68);
  });

  it('rounds result to 2 decimal places', () => {
    const result = calcCartSubtotal([makeItem({ price: '33.33', quantity: 3 })]);
    expect(result).toBe(99.99);
  });

  it('handles large quantities', () => {
    const result = calcCartSubtotal([makeItem({ price: '2.00', quantity: 1000 })]);
    expect(result).toBe(2000.00);
  });

  it('works with kit items (kitId present)', () => {
    const items: CartItemInput[] = [
      makeItem({ productId: 'p1', price: '50.00', quantity: 1, kitId: 'kit-1' }),
      makeItem({ productId: 'p2', price: '30.00', quantity: 2, kitId: 'kit-1' }),
    ];
    expect(calcCartSubtotal(items)).toBe(110.00);
  });

  it('handles decimal prices coming from a Drizzle decimal column (string)', () => {
    const items: CartItemInput[] = [
      makeItem({ price: '19.99', quantity: 1 }),
    ];
    expect(calcCartSubtotal(items)).toBe(19.99);
  });
});
