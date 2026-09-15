import { useRoute, Link } from 'wouter';
import { useStore } from '@/lib/StoreContext';
import { Navigation } from '@/components/Navigation';
import { ProductGrid } from '@/components/ProductGrid';
import { motion, AnimatePresence } from 'framer-motion';
import { storeConfig } from '@/config/store';
import { Package } from 'lucide-react';

export default function CollectionPage() {
  const [, params] = useRoute('/collection/:id');
  const collectionId = params?.id;
  const { collections, groups } = useStore();
  const collection = collections.find(c => c.id === collectionId);
  const parentGroup = collection?.groupId ? groups.find(g => g.id === collection.groupId) : null;

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#000000" }}>
        <div className="text-center text-white">
          <p className="text-xl font-serif mb-4">Categoria não encontrada</p>
          <Link href="/shop">
            <span className="text-sm underline cursor-pointer" style={{ color: "#c9a96e" }}>
              Ir para a loja →
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const isDark = collection.theme === 'dark';

  const footerBg = isDark ? 'bg-black text-white border-white/10' : 'bg-white text-black border-gray-100';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-black' : 'bg-white'}`}>
      <Navigation forceDark={isDark} />

      {/* Hero */}
      <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        {collection.image ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={collection.id}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.6 }}
              src={collection.image}
              alt={collection.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "#000000" }}>
            <Package className="w-20 h-20 opacity-10" style={{ color: "#c9a96e" }} />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.16) 38%, rgba(0,0,0,0.54) 100%)",
          }}
        />

        {/* Breadcrumb */}
        <div className="absolute top-24 left-6 md:left-12 flex items-center gap-2 text-xs text-gray-300 uppercase tracking-widest">
          <Link href="/"><span className="hover:text-white cursor-pointer transition-colors">Início</span></Link>
          {parentGroup && (
            <>
              <span>/</span>
              <Link href={`/grupo/${parentGroup.id}`}>
                <span className="hover:text-white cursor-pointer transition-colors">{parentGroup.name}</span>
              </Link>
            </>
          )}
          <span>/</span>
          <span style={{ color: "#c9a96e" }}>{collection.title}</span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center px-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={collection.id}
              className="text-center text-white max-w-2xl px-6 py-7 md:px-12 md:py-9 rounded-2xl"
              style={{
                background: "rgba(0,0,0,0.34)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
                textShadow: "0 2px 14px rgba(0,0,0,0.95)",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {parentGroup && (
                <span className="block text-xs tracking-[0.5em] uppercase mb-3 text-white/85">
                  {parentGroup.name}
                </span>
              )}
              <span className="block text-sm tracking-[0.5em] uppercase mb-4 text-white/85">
                Categoria
              </span>
              <h1 className="text-5xl md:text-7xl font-serif mb-4">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="max-w-lg mx-auto text-lg font-light text-white/95 leading-relaxed">
                  {collection.description}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ProductGrid initialCollectionId={collection.id} groupId={collection.groupId ?? undefined} isDark={isDark} />

      <footer className={`${footerBg} py-12 border-t text-center`}>
        {parentGroup && (
          <Link href={`/grupo/${parentGroup.id}`}>
            <span className="text-xs uppercase tracking-widest cursor-pointer hover:opacity-70 transition-opacity block mb-2" style={{ color: "#c9a96e" }}>
              ← Voltar para {parentGroup.name}
            </span>
          </Link>
        )}
        <p className="text-xs uppercase tracking-widest opacity-40">{storeConfig.name} — {collection.title}</p>
      </footer>
    </div>
  );
}
