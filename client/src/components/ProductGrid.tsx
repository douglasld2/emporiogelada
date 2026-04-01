import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { useStore } from '@/lib/StoreContext';
import { ProductCard } from './ProductCard';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductGridProps {
  initialCollectionId?: string;
  groupId?: string;
  isDark?: boolean;
}

const GOLD = '#c9a96e';

export function ProductGrid({ initialCollectionId, groupId, isDark = false }: ProductGridProps) {
  const { products, collections, groups } = useStore();
  const [activeFilter, setActiveFilter] = useState<string>(initialCollectionId || 'all');
  const [, navigate] = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    setActiveFilter(initialCollectionId || 'all');
  }, [initialCollectionId]);

  // Collections to show in nav: if groupId set, only that group's; otherwise all
  const navCollections = groupId
    ? collections.filter(c => c.groupId === groupId).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    : collections;

  const parentGroup = groupId ? groups.find(g => g.id === groupId) : null;

  const filteredProducts = activeFilter === 'all'
    ? products
    : products.filter(p => p.collectionId === activeFilter);

  // Scroll shadow detection
  const checkScroll = () => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [navCollections.length]);

  const scrollNav = (dir: 'left' | 'right') => {
    navRef.current?.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const activeColor = isDark ? 'white' : '#000000';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
  const borderActive = isDark ? 'rgba(255,255,255,0.9)' : '#000000';

  return (
    <div className="container mx-auto px-6 py-16">
      {/* Group context label */}
      {parentGroup && (
        <div className="mb-4 flex items-center gap-2">
          <Link href="/shop">
            <span
              className="text-xs uppercase tracking-widest cursor-pointer hover:opacity-100 transition-opacity"
              style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
            >
              Todos
            </span>
          </Link>
          <span style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)' }}>/</span>
          <span
            className="text-xs uppercase tracking-widest font-medium"
            style={{ color: GOLD }}
          >
            {parentGroup.name}
          </span>
        </div>
      )}

      {/* Scrollable filter nav */}
      <div className="relative mb-12">
        {/* Left fade + arrow */}
        {canScrollLeft && (
          <>
            <div
              className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
              style={{
                background: isDark
                  ? 'linear-gradient(to right, #000 0%, transparent 100%)'
                  : 'linear-gradient(to right, #fff 0%, transparent 100%)',
              }}
            />
            <button
              onClick={() => scrollNav('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-7 h-7 rounded-full transition-all"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              }}
              aria-label="Rolar esquerda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Right fade + arrow */}
        {canScrollRight && (
          <>
            <div
              className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
              style={{
                background: isDark
                  ? 'linear-gradient(to left, #000 0%, transparent 100%)'
                  : 'linear-gradient(to left, #fff 0%, transparent 100%)',
              }}
            />
            <button
              onClick={() => scrollNav('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-7 h-7 rounded-full transition-all"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              }}
              aria-label="Rolar direita"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Scrollable row */}
        <div
          ref={navRef}
          className="flex gap-8 overflow-x-auto scrollbar-hide px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* "Todos" tab */}
          <Link href="/shop">
            <button
              className="flex-shrink-0 text-sm uppercase tracking-widest pb-2 border-b-2 transition-all whitespace-nowrap"
              style={{
                borderColor: activeFilter === 'all' ? borderActive : 'transparent',
                color: activeFilter === 'all' ? activeColor : inactiveColor,
              }}
              data-testid="filter-all"
            >
              Todos
            </button>
          </Link>

          {navCollections.map(col => (
            <Link key={col.id} href={`/collection/${col.id}`}>
              <button
                className="flex-shrink-0 text-sm uppercase tracking-widest pb-2 border-b-2 transition-all whitespace-nowrap"
                style={{
                  borderColor: activeFilter === col.id ? GOLD : 'transparent',
                  color: activeFilter === col.id ? GOLD : inactiveColor,
                }}
                data-testid={`filter-${col.id}`}
              >
                {col.title}
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16"
      >
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} isDark={isDark} />
        ))}
      </motion.div>

      {filteredProducts.length === 0 && (
        <div className={`text-center py-20 font-serif text-xl ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Nenhum produto encontrado nesta coleção.
        </div>
      )}
    </div>
  );
}
