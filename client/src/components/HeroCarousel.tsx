import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Collection } from '@/lib/data';
import { Link } from 'wouter';
import { ArrowRight, Zap, RotateCcw } from 'lucide-react';
import { useStore } from '@/lib/StoreContext';

interface HeroCarouselProps {
  collections: Collection[];
}

const GOLD = '#c9a96e';

function promoLabel(promo: any): string {
  if (!promo) return '';
  if (promo.discountType === 'percentage') return `${Number(promo.discountValue)}% OFF`;
  return `R$ ${Number(promo.discountValue).toFixed(2).replace('.', ',')} OFF`;
}

function getCollectionPromo(activePromotions: any[], collection: Collection): any | null {
  return activePromotions.find(p =>
    p.targetType === 'all' ||
    (p.targetType === 'collection' && p.targetId === collection.id) ||
    (p.targetType === 'group' && p.targetId === (collection as any).groupId)
  ) ?? null;
}

export function HeroCarousel({ collections }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 60 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const { activePromotions } = useStore();

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    const interval = setInterval(() => emblaApi.scrollNext(), 6000);
    return () => clearInterval(interval);
  }, [emblaApi, onSelect]);

  if (!collections || collections.length === 0) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  const current = collections[currentIndex];
  const currentPromo = getCollectionPromo(activePromotions, current);
  const currentCashbackPct: number | null = (current as any).cashbackPct ?? null;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* Slides */}
      <div className="absolute inset-0" ref={emblaRef}>
        <div className="flex h-full">
          {collections.map((col) => (
            <div className="relative flex-[0_0_100%] h-full min-w-0" key={col.id}>
              <img
                src={col.image}
                alt={col.title}
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Gradient: strong at bottom-left, subtle at top */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent pointer-events-none" />

      {/* Bottom-left content */}
      <div className="absolute bottom-0 left-0 right-0 pb-14 px-8 md:px-16 flex items-end justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-lg"
          >
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {/* Promo badge */}
              {currentPromo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest"
                  style={{
                    backgroundColor: 'rgba(139,26,26,0.85)',
                    color: '#ffbbbb',
                    border: '1px solid rgba(139,26,26,0.7)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <Zap className="w-3 h-3" />
                  {promoLabel(currentPromo)}
                </motion.div>
              )}

              {/* Cashback badge */}
              {currentCashbackPct && currentCashbackPct > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest"
                  style={{
                    backgroundColor: 'rgba(201,169,110,0.15)',
                    color: '#c9a96e',
                    border: '1px solid rgba(201,169,110,0.55)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <RotateCcw className="w-3 h-3" />
                  {currentCashbackPct}% cashback
                </motion.div>
              )}
            </div>

            <h1 className="text-4xl md:text-6xl font-serif text-white mb-3 leading-tight tracking-tight">
              {current.title}
            </h1>
            {current.description && (
              <p className="text-sm md:text-base text-white/60 font-light leading-relaxed tracking-wide max-w-sm">
                {current.description}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* CTA button — bottom right */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`cta-${currentIndex}`}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
          >
            <Link href={`/collection/${current.id}`}>
              <button
                className="group flex items-center gap-2.5 text-sm tracking-widest uppercase font-medium transition-all duration-300"
                style={{ color: GOLD }}
                data-testid="hero-cta-button"
              >
                <span className="border-b border-transparent group-hover:border-current transition-colors duration-300">
                  Ver coleção
                </span>
                <span
                  className="flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-300 group-hover:bg-[#c9a96e] group-hover:border-[#c9a96e]"
                  style={{ borderColor: GOLD }}
                >
                  <ArrowRight
                    className="w-4 h-4 group-hover:text-black transition-colors duration-300"
                    style={{ color: GOLD }}
                  />
                </span>
              </button>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators — bottom center */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
        {collections.map((_, idx) => (
          <button
            key={idx}
            onClick={() => emblaApi?.scrollTo(idx)}
            className="transition-all duration-500"
            style={{
              height: '2px',
              width: currentIndex === idx ? '40px' : '16px',
              backgroundColor: currentIndex === idx ? GOLD : 'rgba(255,255,255,0.25)',
            }}
            data-testid={`hero-dot-${idx}`}
          />
        ))}
      </div>
    </div>
  );
}
