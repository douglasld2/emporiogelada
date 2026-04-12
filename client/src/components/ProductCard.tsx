import { motion } from 'framer-motion';
import type { Product } from '@shared/schema';
import { Link } from 'wouter';
import { Tag, RotateCcw, Flame } from 'lucide-react';

export type EnrichedProduct = Product & {
  promotionPrice?: string | null;
  promoLabel?: string | null;
  cashbackPct?: number | null;
};

interface ProductCardProps {
  product: EnrichedProduct;
  isDark?: boolean;
}

function computeTotalStock(product: EnrichedProduct): number | null {
  if (product.sizes) {
    try {
      const sizesObj = JSON.parse(product.sizes) as Record<string, number>;
      const keys = Object.keys(sizesObj);
      if (keys.length === 0) return null;
      return keys.reduce((sum, k) => sum + (sizesObj[k] || 0), 0);
    } catch {
      return null;
    }
  }
  return product.stock ?? null;
}

export function ProductCard({ product, isDark = false }: ProductCardProps) {
  const hasPromo = !!product.promotionPrice && !!product.promoLabel;
  const hasCashback = !!product.cashbackPct && product.cashbackPct > 0;
  // Use server-provided displayPrice (first variation price) as canonical base
  const prod = product as any;
  const basePrice = prod.displayPrice
    ? parseFloat(prod.displayPrice)
    : parseFloat(product.price);
  const displayPrice = hasPromo
    ? parseFloat(product.promotionPrice!)
    : basePrice;
  const originalPrice = basePrice;

  const totalStock = computeTotalStock(product);
  const isOutOfStock = totalStock !== null && totalStock === 0;
  const minStock = (product as any).minStock;
  const isLowStock = !isOutOfStock && totalStock !== null && minStock != null && totalStock > 0 && totalStock <= minStock;

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Link href={`/product/${product.id}`}>
      <motion.div
        className={`group cursor-pointer${isOutOfStock ? ' opacity-60' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative overflow-hidden mb-4 aspect-[3/4]">
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105${isOutOfStock ? ' grayscale' : ''}`}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />

          {/* Out-of-stock overlay */}
          {isOutOfStock && (
            <div
              className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ backgroundColor: "rgba(0,0,0,0.75)", color: "#aaa", border: "1px solid rgba(255,255,255,0.15)" }}
              data-testid={`badge-out-of-stock-${product.id}`}
            >
              Sem Estoque
            </div>
          )}

          {/* Low stock badge */}
          {isLowStock && (
            <div
              className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ backgroundColor: "rgba(201,100,0,0.85)", color: "#fff5e0", border: "1px solid rgba(255,140,0,0.4)" }}
              data-testid={`badge-low-stock-${product.id}`}
            >
              <Flame className="w-2.5 h-2.5" />
              Últimas unid.
            </div>
          )}

          {/* Promo badge */}
          {hasPromo && !isOutOfStock && (
            <div
              className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ backgroundColor: "#8b1a1a", color: "#ffbbbb", border: "1px solid rgba(139,26,26,0.6)" }}
            >
              <Tag className="w-2.5 h-2.5" />
              {product.promoLabel}
            </div>
          )}

          {/* Cashback badge */}
          {hasCashback && !isOutOfStock && (
            <div
              className="absolute flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{
                top: hasPromo ? '2.25rem' : '0.75rem',
                left: '0.75rem',
                backgroundColor: "rgba(201,169,110,0.15)",
                color: "#c9a96e",
                border: "1px solid rgba(201,169,110,0.5)",
                backdropFilter: 'blur(4px)',
              }}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              {product.cashbackPct}% cashback
            </div>
          )}

          {!isOutOfStock && (
            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
              <button className="w-full bg-white text-black py-3 text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                Ver Detalhes
              </button>
            </div>
          )}
        </div>

        <div className="text-center">
          <h3 className={`font-serif text-lg mb-1 ${isDark ? 'text-white' : 'text-black'}`}>
            {product.name}
          </h3>
          {isOutOfStock ? (
            <p className="text-xs text-gray-400 uppercase tracking-widest">Indisponível</p>
          ) : hasPromo ? (
            <div className="flex items-center justify-center gap-2">
              <p className="text-xs line-through" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                {fmt(originalPrice)}
              </p>
              <p className="text-sm font-semibold" style={{ color: '#c9a96e' }}>
                {fmt(displayPrice)}
              </p>
            </div>
          ) : (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {fmt(displayPrice)}
            </p>
          )}
          {hasCashback && !isOutOfStock && (
            <p className="text-[10px] mt-0.5" style={{ color: '#c9a96e', opacity: 0.75 }}>
              +{product.cashbackPct}% de volta
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
