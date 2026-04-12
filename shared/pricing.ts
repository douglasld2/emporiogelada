/**
 * Pure pricing functions shared between server routes and tests.
 * No DB imports — all inputs are passed as plain data.
 */

export interface PricingProduct {
  id: string;
  price: string;
  collectionId: string | null;
  sizePrices?: string | null;
}

export interface ActivePromotion {
  id: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  targetType: 'all' | 'product' | 'collection' | 'group';
  targetId?: string | null;
}

export interface CouponData {
  id: string;
  code: string;
  isActive: boolean;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  appliesTo: 'all' | 'products' | 'collections';
  productIds?: string[] | null;
  collectionIds?: string[] | null;
  minOrderAmount?: string | null;
  maxUsageCount?: number | null;
  currentUsageCount: number;
  startDate?: Date | string | null;
  expiresAt?: Date | string | null;
}

export interface CartItemInput {
  productId: string;
  collectionId?: string | null;
  price: string;
  quantity: number;
  kitId?: string | null;
}

export interface EffectivePriceResult {
  effectivePrice: number;
  promoLabel: string | null;
  promoDiscountType: string | null;
  promoDiscountValue: string | null;
  displayPrice: number;
}

/**
 * Returns the price to use as the base for a product.
 * When sizePrices is set:
 *   - If selectedSize is given and has a price → that variation's price
 *   - Otherwise → first variation's price
 * Falls back to product.price if no sizePrices.
 */
export function getProductDisplayPrice(
  product: Pick<PricingProduct, 'price' | 'sizePrices'>,
  selectedSize?: string | null,
): number {
  if (product.sizePrices) {
    try {
      const sp = JSON.parse(product.sizePrices) as Record<string, string>;
      if (selectedSize && sp[selectedSize] && sp[selectedSize] !== '') {
        return parseFloat(sp[selectedSize]);
      }
      const firstKey = Object.keys(sp)[0];
      if (firstKey && sp[firstKey] && sp[firstKey] !== '') {
        return parseFloat(sp[firstKey]);
      }
    } catch { /* ignore malformed JSON */ }
  }
  return parseFloat(product.price);
}

/**
 * Finds the best promotion applicable to a product and computes the
 * effective (post-discount) price.
 */
export function calcEffectivePrice(
  product: PricingProduct,
  activePromos: ActivePromotion[],
  collectionGroupMap: Record<string, string>,
  selectedSize?: string | null,
): EffectivePriceResult {
  const displayPrice = getProductDisplayPrice(product, selectedSize);
  const original = displayPrice;

  const groupId = product.collectionId
    ? collectionGroupMap[product.collectionId]
    : null;

  const applicable = activePromos.filter((p) => {
    if (p.targetType === 'all') return true;
    if (p.targetType === 'product' && p.targetId === product.id) return true;
    if (p.targetType === 'collection' && p.targetId === product.collectionId) return true;
    if (p.targetType === 'group' && p.targetId === groupId) return true;
    return false;
  });

  if (!applicable.length) {
    return { effectivePrice: original, promoLabel: null, promoDiscountType: null, promoDiscountValue: null, displayPrice };
  }

  let bestPrice = original;
  let bestPromo: ActivePromotion | null = null;

  for (const promo of applicable) {
    const disc =
      promo.discountType === 'percentage'
        ? original * (1 - parseFloat(promo.discountValue) / 100)
        : Math.max(0, original - parseFloat(promo.discountValue));
    if (disc < bestPrice) {
      bestPrice = disc;
      bestPromo = promo;
    }
  }

  if (!bestPromo) {
    return { effectivePrice: original, promoLabel: null, promoDiscountType: null, promoDiscountValue: null, displayPrice };
  }

  const label =
    bestPromo.discountType === 'percentage'
      ? `${parseFloat(bestPromo.discountValue).toFixed(0)}% OFF`
      : `R$ ${parseFloat(bestPromo.discountValue).toFixed(2).replace('.', ',')} OFF`;

  return {
    effectivePrice: Math.round(bestPrice * 100) / 100,
    promoLabel: label,
    promoDiscountType: bestPromo.discountType,
    promoDiscountValue: bestPromo.discountValue,
    displayPrice,
  };
}

/**
 * Applies the stored promo discount (type + value) to a given base price.
 * Used client-side when the user switches variations.
 * Returns null if there is no discount or if the discount doesn't reduce the price.
 */
export function applyPromoDiscount(
  basePrice: number,
  discountType: string | null,
  discountValue: string | null,
): number | null {
  if (!discountType || !discountValue) return null;
  const disc =
    discountType === 'percentage'
      ? basePrice * (1 - parseFloat(discountValue) / 100)
      : Math.max(0, basePrice - parseFloat(discountValue));
  const rounded = Math.round(disc * 100) / 100;
  return rounded < basePrice ? rounded : null;
}

/**
 * Computes the coupon discount for a cart.
 * Returns the discount amount (always >= 0).
 */
export function calcCouponDiscount(
  coupon: CouponData,
  cartItems: CartItemInput[],
  subtotal: number,
  now: Date = new Date(),
): { valid: boolean; discountAmount: number; reason?: string } {
  if (!coupon.isActive) return { valid: false, discountAmount: 0, reason: 'Cupom inativo' };

  if (coupon.startDate && new Date(coupon.startDate) > now) {
    return { valid: false, discountAmount: 0, reason: 'Cupom ainda não disponível' };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    return { valid: false, discountAmount: 0, reason: 'Cupom expirado' };
  }
  if (coupon.maxUsageCount && coupon.currentUsageCount >= coupon.maxUsageCount) {
    return { valid: false, discountAmount: 0, reason: 'Limite de usos atingido' };
  }
  if (coupon.minOrderAmount && subtotal < parseFloat(coupon.minOrderAmount)) {
    return { valid: false, discountAmount: 0, reason: `Pedido mínimo de R$ ${parseFloat(coupon.minOrderAmount).toFixed(2)} não atingido` };
  }

  let eligibleSubtotal = subtotal;

  if (coupon.appliesTo === 'products' && coupon.productIds?.length) {
    eligibleSubtotal = cartItems
      .filter(i => !i.kitId && coupon.productIds!.includes(i.productId))
      .reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
  } else if (coupon.appliesTo === 'collections' && coupon.collectionIds?.length) {
    eligibleSubtotal = cartItems
      .filter(i => !i.kitId && i.collectionId && coupon.collectionIds!.includes(i.collectionId))
      .reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
  }

  let discountAmount: number;
  if (coupon.discountType === 'fixed') {
    discountAmount = Math.min(parseFloat(coupon.discountValue), eligibleSubtotal);
  } else {
    discountAmount = (eligibleSubtotal * parseFloat(coupon.discountValue)) / 100;
  }

  return { valid: true, discountAmount: Math.round(discountAmount * 100) / 100 };
}

/**
 * Calculates the cart subtotal (before coupons, shipping, etc.)
 * given an array of items with individual prices and quantities.
 */
export function calcCartSubtotal(items: CartItemInput[]): number {
  return Math.round(
    items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0) * 100,
  ) / 100;
}
