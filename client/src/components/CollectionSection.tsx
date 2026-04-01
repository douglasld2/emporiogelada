import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'wouter';
import { Collection } from '@/lib/data';
import { ArrowRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface CollectionSectionProps {
  collection: Collection;
  index: number;
}

export function CollectionSection({ collection, index }: CollectionSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Reduced parallax range on mobile to smooth jitter, full effect on desktop
  const y = useTransform(scrollYProgress, [0, 1], isMobile ? ["-5%", "5%"] : ["-15%", "15%"]);
  // Opacity fade for text
  const opacity = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [0, 1, 0]);

  const isEven = index % 2 === 0;
  const isDark = collection.theme === 'dark';

  // Theme-based styles
  const cardStyles = isDark 
    ? 'bg-black/40 backdrop-blur-md border border-white/20 text-white'
    : 'bg-white/80 backdrop-blur-md border border-black/10 text-black';
  
  const subtitleStyles = isDark ? 'opacity-80' : 'opacity-60 text-gray-600';
  const descriptionStyles = isDark ? 'opacity-90' : 'opacity-80 text-gray-700';
  const buttonBorderStyles = isDark ? 'group-hover:border-white' : 'group-hover:border-black';
  const imageFilter = isDark ? 'brightness-75 group-hover:brightness-90' : 'brightness-90 group-hover:brightness-100';

  return (
    <Link href={`/collection/${collection.id}`}>
      <div 
        ref={ref} 
        className="relative h-[80vh] md:h-screen overflow-hidden cursor-pointer group"
      >
        {/* Background Parallax Image */}
        <motion.div 
          style={{ y }}
          className="absolute inset-0 w-full h-[120%] -top-[10%] will-change-transform"
        >
          <img 
            src={collection.image} 
            alt={collection.title} 
            className={`w-full h-full object-cover ${imageFilter} transition-all duration-700 md:duration-1000`}
          />
        </motion.div>

        {/* Overlay Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            style={{ opacity }}
            className={`container mx-auto px-6 flex ${isEven ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`${cardStyles} p-8 md:p-12 lg:p-20 max-w-2xl`}>
              <span className={`block text-xs md:text-sm tracking-[0.3em] uppercase mb-3 md:mb-4 ${subtitleStyles}`}>
                Coleção {index + 1}
              </span>
              <h2 className="text-3xl md:text-5xl lg:text-7xl font-serif mb-4 md:mb-6 leading-tight">
                {collection.title}
              </h2>
              <p className={`text-base md:text-lg lg:text-xl font-light mb-6 md:mb-8 leading-relaxed ${descriptionStyles}`}>
                {collection.description}
              </p>
              
              <div className="flex items-center gap-3 md:gap-4 group-hover:gap-5 md:group-hover:gap-6 transition-all duration-500">
                <span className={`text-xs md:text-sm uppercase tracking-widest border-b border-transparent ${buttonBorderStyles} pb-1 transition-all`}>
                  Explorar Coleção
                </span>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Link>
  );
}
