import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useCart } from "@/lib/CartContext";
import type { LocalCartItem } from "@/lib/CartContext";
import { Minus, Plus, X, ShoppingBag, Gift } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

function getItemDisplay(item: LocalCartItem) {
  if (item.kit) {
    const promoPrice = item.kit.promotionPrice ? parseFloat(item.kit.promotionPrice) : null;
    const basePrice = parseFloat(item.kit.price);
    return {
      name: item.kit.name,
      image: item.kit.image || item.product.image,
      price: promoPrice && promoPrice > 0 ? promoPrice : basePrice,
      originalPrice: promoPrice && promoPrice > 0 ? basePrice : null,
      promoLabel: promoPrice && promoPrice > 0 ? 'Promoção' : null,
      isKit: true,
    };
  }
  const prod = item.product as any;
  // Base price = variation-specific price (selectedSize or first variation or product.price)
  let basePrice = parseFloat(String(item.product.price));
  if (prod.sizePrices) {
    try {
      const sp = JSON.parse(prod.sizePrices) as Record<string, string>;
      const key = item.selectedSize && sp[item.selectedSize] ? item.selectedSize : Object.keys(sp)[0];
      if (key && sp[key] && sp[key] !== '') basePrice = parseFloat(sp[key]);
    } catch { /* ignore */ }
  } else if (prod.displayPrice) {
    basePrice = parseFloat(prod.displayPrice);
  }
  // Use server effectivePrice, or promotionPrice from product listing (guest), or base price
  const resolvedPrice = item.effectivePrice
    ? parseFloat(item.effectivePrice)
    : (prod.promotionPrice && parseFloat(prod.promotionPrice) > 0 ? parseFloat(prod.promotionPrice) : basePrice);
  const resolvedLabel = item.promoLabel || (prod.promoLabel ?? null);
  const hasDiscount = resolvedPrice < basePrice;
  return {
    name: item.product.name,
    image: item.product.image,
    price: resolvedPrice,
    originalPrice: hasDiscount ? basePrice : null,
    promoLabel: hasDiscount ? (resolvedLabel || 'Promoção') : null,
    isKit: false,
  };
}

export function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, subtotal, itemCount } = useCart();

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0 gap-0 border-l border-gray-100">
        <SheetHeader className="p-6 border-b border-gray-100">
          <SheetTitle className="font-serif text-2xl font-normal flex items-center justify-between">
            <span>Sacola</span>
            <span className="text-sm font-sans font-normal text-gray-400">({itemCount} {itemCount === 1 ? 'item' : 'itens'})</span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Itens na sua sacola de compras
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-lg font-serif mb-2">Sua sacola está vazia</p>
            <p className="text-sm text-gray-400 mb-8">Explore nossas coleções e encontre algo único.</p>
            <Button 
              onClick={() => setIsCartOpen(false)} 
              className="bg-black text-white hover:bg-gray-800 rounded-none uppercase tracking-widest"
              data-testid="button-continue-shopping"
            >
              Continuar Comprando
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="p-6 flex flex-col gap-8">
                {items.map((item) => {
                  const display = getItemDisplay(item);
                  return (
                    <div key={item.id} className="flex gap-4" data-testid={`cart-item-${item.id}`}>
                      <div className="w-24 h-32 bg-gray-100 overflow-hidden flex-shrink-0 relative">
                        <img 
                          src={display.image} 
                          alt={display.name} 
                          className="w-full h-full object-cover" 
                        />
                        {display.isKit && (
                          <div className="absolute top-1 left-1 bg-[#c9a96e] rounded-full p-1">
                            <Gift className="w-3 h-3 text-black" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <h3 className="font-serif text-lg leading-tight">{display.name}</h3>
                              {display.isKit && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-[#c9a96e]/10 text-[#c9a96e] rounded font-semibold uppercase mt-1 inline-block">Kit</span>
                              )}
                            </div>
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="text-gray-400 hover:text-black transition-colors p-1"
                              data-testid={`button-remove-${item.id}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {display.originalPrice ? (
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-semibold" style={{ color: '#c9a96e' }}>
                                R$ {display.price.toFixed(2).replace('.', ',')}
                              </p>
                              <p className="text-xs line-through text-gray-400">
                                R$ {display.originalPrice.toFixed(2).replace('.', ',')}
                              </p>
                              {display.promoLabel && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-[#8b1a1a] text-white rounded font-semibold uppercase">
                                  {display.promoLabel}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 mb-1">
                              R$ {display.price.toFixed(2).replace('.', ',')}
                            </p>
                          )}
                          {item.selectedSize && !display.isKit && (
                            <p className="text-xs text-gray-400">Tamanho: {item.selectedSize}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center border border-gray-200">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-2 hover:bg-gray-50 transition-colors"
                              data-testid={`button-decrease-${item.id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm" data-testid={`text-quantity-${item.id}`}>
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-2 hover:bg-gray-50 transition-colors"
                              data-testid={`button-increase-${item.id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm uppercase tracking-widest">Subtotal</span>
                <span className="font-serif text-xl" data-testid="text-subtotal">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <p className="text-xs text-gray-400 mb-6 text-center">Frete e impostos calculados no checkout.</p>
              <Link href="/checkout">
                <Button 
                  onClick={() => setIsCartOpen(false)}
                  className="w-full bg-black text-white hover:bg-gray-800 h-12 rounded-none uppercase tracking-widest text-sm"
                  data-testid="button-checkout"
                >
                  Finalizar Compra
                </Button>
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
