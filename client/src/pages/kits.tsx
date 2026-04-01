import { Link } from 'wouter';
import { Navigation } from '@/components/Navigation';
import { useKitsWithItems } from '@/lib/api';
import { storeConfig } from '@/config/store';
import { motion } from 'framer-motion';
import { Gift, Package, ShoppingCart, Tag, Phone } from 'lucide-react';
import logoImg from '/logo.png';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/lib/CartContext';

export default function KitsPage() {
  const { data: kitsData = [], isLoading } = useKitsWithItems();
  const { toast } = useToast();
  const { addKitToCart } = useCart();

  const formatPrice = (price: string | number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(price));

  const handleAddKit = async (kit: any, items: any[]) => {
    if (!items || items.length === 0) {
      toast({ title: 'Kit sem produtos', description: 'Este kit não possui produtos cadastrados.', variant: 'destructive' });
      return;
    }
    try {
      const anchorProduct = items[0]?.product;
      if (!anchorProduct) {
        toast({ title: 'Erro', description: 'Kit sem produto válido.', variant: 'destructive' });
        return;
      }
      await addKitToCart(kit, anchorProduct, 1);
      toast({
        title: 'Kit adicionado! 🎁',
        description: `${kit.name} adicionado ao carrinho.`,
      });
    } catch {
      toast({
        title: 'Erro ao adicionar kit',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#000000" }}>
      <Navigation />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-6 text-center text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #c9a96e 0%, transparent 70%)' }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.4)' }}
          >
            <Gift className="w-8 h-8" style={{ color: '#c9a96e' }} />
          </div>
          <span className="text-xs uppercase tracking-[0.5em] block mb-3" style={{ color: '#c9a96e' }}>
            Combinações exclusivas
          </span>
          <h1 className="text-5xl md:text-6xl font-serif mb-4">Kits & Presentes</h1>
          <p className="text-gray-400 max-w-xl mx-auto text-lg">
            Seleções especiais curadas pelo Empório Gelada para cada ocasião — churrasco, conveniência e muito mais.
          </p>
        </motion.div>
      </section>

      {/* Kits Grid */}
      <section className="container mx-auto px-6 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', height: 500 }}
              />
            ))}
          </div>
        ) : kitsData.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-serif">Nenhum kit disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {kitsData.map(({ kit, items }, idx) => (
              <motion.div
                key={kit.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(201,169,110,0.15)',
                }}
              >
                {/* Kit Image */}
                <div className="relative" style={{ height: 260 }}>
                  {kit.image ? (
                    <img
                      src={kit.image}
                      alt={kit.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: '#000000' }}
                    >
                      <Gift className="w-16 h-16 opacity-20" style={{ color: '#c9a96e' }} />
                    </div>
                  )}
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(16,16,40,0.95) 100%)' }}
                  />
                  {kit.promotionPrice && (
                    <div
                      className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold"
                      style={{ backgroundColor: '#8b1a1a', color: 'white' }}
                    >
                      PROMOÇÃO
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h2 className="text-2xl font-serif text-white mb-1">{kit.name}</h2>
                    <p className="text-gray-300 text-sm line-clamp-2">{kit.description}</p>
                  </div>
                </div>

                {/* Kit Content */}
                <div className="p-6 flex flex-col flex-1">
                  {/* Items list */}
                  {items.length > 0 && (
                    <div className="mb-6">
                      <span className="text-xs uppercase tracking-widest block mb-3" style={{ color: '#c9a96e' }}>
                        O que está incluído:
                      </span>
                      <ul className="space-y-2">
                        {items.map((item: any) => (
                          <li key={item.id} className="flex items-center gap-3 text-sm text-gray-300">
                            <div
                              className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0"
                              style={{ border: '1px solid rgba(201,169,110,0.2)' }}
                            >
                              {item.product?.image ? (
                                <img
                                  src={item.product.image}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center"
                                  style={{ backgroundColor: 'rgba(201,169,110,0.05)' }}
                                >
                                  <Package className="w-4 h-4 opacity-50" style={{ color: '#c9a96e' }} />
                                </div>
                              )}
                            </div>
                            <span className="flex-1 truncate">{item.product?.name}</span>
                            {item.quantity > 1 && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: 'rgba(201,169,110,0.15)', color: '#c9a96e' }}
                              >
                                x{item.quantity}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Price + CTA */}
                  <div className="mt-auto">
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        {kit.promotionPrice ? (
                          <>
                            <span className="text-gray-500 line-through text-sm block">
                              {formatPrice(kit.price)}
                            </span>
                            <span className="text-3xl font-serif font-bold" style={{ color: '#c9a96e' }}>
                              {formatPrice(kit.promotionPrice)}
                            </span>
                          </>
                        ) : (
                          <span className="text-3xl font-serif font-bold" style={{ color: '#c9a96e' }}>
                            {formatPrice(kit.price)}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 block mt-0.5">kit completo</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Tag className="w-3 h-3" />
                        <span>{items.length} iten{items.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddKit(kit, items)}
                      className="w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                      style={{ backgroundColor: '#c9a96e', color: '#000000' }}
                      data-testid={`btn-add-kit-${kit.id}`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Adicionar ao Carrinho
                    </button>

                    <a
                      href={`https://wa.me/${storeConfig.contact.phoneClean}?text=Olá! Tenho interesse no ${encodeURIComponent(kit.name)} por ${formatPrice(kit.price)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mt-2 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-80"
                      style={{ border: '1px solid rgba(201,169,110,0.3)', color: '#c9a96e' }}
                      data-testid={`btn-whatsapp-kit-${kit.id}`}
                    >
                      <Phone className="w-4 h-4" />
                      Consultar via WhatsApp
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* CTA bottom */}
        <div className="text-center mt-16 py-12" style={{ borderTop: '1px solid rgba(201,169,110,0.1)' }}>
          <p className="text-gray-400 mb-4">Não encontrou o kit ideal?</p>
          <p className="text-white font-serif text-lg mb-6">Montamos kits personalizados para você.</p>
          <a
            href={`https://wa.me/${storeConfig.contact.phoneClean}?text=Olá! Gostaria de montar um kit personalizado.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium text-sm transition-all hover:brightness-110"
            style={{ backgroundColor: '#8b1a1a', color: 'white' }}
          >
            <Phone className="w-4 h-4" />
            Falar com um consultor
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center" style={{ borderTop: '1px solid rgba(201,169,110,0.1)' }}>
        <div className="flex justify-center mb-4">
          <img src={logoImg} alt={storeConfig.name} className="h-10 w-auto object-contain opacity-30" />
        </div>
        <Link href="/shop">
          <span className="text-xs uppercase tracking-widest cursor-pointer text-gray-500 hover:text-gray-300 transition-colors">
            Ver todos os produtos →
          </span>
        </Link>
      </footer>
    </div>
  );
}
