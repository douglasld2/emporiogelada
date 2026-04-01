import { motion } from 'framer-motion';
import type { Product } from '@shared/schema';
import { Link } from 'wouter';
import { Tag, RotateCcw } from 'lucide-react';

export type EnrichedProduct = Product & {
  promotionPrice?: string | null;
  promoLabel?: string | null;
  cashbackPct?: number | null;
};

interface ProductCardProps {
  product: EnrichedProduct;
  isDark?: boolean;
}

export function ProductCard({ product, isDark = false }: ProductCardProps) {
  const hasPromo = !!product.promotionPrice && !!product.promoLabel;
  const hasCashback = !!product.cashbackPct && product.cashbackPct > 0;
  const displayPrice = hasPromo
    ? parseFloat(product.promotionPrice!)
    : parseFloat(product.price);
  const originalPrice = parseFloat(product.price);

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Link href={`/product/${product.id}`}>
      <motion.div
        className="group cursor-pointer"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative overflow-hidden mb-4 aspect-[3/4]">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />

          {/* Promo badge */}
          {hasPromo && (
            <div
              className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ backgroundColor: "#8b1a1a", color: "#ffbbbb", border: "1px solid rgba(139,26,26,0.6)" }}
            >
              <Tag className="w-2.5 h-2.5" />
              {product.promoLabel}
            </div>
          )}

          {/* Cashback badge */}
          {hasCashback && (
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

          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
            <button className="w-full bg-white text-black py-3 text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
              Ver Detalhes
            </button>
          </div>
        </div>

        <div className="text-center">
          <h3 className={`font-serif text-lg mb-1 ${isDark ? 'text-white' : 'text-black'}`}>
            {product.name}
          </h3>
          {hasPromo ? (
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
          {hasCashback && (
            <p className="text-[10px] mt-0.5" style={{ color: '#c9a96e', opacity: 0.75 }}>
              +{product.cashbackPct}% de volta
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
