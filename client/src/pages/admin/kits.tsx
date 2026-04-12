import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useStore } from '@/lib/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Gift, X, Percent, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUploader } from '@/components/ImageUploader';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KitItem {
  productId: string;
  quantity: number;
}

export default function AdminKits() {
  const { kits, products, addKit, updateKit, deleteKit } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);

  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    image: '',
    price: '0',
    promotionPrice: '',
    promotionStartDate: '',
    promotionEndDate: '',
    isActive: true,
    displayOrder: 0,
    items: [] as KitItem[],
  });

  const handleOpen = async (kit?: any) => {
    if (kit) {
      setEditingId(kit.id);
      setFormData({
        name: kit.name,
        description: kit.description || '',
        image: kit.image || '',
        price: kit.price,
        promotionPrice: kit.promotionPrice || '',
        promotionStartDate: kit.promotionStartDate ? new Date(kit.promotionStartDate).toISOString().slice(0, 16) : '',
        promotionEndDate: kit.promotionEndDate ? new Date(kit.promotionEndDate).toISOString().slice(0, 16) : '',
        isActive: kit.isActive ?? true,
        displayOrder: kit.displayOrder || 0,
        items: [],
      });
      setIsDialogOpen(true);
      // Fetch kit items from API since the list only returns kits without items
      setLoadingItems(true);
      try {
        const res = await fetch(`/api/kits/${kit.id}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const items: KitItem[] = (data.items || []).map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
          }));
          setFormData((prev: any) => ({ ...prev, items }));
        }
      } catch (e) {
        console.error('Failed to fetch kit items', e);
      } finally {
        setLoadingItems(false);
      }
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        image: '',
        price: '0',
        promotionPrice: '',
        promotionStartDate: '',
        promotionEndDate: '',
        isActive: true,
        displayOrder: kits.length,
        items: [],
      });
      setIsDialogOpen(true);
    }
  };

  const addProductToKit = (productId: string) => {
    const existing = formData.items.find((i: KitItem) => i.productId === productId);
    if (existing) {
      setFormData({
        ...formData,
        items: formData.items.map((i: KitItem) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, { productId, quantity: 1 }],
      });
    }
  };

  const removeProductFromKit = (productId: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter((i: KitItem) => i.productId !== productId),
    });
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    setFormData({
      ...formData,
      items: formData.items.map((i: KitItem) =>
        i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i
      ),
    });
  };

  const handleSubmit = async () => {
    try {
      const data = {
        ...formData,
        promotionPrice: formData.promotionPrice || null,
        promotionStartDate: formData.promotionStartDate ? new Date(formData.promotionStartDate) : null,
        promotionEndDate: formData.promotionEndDate ? new Date(formData.promotionEndDate) : null,
      };

      if (editingId) {
        await updateKit(editingId, data);
      } else {
        await addKit(data);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save kit:', error);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 'R$ 0,00' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif">Kits & Presentes</h2>
          <p className="text-sm text-gray-500 mt-1">Monte kits combinando produtos para presentes e degustações</p>
        </div>
        <Button
          onClick={() => handleOpen()}
          className="bg-black text-white hover:bg-gray-900 px-6 py-2 rounded-lg gap-2 transition-colors"
          data-testid="button-add-kit"
        >
          <Plus className="w-4 h-4" /> Novo Kit
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {kits.length === 0 && (
          <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
            <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum kit cadastrado ainda.</p>
            <p className="text-xs mt-1">Monte kits combinando produtos para presentear clientes.</p>
          </div>
        )}
        {kits.map(kit => (
          <div key={kit.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex gap-4 items-center">
              {kit.image ? (
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={kit.image} alt={kit.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(201,169,110,0.15)" }}>
                  <Gift className="w-6 h-6" style={{ color: "#c9a96e" }} />
                </div>
              )}
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{kit.name}</h3>
                      {!kit.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inativo</span>
                      )}
                      {kit.promotionPrice && (
                        <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: "rgba(139,26,26,0.1)", color: "#8b1a1a" }}>
                          <Percent className="w-3 h-3" /> Promoção
                        </span>
                      )}
                    </div>
                    {kit.description && <p className="text-sm text-gray-500 mt-0.5">{kit.description}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-medium text-sm">{formatCurrency(kit.price)}</span>
                      {kit.promotionPrice && (
                        <span className="text-sm line-through text-gray-400">{formatCurrency(kit.price)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpen(kit)} data-testid={`button-edit-kit-${kit.id}`}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteKit(kit.id)}
                      className="text-red-500 hover:text-red-700 hover:border-red-300"
                      data-testid={`button-delete-kit-${kit.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? 'Editar Kit' : 'Novo Kit'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Nome do Kit *</label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Kit Vinho & Charuto Premium"
                  data-testid="input-kit-name"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Descrição</label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o kit..."
                  rows={2}
                  data-testid="input-kit-description"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Preço do Kit (R$) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  data-testid="input-kit-price"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Preço Promocional (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.promotionPrice}
                  onChange={e => setFormData({ ...formData, promotionPrice: e.target.value })}
                  placeholder="Deixe vazio para sem promoção"
                  data-testid="input-kit-promotion-price"
                />
              </div>
              {formData.promotionPrice && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Início da Promoção</label>
                    <Input
                      type="datetime-local"
                      value={formData.promotionStartDate}
                      onChange={e => setFormData({ ...formData, promotionStartDate: e.target.value })}
                      data-testid="input-kit-promotion-start"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Fim da Promoção</label>
                    <Input
                      type="datetime-local"
                      value={formData.promotionEndDate}
                      onChange={e => setFormData({ ...formData, promotionEndDate: e.target.value })}
                      data-testid="input-kit-promotion-end"
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Imagem do Kit</label>
              <ImageUploader
                value={formData.image}
                onChange={url => setFormData({ ...formData, image: url })}
                aspectRatio={16/9}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Ordem de Exibição</label>
                <Input
                  type="number"
                  value={formData.displayOrder}
                  onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  data-testid="input-kit-order"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                    data-testid="checkbox-kit-active"
                  />
                  <span className="text-sm text-gray-700">Kit ativo</span>
                </label>
              </div>
            </div>

            {/* Produtos do Kit */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-medium text-gray-700">Produtos do Kit</h4>
                {loadingItems && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
              </div>
              
              {/* Itens já adicionados */}
              {formData.items.length > 0 && (
                <div className="mb-3 space-y-2">
                  {formData.items.map((item: KitItem) => {
                    const product = products.find(p => p.id === item.productId);
                    return (
                      <div key={item.productId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="flex-1 text-sm font-medium">{product?.name || 'Produto removido'}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Qtd:</span>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={e => updateItemQuantity(item.productId, parseInt(e.target.value) || 1)}
                            className="w-16 h-7 text-sm"
                            min={1}
                            data-testid={`input-kit-item-qty-${item.productId}`}
                          />
                        </div>
                        <button
                          onClick={() => removeProductFromKit(item.productId)}
                          className="text-red-400 hover:text-red-600"
                          data-testid={`button-remove-kit-item-${item.productId}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Lista de produtos para adicionar */}
              <div>
                <label className="text-xs text-gray-500 block mb-2">Adicionar produtos ao kit:</label>
                <ScrollArea className="h-40 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {products.map(product => {
                      const isInKit = formData.items.some((i: KitItem) => i.productId === product.id);
                      return (
                        <button
                          key={product.id}
                          onClick={() => addProductToKit(product.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            isInKit
                              ? 'text-gray-400 cursor-default'
                              : 'hover:bg-gray-100 cursor-pointer'
                          }`}
                          disabled={isInKit}
                          data-testid={`button-add-product-to-kit-${product.id}`}
                        >
                          <span className="font-medium">{product.name}</span>
                          <span className="text-gray-400 ml-2">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(product.price))}
                          </span>
                          {isInKit && <span className="text-gray-400 ml-2">(já adicionado)</span>}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                className="flex-1 text-white"
                style={{ backgroundColor: "#1a1a2e" }}
                data-testid="button-save-kit"
              >
                {editingId ? 'Salvar Alterações' : 'Criar Kit'}
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel-kit">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
