import { useRoute, Link } from 'wouter';
import { useStore } from '@/lib/StoreContext';
import { Navigation } from '@/components/Navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Package, Zap, RotateCcw } from 'lucide-react';
import logoImg from '/logo.png';
import { storeConfig } from '@/config/store';

function promoLabel(promo: any): string {
  if (!promo) return '';
  if (promo.discountType === 'percentage') return `${Number(promo.discountValue)}% OFF`;
  return `R$ ${Number(promo.discountValue).toFixed(2).replace('.', ',')} OFF`;
}

function getCollectionPromo(activePromotions: any[], collectionId: string, groupId: string): any | null {
  return activePromotions.find(p =>
    p.targetType === 'all' ||
    (p.targetType === 'collection' && p.targetId === collectionId) ||
    (p.targetType === 'group' && p.targetId === groupId)
  ) ?? null;
}

export default function GroupPage() {
  const [, params] = useRoute('/grupo/:id');
  const groupId = params?.id;
  const { groups, collections, products, activePromotions } = useStore();

  const group = groups.find(g => g.id === groupId);
  const subgroups = collections
    .filter(c => c.groupId === groupId)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#000000" }}>
        <div className="text-center text-white">
          <p className="text-xl font-serif mb-4">Grupo não encontrado</p>
          <Link href="/shop">
            <span className="text-sm underline cursor-pointer" style={{ color: "#c9a96e" }}>
              Ir para a loja →
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const getProductCount = (collectionId: string) =>
    products.filter(p => p.collectionId === collectionId && p.isActive !== false).length;

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        {group.image ? (
          <img
            src={group.image}
            alt={group.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: "#000000" }} />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 100%)" }}
        />

        {/* Breadcrumb */}
        <div className="absolute top-24 left-6 md:left-12 flex items-center gap-2 text-xs text-gray-300 uppercase tracking-widest">
          <Link href="/"><span className="hover:text-white cursor-pointer transition-colors">Início</span></Link>
          <span>/</span>
          <span style={{ color: "#c9a96e" }}>{group.name}</span>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xs uppercase tracking-[0.4em] mb-4"
            style={{ color: "#c9a96e" }}
          >
            {subgroups.length === 1 ? 'categoria' : 'categorias'}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-serif mb-4"
          >
            {group.name}
          </motion.h1>
          {group.description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-300 max-w-lg text-lg"
            >
              {group.description}
            </motion.p>
          )}
        </div>
      </div>

      {/* Subgroups Grid */}
      <section className="container mx-auto px-6 py-16">
        {subgroups.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-serif mb-2">Nenhuma categoria cadastrada ainda</p>
            <p className="text-sm">As categorias de <strong>{group.name}</strong> aparecerão aqui em breve.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <span className="text-xs uppercase tracking-[0.4em] block mb-2" style={{ color: "#c9a96e" }}>
                Navegue por categoria
              </span>
              <h2 className="text-3xl md:text-4xl font-serif" style={{ color: "#000000" }}>
                Categorias de {group.name}
              </h2>
            </div>

            <div className={`grid gap-6 ${
              subgroups.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
              subgroups.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto' :
              'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {subgroups.map((sub, i) => {
                const count = getProductCount(sub.id);
                const promo = getCollectionPromo(activePromotions, sub.id, groupId!);
                const cashbackPct: number | null = (sub as any).cashbackPct ?? null;
                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                  >
                    <Link href={`/collection/${sub.id}`}>
                      <div className="group relative overflow-hidden rounded-2xl cursor-pointer shadow-md hover:shadow-xl transition-all duration-300">
                        {/* Image */}
                        <div className="relative" style={{ aspectRatio: '4/3' }}>
                          {sub.image ? (
                            <img
                              src={sub.image}
                              alt={sub.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{ backgroundColor: "#000000" }}
                            >
                              <Package className="w-16 h-16 opacity-20" style={{ color: "#c9a96e" }} />
                            </div>
                          )}
                          <div
                            className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-70"
                            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%)" }}
                          />

                          {/* Badges */}
                          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                            {promo && (
                              <div
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                                style={{ backgroundColor: "rgba(139,26,26,0.88)", color: "#ffbbbb", border: "1px solid rgba(139,26,26,0.65)" }}
                              >
                                <Zap className="w-2.5 h-2.5" />
                                {promoLabel(promo)}
                              </div>
                            )}
                            {cashbackPct && cashbackPct > 0 && (
                              <div
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                                style={{ backgroundColor: "rgba(201,169,110,0.15)", color: "#c9a96e", border: "1px solid rgba(201,169,110,0.55)", backdropFilter: "blur(4px)" }}
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                {cashbackPct}% cashback
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                          <h3 className="text-xl md:text-2xl font-serif mb-1">{sub.title}</h3>
                          {sub.description && (
                            <p className="text-sm opacity-70 mb-3 line-clamp-2">{sub.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs opacity-60">
                              {count > 0 ? `${count} produto${count !== 1 ? 's' : ''}` : 'Ver produtos'}
                            </span>
                            <span
                              className="flex items-center gap-1 text-xs font-medium transition-transform duration-200 group-hover:translate-x-1"
                              style={{ color: "#c9a96e" }}
                            >
                              Explorar <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="py-10 text-center border-t border-gray-100">
        <div className="flex justify-center mb-4">
          <img src={logoImg} alt={storeConfig.name} className="h-10 w-auto object-contain opacity-40" />
        </div>
        <Link href="/shop">
          <span className="text-xs uppercase tracking-widest cursor-pointer hover:opacity-70 transition-opacity" style={{ color: "#000000" }}>
            ← Ver todos os produtos
          </span>
        </Link>
      </footer>
    </div>
  );
}
