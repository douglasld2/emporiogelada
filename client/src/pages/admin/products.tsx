import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useStore } from '@/lib/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, X, Tag, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageUploader, MultiImageUploader } from '@/components/ImageUploader';
import type { Product } from '@shared/schema';

const DEFAULT_VARIANTS = ['Unidade', '375ml', '500ml', '750ml', '1L', '1,5L'];

interface SizeQuantity {
  [size: string]: number;
}

interface SizePrices {
  [size: string]: string;
}

export default function AdminProducts() {
  const { products, collections, groups, addProduct, deleteProduct, updateProduct } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCollection, setFilterCollection] = useState<string>('all');
  
  const [formData, setFormData] = useState<any>({
    name: '',
    image: '',
    images: [] as string[],
    collectionId: '',
    description: '',
    sizes: {} as SizeQuantity,
    sizePrices: {} as SizePrices,
    productDetails: '',
    shippingReturns: '',
    brand: '',
    volume: '',
    alcoholContent: '',
    origin: '',
    isKit: false,
    isActive: true,
    weight: '0.5',
    height: '10',
    width: '15',
    length: '20',
    minStock: '',
  });

  const [newSizeLabel, setNewSizeLabel] = useState('');
  const [customSizes, setCustomSizes] = useState<string[]>([]);

  const handleOpen = (product?: Product) => {
    if (product) {
      let parsedSizes: SizeQuantity = {};
      if (product.sizes) {
        try {
          parsedSizes = JSON.parse(product.sizes);
        } catch {
          parsedSizes = {};
        }
      }

      let parsedSizePrices: SizePrices = {};
      if ((product as any).sizePrices) {
        try {
          parsedSizePrices = JSON.parse((product as any).sizePrices);
        } catch {
          parsedSizePrices = {};
        }
      }
      
      const existingCustomSizes = Object.keys(parsedSizes).filter(s => !DEFAULT_VARIANTS.includes(s));
      setCustomSizes(existingCustomSizes);
      
      setEditingId(product.id);
      setFormData({
        name: product.name,
        image: product.image,
        images: product.images || [],
        collectionId: product.collectionId,
        description: product.description || '',
        sizes: parsedSizes,
        sizePrices: parsedSizePrices,
        productDetails: product.productDetails || '',
        shippingReturns: product.shippingReturns || '',
        brand: product.brand || '',
        volume: product.volume || '',
        alcoholContent: product.alcoholContent || '',
        origin: product.origin || '',
        isKit: product.isKit || false,
        isActive: product.isActive ?? true,
        weight: product.weight ?? '0.5',
        height: product.height ?? '10',
        width: product.width ?? '15',
        length: product.length ?? '20',
        minStock: (product as any).minStock != null ? String((product as any).minStock) : '',
      });
    } else {
      setEditingId(null);
      setCustomSizes([]);
      setFormData({ 
        name: '', 
        image: '', 
        images: [],
        collectionId: collections[0]?.id || '',
        description: '',
        sizes: {},
        sizePrices: {},
        productDetails: '',
        shippingReturns: '',
        brand: '',
        volume: '',
        alcoholContent: '',
        origin: '',
        isKit: false,
        isActive: true,
        minStock: '',
      });
    }
    setNewSizeLabel('');
    setIsDialogOpen(true);
  };

  const handleSizeQuantityChange = (size: string, quantity: string) => {
    const qty = Math.max(0, parseInt(quantity) || 0);
    setFormData({ ...formData, sizes: { ...formData.sizes, [size]: qty } });
  };

  const handleSizePriceChange = (size: string, price: string) => {
    setFormData({ ...formData, sizePrices: { ...formData.sizePrices, [size]: price } });
  };

  const handleAddCustomSize = () => {
    const label = newSizeLabel.trim();
    if (label && !DEFAULT_VARIANTS.includes(label) && !customSizes.includes(label)) {
      setCustomSizes([...customSizes, label]);
      setFormData({ ...formData, sizes: { ...formData.sizes, [label]: 1 } });
      setNewSizeLabel('');
    }
  };

  const handleRemoveCustomSize = (size: string) => {
    setCustomSizes(customSizes.filter(s => s !== size));
    const newSizes = { ...formData.sizes };
    delete newSizes[size];
    const newSizePrices = { ...formData.sizePrices };
    delete newSizePrices[size];
    setFormData({ ...formData, sizes: newSizes, sizePrices: newSizePrices });
  };

  const handleSubmit = async () => {
    try {
      // Save ALL size keys (including qty=0) so stock tracking works correctly.
      // A product with sizes defined but all at 0 = out of stock.
      // A product with NO sizes at all = unlimited (no stock tracking).
      const allSizeKeys = Object.keys(formData.sizes);
      const sizesJson: SizeQuantity = {};
      allSizeKeys.forEach(k => { sizesJson[k] = typeof formData.sizes[k] === 'number' ? formData.sizes[k] : 0; });
      const hasSizes = allSizeKeys.length > 0;

      // Build sizePrices — only include sizes that have a price set
      const sizePricesObj: SizePrices = {};
      allSizeKeys.forEach(k => {
        const p = formData.sizePrices?.[k];
        if (p && p.toString().trim() !== '') sizePricesObj[k] = p.toString().trim();
      });
      const hasSizePrices = Object.keys(sizePricesObj).length > 0;

      if (!formData.name.trim()) {
        alert('Informe o nome do produto.');
        return;
      }
      if (!hasSizePrices) {
        alert('Defina o preço de pelo menos uma variação na seção "Variações, Preço e Estoque".');
        return;
      }

      // Derive canonical price from first variation that has a price (legacy field)
      const derivedPrice = Object.values(sizePricesObj)[0]?.toString() || '0';

      const productData: any = {
        name: formData.name,
        price: derivedPrice,
        image: formData.image,
        images: formData.images.length > 0 ? formData.images : null,
        collectionId: formData.collectionId,
        description: formData.description || null,
        sizes: hasSizes ? JSON.stringify(sizesJson) : null,
        sizePrices: hasSizePrices ? JSON.stringify(sizePricesObj) : null,
        productDetails: formData.productDetails || null,
        shippingReturns: formData.shippingReturns || null,
        brand: formData.brand || null,
        volume: formData.volume || null,
        alcoholContent: formData.alcoholContent || null,
        origin: formData.origin || null,
        isKit: formData.isKit,
        isActive: formData.isActive,
        weight: formData.weight ? formData.weight.toString() : '0.5',
        height: formData.height ? formData.height.toString() : '10',
        width: formData.width ? formData.width.toString() : '15',
        length: formData.length ? formData.length.toString() : '20',
        minStock: formData.minStock !== '' ? parseInt(formData.minStock) : null,
        stockAlertSent: false,
      };

      if (editingId) {
        await updateProduct(editingId, productData);
      } else {
        await addProduct(productData);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  const getTotalStock = (product: Product) => {
    if (product.sizes) {
      try {
        const sizes = JSON.parse(product.sizes) as SizeQuantity;
        const keys = Object.keys(sizes);
        if (keys.length === 0) return '-';
        return keys.reduce((sum, k) => sum + (sizes[k] || 0), 0);
      } catch {
        return '-';
      }
    }
    const s = (product as any).stock;
    if (s != null) return s;
    return '-';
  };

  const isOutOfStock = (product: Product) => {
    const total = getTotalStock(product);
    return typeof total === 'number' && total === 0;
  };

  const isLowStock = (product: Product) => {
    const total = getTotalStock(product);
    const minStock = (product as any).minStock;
    return typeof total === 'number' && total > 0 && minStock != null && total <= minStock;
  };

  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const getCollectionLabel = (collectionId: string) => {
    const col = collections.find(c => c.id === collectionId);
    if (!col) return collectionId;
    const group = groups.find(g => g.id === col.groupId);
    return group ? `${group.name} > ${col.title}` : col.title;
  };

  const filteredProducts = filterCollection === 'all'
    ? products
    : products.filter(p => p.collectionId === filterCollection);

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif">Produtos</h2>
          <p className="text-sm text-gray-500 mt-1">{products.length} produto(s) cadastrado(s)</p>
        </div>
        <Button onClick={() => handleOpen()} className="bg-black text-white hover:bg-gray-900 px-6 py-2 rounded-lg gap-2 transition-colors" data-testid="button-add-product">
          <Plus className="w-4 h-4" /> Adicionar Produto
        </Button>
      </div>

      {/* Filter */}
      {collections.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setFilterCollection('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCollection === 'all' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={filterCollection === 'all' ? { backgroundColor: "#1a1a2e" } : {}}
          >
            Todos ({products.length})
          </button>
          {collections.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterCollection(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCollection === c.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={filterCollection === c.id ? { backgroundColor: "#1a1a2e" } : {}}
            >
              {c.title} ({products.filter(p => p.collectionId === c.id).length})
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Produto</th>
              <th className="px-4 py-3 font-medium text-gray-700 hidden md:table-cell">Subgrupo</th>
              <th className="px-4 py-3 font-medium text-gray-700">Preço</th>
              <th className="px-4 py-3 font-medium text-gray-700 hidden md:table-cell">Estoque</th>
              <th className="px-4 py-3 font-medium text-gray-700 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map(product => (
              <tr key={product.id} className="hover:bg-gray-50/50 transition-colors" data-testid={`row-product-${product.id}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 block text-sm">{product.name}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {product.brand && <span className="text-xs text-gray-400">{product.brand}</span>}
                        {product.volume && <span className="text-xs text-gray-400">• {product.volume}</span>}
                        {(product as any).promotionPrice && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(139,26,26,0.1)", color: "#8b1a1a" }}>
                            PROMO
                          </span>
                        )}
                        {!product.isActive && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                            Inativo
                          </span>
                        )}
                        {isOutOfStock(product) && (
                          <span className="text-xs px-1.5 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: "rgba(139,26,26,0.1)", color: "#8b1a1a" }} data-testid={`badge-admin-out-of-stock-${product.id}`}>
                            <AlertTriangle className="w-3 h-3" />
                            Sem Estoque
                          </span>
                        )}
                        {isLowStock(product) && (
                          <span className="text-xs px-1.5 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: "rgba(201,100,0,0.1)", color: "#c96400" }} data-testid={`badge-admin-low-stock-${product.id}`}>
                            <AlertTriangle className="w-3 h-3" />
                            Estoque Baixo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                  {getCollectionLabel(product.collectionId)}
                </td>
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium">{formatPrice(product.price)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={
                    isOutOfStock(product)
                      ? 'font-bold text-red-700'
                      : isLowStock(product)
                        ? 'font-semibold'
                        : 'text-gray-600'
                  } style={isLowStock(product) ? { color: '#c96400' } : {}}>
                    {getTotalStock(product)}
                    {(product as any).minStock != null && (
                      <span className="text-xs font-normal ml-1 text-gray-400">/ mín {(product as any).minStock}</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleOpen(product)} 
                      className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 transition-all rounded-lg"
                      data-testid={`button-edit-product-${product.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm('Tem certeza que deseja excluir este produto?')) {
                          await deleteProduct(product.id);
                        }
                      }} 
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg"
                      data-testid={`button-delete-product-${product.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum produto encontrado.</p>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-xl max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-5 py-4">
              {/* Nome e Subgrupo */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nome do Produto *</label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Vinho Tinto Cabernet Sauvignon..."
                    data-testid="input-name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Subgrupo *</label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:ring-1 focus:ring-gray-400"
                    value={formData.collectionId}
                    onChange={e => setFormData({...formData, collectionId: e.target.value})}
                    data-testid="select-collection"
                  >
                    {collections.map(c => (
                      <option key={c.id} value={c.id}>
                        {groups.find(g => g.id === c.groupId)?.name
                          ? `${groups.find(g => g.id === c.groupId)?.name} > ${c.title}`
                          : c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campos específicos para bebidas/tabacaria */}
              <div className="border rounded-lg p-4 space-y-3" style={{ borderColor: "rgba(201,169,110,0.3)", backgroundColor: "rgba(201,169,110,0.03)" }}>
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Informações do Produto</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Marca</label>
                    <Input 
                      value={formData.brand} 
                      onChange={e => setFormData({...formData, brand: e.target.value})}
                      placeholder="Ex: Don Perignon, Cohiba..."
                      data-testid="input-brand"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Volume / Tamanho</label>
                    <Input 
                      value={formData.volume} 
                      onChange={e => setFormData({...formData, volume: e.target.value})}
                      placeholder="Ex: 750ml, Pacote c/ 10..."
                      data-testid="input-volume"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Teor Alcoólico</label>
                    <Input 
                      value={formData.alcoholContent} 
                      onChange={e => setFormData({...formData, alcoholContent: e.target.value})}
                      placeholder="Ex: 13,5%, 40%, N/A..."
                      data-testid="input-alcohol-content"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Origem</label>
                    <Input 
                      value={formData.origin} 
                      onChange={e => setFormData({...formData, origin: e.target.value})}
                      placeholder="Ex: França, Cuba, Brasil..."
                      data-testid="input-origin"
                    />
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Descrição</label>
                <Textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Descrição do produto..."
                  rows={3}
                  data-testid="input-description"
                />
              </div>

              {/* Imagens */}
              <ImageUploader
                value={formData.image}
                onChange={(url) => setFormData({...formData, image: url})}
                aspectRatio={1}
                label="Imagem Principal"
              />

              <MultiImageUploader
                values={formData.images}
                onChange={(urls) => setFormData({...formData, images: urls})}
                aspectRatio={1}
                label="Imagens Adicionais"
              />

              {/* Variações de Estoque */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Variações, Preço e Estoque *</label>
                <p className="text-[11px] text-gray-400 -mt-1">Informe o preço de cada variação disponível. Pelo menos uma variação deve ter preço definido.</p>
                {/* Header */}
                <div className="grid gap-2" style={{ gridTemplateColumns: '6rem 1fr 5rem' }}>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Variação</span>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Preço (R$)</span>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Estoque</span>
                </div>
                <div className="space-y-1.5">
                  {DEFAULT_VARIANTS.map(size => (
                    <div key={size} className="grid items-center gap-2" style={{ gridTemplateColumns: '6rem 1fr 5rem' }}>
                      <span className="text-xs font-medium text-gray-600 truncate">{size}</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.sizePrices?.[size] || ''}
                        onChange={e => handleSizePriceChange(size, e.target.value)}
                        placeholder="0.00"
                        className="h-8 text-sm"
                        data-testid={`input-size-price-${size}`}
                      />
                      <Input
                        type="number"
                        min="0"
                        value={formData.sizes[size] ?? 0}
                        onChange={e => handleSizeQuantityChange(size, e.target.value)}
                        className="h-8 text-sm"
                        data-testid={`input-size-${size}`}
                      />
                    </div>
                  ))}
                  {customSizes.map(size => (
                    <div key={size} className="grid items-center gap-2" style={{ gridTemplateColumns: '6rem 1fr 5rem auto' }}>
                      <span className="text-xs font-medium truncate" style={{ color: "#c9a96e" }}>{size}</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.sizePrices?.[size] || ''}
                        onChange={e => handleSizePriceChange(size, e.target.value)}
                        placeholder="0.00"
                        className="h-8 text-sm"
                        data-testid={`input-size-price-${size}`}
                      />
                      <Input
                        type="number"
                        min="0"
                        value={formData.sizes[size] ?? 0}
                        onChange={e => handleSizeQuantityChange(size, e.target.value)}
                        className="h-8 text-sm"
                        data-testid={`input-size-${size}`}
                      />
                      <button type="button" onClick={() => handleRemoveCustomSize(size)} className="text-red-400 hover:text-red-600" data-testid={`button-remove-size-${size}`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newSizeLabel}
                    onChange={e => setNewSizeLabel(e.target.value)}
                    placeholder="Nova variação (ex: 2L, Caixa c/ 6)"
                    className="flex-1 h-8 text-sm"
                    data-testid="input-new-size"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSize())}
                  />
                  <Button type="button" onClick={handleAddCustomSize} className="bg-gray-100 text-gray-700 hover:bg-gray-200 h-8 px-2" data-testid="button-add-size">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Stock alert */}
              <div className="border rounded-lg p-4 space-y-2" style={{ borderColor: "rgba(201,169,110,0.3)", backgroundColor: "rgba(201,169,110,0.03)" }}>
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#c9a96e" }} />
                  Alerta de Estoque
                </h4>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Estoque Mínimo para Alerta</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={e => setFormData({ ...formData, minStock: e.target.value })}
                    placeholder="Ex: 5"
                    className="h-9 text-sm"
                    data-testid="input-min-stock"
                  />
                  <p className="text-[10px] text-gray-400">Envia email ao administrador quando o estoque atingir esse número. Deixe vazio para não receber alertas.</p>
                </div>
              </div>

              {/* Detalhes adicionais */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Ficha Técnica / Detalhes</label>
                <Textarea 
                  value={formData.productDetails} 
                  onChange={e => setFormData({...formData, productDetails: e.target.value})}
                  rows={3}
                  data-testid="input-product-details"
                  placeholder="• Uva: Cabernet Sauvignon&#10;• Safra: 2020&#10;• Temperatura de serviço: 16-18°C"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Envio e Devoluções</label>
                <Textarea 
                  value={formData.shippingReturns} 
                  onChange={e => setFormData({...formData, shippingReturns: e.target.value})}
                  rows={2}
                  data-testid="input-shipping-returns"
                  placeholder="Envio seguro com proteção para fragéis..."
                />
              </div>

              {/* Dimensões para frete */}
              <div className="border rounded-lg p-4 space-y-3" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Dimensões para Frete</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Peso (kg)</label>
                    <Input
                      type="number" step="0.001" min="0"
                      value={formData.weight}
                      onChange={e => setFormData({...formData, weight: e.target.value})}
                      placeholder="0.500"
                      data-testid="input-weight"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Altura (cm)</label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={formData.height}
                      onChange={e => setFormData({...formData, height: e.target.value})}
                      placeholder="10"
                      data-testid="input-height"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Largura (cm)</label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={formData.width}
                      onChange={e => setFormData({...formData, width: e.target.value})}
                      placeholder="15"
                      data-testid="input-width"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Comprimento (cm)</label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={formData.length}
                      onChange={e => setFormData({...formData, length: e.target.value})}
                      placeholder="20"
                      data-testid="input-length"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="product-active"
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4"
                  data-testid="checkbox-product-active"
                />
                <label htmlFor="product-active" className="text-sm text-gray-700">Produto ativo</label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={() => setIsDialogOpen(false)} className="flex-1 bg-gray-100 text-gray-900 hover:bg-gray-200" data-testid="button-cancel">
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} className="flex-1 text-white" style={{ backgroundColor: "#1a1a2e" }} data-testid="button-submit">
                  {editingId ? 'Atualizar Produto' : 'Criar Produto'}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
