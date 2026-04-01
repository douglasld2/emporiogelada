import { Navigation } from '@/components/Navigation';
import { ProductGrid } from '@/components/ProductGrid';
import { storeConfig } from '@/config/store';

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-white pt-32">
      <Navigation />
      
      <div className="container mx-auto px-6 mb-12 text-center">
        <h1 className="text-5xl font-serif mb-4">Loja</h1>
        <p className="text-gray-500 uppercase tracking-widest text-sm">Seleção Exclusiva</p>
      </div>

      <ProductGrid initialCollectionId="all" />
      
      <footer className="bg-black text-white py-24 mt-24">
         <div className="container mx-auto px-6 text-center">
           <h2 className="text-4xl font-serif opacity-50 mb-8">{storeConfig.shortName}</h2>
         </div>
      </footer>
    </div>
  );
}
