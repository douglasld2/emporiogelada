import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import type { Product, CartItem, Kit } from '@shared/schema';

const CART_STORAGE_KEY = 'emporio_gelada_cart';

export interface LocalCartItem {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
  selectedSize?: string;
  kitId?: string;
  kit?: {
    id: string;
    name: string;
    image: string | null;
    price: string;
    promotionPrice: string | null;
  };
  effectivePrice?: string;
  promoLabel?: string | null;
}

interface CartContextType {
  items: LocalCartItem[];
  isLoading: boolean;
  addToCart: (product: Product, quantity?: number, selectedSize?: string) => Promise<void>;
  addKitToCart: (kit: Kit, anchorProduct: Product, quantity?: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  subtotal: number;
  itemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getLocalCart(): LocalCartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalCart(items: LocalCartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error);
  }
}

function clearLocalCart(): void {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage cart:', error);
  }
}

async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }
  
  return response.json();
}

function getVariationBasePrice(item: LocalCartItem): number {
  const prod = item.product as any;
  if (prod.sizePrices) {
    try {
      const sp = JSON.parse(prod.sizePrices) as Record<string, string>;
      if (item.selectedSize && sp[item.selectedSize] && sp[item.selectedSize] !== '') {
        return parseFloat(sp[item.selectedSize]);
      }
      const firstKey = Object.keys(sp)[0];
      if (firstKey && sp[firstKey] && sp[firstKey] !== '') return parseFloat(sp[firstKey]);
    } catch { /* ignore */ }
  }
  return typeof item.product.price === 'string' ? parseFloat(item.product.price) : item.product.price;
}

function getItemPrice(item: LocalCartItem): number {
  if (item.kit) {
    const promoPrice = item.kit.promotionPrice ? parseFloat(item.kit.promotionPrice) : null;
    if (promoPrice && promoPrice > 0) return promoPrice;
    return parseFloat(item.kit.price);
  }
  // Server-computed effective price (logged-in users via GET /api/cart enrichment)
  if (item.effectivePrice) {
    return parseFloat(item.effectivePrice);
  }
  // Fallback: promotionPrice already on product object from listing API (guest users)
  const prod = item.product as any;
  if (prod.promotionPrice && parseFloat(prod.promotionPrice) > 0) {
    return parseFloat(prod.promotionPrice);
  }
  return getVariationBasePrice(item);
}

function calcGuestEffectivePrice(
  product: Product,
  promotions: any[],
  collections: any[],
  selectedSize?: string,
): { effectivePrice: number; promoLabel: string | null } {
  // Use size-specific price as base; fall back to first variation, then product.price
  let original = parseFloat(String(product.price));
  const sp = (product as any).sizePrices;
  if (sp) {
    try {
      const sizePricesMap = JSON.parse(sp) as Record<string, string>;
      if (selectedSize && sizePricesMap[selectedSize] && sizePricesMap[selectedSize] !== '') {
        original = parseFloat(String(sizePricesMap[selectedSize]));
      } else {
        const firstKey = Object.keys(sizePricesMap)[0];
        if (firstKey && sizePricesMap[firstKey] && sizePricesMap[firstKey] !== '') {
          original = parseFloat(String(sizePricesMap[firstKey]));
        }
      }
    } catch { /* ignore */ }
  }
  const collGroupMap: Record<string, string> = {};
  for (const c of collections) {
    if (c.groupId) collGroupMap[c.id] = c.groupId;
  }
  const groupId = product.collectionId ? collGroupMap[product.collectionId] : null;

  const now = new Date();
  const applicable = promotions.filter((p: any) => {
    if (!p.isActive) return false;
    if (p.startDate && new Date(p.startDate) > now) return false;
    if (p.endDate && new Date(p.endDate) < now) return false;
    if (p.targetType === 'all') return true;
    if (p.targetType === 'product' && p.targetId === product.id) return true;
    if (p.targetType === 'collection' && p.targetId === product.collectionId) return true;
    if (p.targetType === 'group' && p.targetId === groupId) return true;
    return false;
  });

  if (!applicable.length) return { effectivePrice: original, promoLabel: null };

  let bestPrice = original;
  let bestPromo: any = null;
  for (const promo of applicable) {
    const disc = promo.discountType === 'percentage'
      ? original * (1 - parseFloat(promo.discountValue) / 100)
      : Math.max(0, original - parseFloat(promo.discountValue));
    if (disc < bestPrice) {
      bestPrice = disc;
      bestPromo = promo;
    }
  }

  if (!bestPromo) return { effectivePrice: original, promoLabel: null };
  const label = bestPromo.discountType === 'percentage'
    ? `${parseFloat(bestPromo.discountValue).toFixed(0)}% OFF`
    : `R$ ${parseFloat(bestPromo.discountValue).toFixed(2).replace('.', ',')} OFF`;
  return { effectivePrice: Math.round(bestPrice * 100) / 100, promoLabel: label };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [localItems, setLocalItems] = useState<LocalCartItem[]>([]);
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: serverItems = [], isLoading: serverLoading, refetch: refetchCart } = useQuery<(CartItem & { product: Product; kit?: any })[]>({
    queryKey: ['cart'],
    queryFn: async () => {
      if (!user) return [];
      try {
        return await apiRequest('/api/cart');
      } catch {
        return [];
      }
    },
    enabled: !!user,
    retry: false,
  });

  const { data: promoData } = useQuery<{ promotions: any[]; collections: any[] }>({
    queryKey: ['cart-promotions'],
    queryFn: async () => {
      const [promotions, collections] = await Promise.all([
        fetch('/api/promotions/active').then(r => r.ok ? r.json() : []),
        fetch('/api/collections').then(r => r.ok ? r.json() : []),
      ]);
      return {
        promotions: Array.isArray(promotions) ? promotions : [],
        collections: Array.isArray(collections) ? collections : [],
      };
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (!user) {
      setLocalItems(getLocalCart());
    }
  }, [user]);

  const syncCartMutation = useMutation({
    mutationFn: async (items: { productId: string; quantity: number; selectedSize?: string; kitId?: string }[]) => {
      return apiRequest('/api/cart/sync', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      clearLocalCart();
      setLocalItems([]);
    },
  });

  useEffect(() => {
    if (user && !authLoading) {
      const localCart = getLocalCart();
      if (localCart.length > 0) {
        const itemsToSync = localCart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          kitId: item.kitId,
        }));
        syncCartMutation.mutate(itemsToSync);
      }
    }
  }, [user, authLoading]);

  const guestItemsWithPromos: LocalCartItem[] = React.useMemo(() => {
    if (user || !promoData) return localItems;
    return localItems.map(item => {
      if (item.kitId) return item;
      const { effectivePrice, promoLabel } = calcGuestEffectivePrice(
        item.product,
        promoData.promotions,
        promoData.collections,
        item.selectedSize,
      );
      return {
        ...item,
        effectivePrice: effectivePrice.toFixed(2),
        promoLabel,
      };
    });
  }, [user, localItems, promoData]);

  const items: LocalCartItem[] = user
    ? serverItems.map(item => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: item.product,
        selectedSize: (item as any).selectedSize,
        kitId: (item as any).kitId || undefined,
        kit: item.kit ? {
          id: item.kit.id,
          name: item.kit.name,
          image: item.kit.image,
          price: item.kit.price,
          promotionPrice: item.kit.promotionPrice,
        } : undefined,
        effectivePrice: (item as any).effectivePrice || undefined,
        promoLabel: (item as any).promoLabel || undefined,
      }))
    : guestItemsWithPromos;

  const isLoading = authLoading || (user ? serverLoading : false);

  const addToCart = useCallback(async (product: Product, quantity: number = 1, selectedSize?: string) => {
    if (user) {
      await apiRequest('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity, selectedSize }),
      });
      await queryClient.refetchQueries({ queryKey: ['cart'] });
    } else {
      setLocalItems(prev => {
        const existing = prev.find(item => 
          item.productId === product.id && item.selectedSize === selectedSize && !item.kitId
        );
        let newItems: LocalCartItem[];
        
        if (existing) {
          newItems = prev.map(item =>
            item.productId === product.id && item.selectedSize === selectedSize && !item.kitId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          newItems = [...prev, {
            id: generateLocalId(),
            productId: product.id,
            quantity,
            product,
            selectedSize,
          }];
        }
        
        saveLocalCart(newItems);
        return newItems;
      });
    }
    setIsCartOpen(true);
  }, [user, queryClient]);

  const addKitToCart = useCallback(async (kit: Kit, anchorProduct: Product, quantity: number = 1) => {
    if (user) {
      await apiRequest('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: anchorProduct.id, quantity, kitId: kit.id }),
      });
      await queryClient.refetchQueries({ queryKey: ['cart'] });
    } else {
      setLocalItems(prev => {
        const existing = prev.find(item => item.kitId === kit.id);
        let newItems: LocalCartItem[];
        
        if (existing) {
          newItems = prev.map(item =>
            item.kitId === kit.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          newItems = [...prev, {
            id: generateLocalId(),
            productId: anchorProduct.id,
            quantity,
            product: anchorProduct,
            kitId: kit.id,
            kit: {
              id: kit.id,
              name: kit.name,
              image: kit.image,
              price: kit.price,
              promotionPrice: kit.promotionPrice,
            },
          }];
        }
        
        saveLocalCart(newItems);
        return newItems;
      });
    }
    setIsCartOpen(true);
  }, [user, queryClient]);

  const removeFromCart = useCallback(async (cartItemId: string) => {
    if (user) {
      await apiRequest(`/api/cart/${cartItemId}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } else {
      setLocalItems(prev => {
        const newItems = prev.filter(item => item.id !== cartItemId);
        saveLocalCart(newItems);
        return newItems;
      });
    }
  }, [user, queryClient]);

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(cartItemId);
      return;
    }

    if (user) {
      await apiRequest(`/api/cart/${cartItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } else {
      setLocalItems(prev => {
        const newItems = prev.map(item =>
          item.id === cartItemId ? { ...item, quantity } : item
        );
        saveLocalCart(newItems);
        return newItems;
      });
    }
  }, [user, queryClient, removeFromCart]);

  const clearCart = useCallback(async () => {
    if (user) {
      await apiRequest('/api/cart', { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } else {
      clearLocalCart();
      setLocalItems([]);
    }
  }, [user, queryClient]);

  const subtotal = items.reduce((sum, item) => {
    return sum + getItemPrice(item) * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        addToCart,
        addKitToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        itemCount,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
