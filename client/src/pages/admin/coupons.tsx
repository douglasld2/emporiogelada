import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/lib/StoreContext';
import type { Coupon } from '@shared/schema';

interface CouponFormData {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  minOrderAmount: string;
  maxUsageCount: string;
  appliesTo: 'all' | 'products' | 'collections';
  productIds: string[];
  collectionIds: string[];
  freeShipping: boolean;
  startDate: string;
  expiresAt: string;
  isActive: boolean;
}

const defaultFormData: CouponFormData = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '10',
  minOrderAmount: '',
  maxUsageCount: '',
  appliesTo: 'all',
  productIds: [],
  collectionIds: [],
  freeShipping: false,
  startDate: '',
  expiresAt: '',
  isActive: true,
};

export default function AdminCoupons() {
  const queryClient = useQueryClient();
  const { products, collections } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(defaultFormData);
  const [selectedCouponStats, setSelectedCouponStats] = useState<any>(null);

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ['/api/admin/coupons'],
    queryFn: async () => {
      const res = await fetch('/api/admin/coupons', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch coupons');
      return res.json();
    },
  });

  const { data: couponStats = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/coupons-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/coupons-stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create coupon');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] });
      setIsDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update coupon');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] });
      setIsDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete coupon');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] });
    },
  });

  const handleOpen = (coupon?: Coupon) => {
    if (coupon) {
      setEditingId(coupon.id);
      setFormData({
        code: coupon.code,
        description: coupon.description || '',
        discountType: coupon.discountType as 'percentage' | 'fixed',
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount || '',
        maxUsageCount: coupon.maxUsageCount?.toString() || '',
        appliesTo: coupon.appliesTo as 'all' | 'products' | 'collections',
        productIds: coupon.productIds || [],
        collectionIds: coupon.collectionIds || [],
        freeShipping: coupon.freeShipping || false,
        startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().slice(0, 16) : '',
        expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : '',
        isActive: coupon.isActive,
      });
    } else {
      setEditingId(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const data = {
      code: formData.code.toUpperCase(),
      description: formData.description || null,
      discountType: formData.discountType,
      discountValue: formData.discountValue,
      minOrderAmount: formData.minOrderAmount || null,
      maxUsageCount: formData.maxUsageCount ? parseInt(formData.maxUsageCount) : null,
      appliesTo: formData.appliesTo,
      productIds: formData.appliesTo === 'products' ? formData.productIds : null,
      collectionIds: formData.appliesTo === 'collections' ? formData.collectionIds : null,
      freeShipping: formData.freeShipping,
      startDate: formData.startDate ? new Date(formData.startDate) : null,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
      isActive: formData.isActive,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleViewStats = (coupon: Coupon) => {
    const stats = couponStats.find((s: any) => s.couponId === coupon.id);
    setSelectedCouponStats({ coupon, stats });
    setIsStatsDialogOpen(true);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando cupons...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-serif">Cupons de Desconto</h2>
        <Button 
          onClick={() => handleOpen()} 
          className="bg-black text-white hover:bg-gray-900 px-6 py-2 rounded-lg gap-2 transition-colors" 
          data-testid="button-add-coupon"
        >
          <Plus className="w-4 h-4" /> Novo Cupom
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-700">Código</th>
              <th className="px-6 py-4 font-medium text-gray-700">Desconto</th>
              <th className="px-6 py-4 font-medium text-gray-700">Uso</th>
              <th className="px-6 py-4 font-medium text-gray-700">Validade</th>
              <th className="px-6 py-4 font-medium text-gray-700">Status</th>
              <th className="px-6 py-4 font-medium text-gray-700 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Nenhum cupom cadastrado ainda.
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => {
                const stats = couponStats.find((s: any) => s.couponId === coupon.id);
                return (
                  <tr key={coupon.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-mono font-bold text-gray-900">{coupon.code}</span>
                        {coupon.description && (
                          <p className="text-xs text-gray-500 mt-1">{coupon.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {coupon.discountType === 'percentage' 
                        ? `${parseFloat(coupon.discountValue)}%` 
                        : `R$ ${parseFloat(coupon.discountValue).toFixed(2).replace('.', ',')}`}
                      {coupon.appliesTo !== 'all' && (
                        <span className="block text-xs text-gray-400">
                          Aplica em: {coupon.appliesTo === 'products' ? 'Produtos específicos' : 'Coleções específicas'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {coupon.currentUsageCount}/{coupon.maxUsageCount || '∞'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'Sem limite'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        coupon.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {coupon.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleViewStats(coupon)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg"
                          title="Ver estatísticas"
                          data-testid={`button-stats-coupon-${coupon.id}`}
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpen(coupon)} 
                          className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 transition-all rounded-lg"
                          data-testid={`button-edit-coupon-${coupon.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir este cupom?')) {
                              deleteMutation.mutate(coupon.id);
                            }
                          }} 
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg"
                          data-testid={`button-delete-coupon-${coupon.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Código</label>
                <Input 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="EX: PROMO10"
                  className="rounded-lg border border-gray-300 focus:border-black focus:ring-1 focus:ring-black font-mono uppercase"
                  data-testid="input-coupon-code"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select 
                  className="w-full h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={e => setFormData({...formData, isActive: e.target.value === 'active'})}
                  data-testid="select-coupon-status"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Descrição (opcional)</label>
              <Input 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Desconto de lançamento"
                className="rounded-lg border border-gray-300 focus:border-black focus:ring-1 focus:ring-black"
                data-testid="input-coupon-description"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
              <input
                type="checkbox"
                id="freeShipping"
                checked={formData.freeShipping}
                onChange={e => setFormData({...formData, freeShipping: e.target.checked})}
                className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                data-testid="checkbox-free-shipping"
              />
              <label htmlFor="freeShipping" className="flex-1">
                <span className="text-sm font-medium text-gray-900">Frete Grátis</span>
                <p className="text-xs text-gray-500">Este cupom oferece frete grátis ao cliente</p>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tipo de Desconto</label>
                <select 
                  className="w-full h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  value={formData.discountType}
                  onChange={e => setFormData({...formData, discountType: e.target.value as 'percentage' | 'fixed'})}
                  data-testid="select-discount-type"
                >
                  <option value="percentage">Porcentagem (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Valor {formData.discountType === 'percentage' ? '(%)' : '(R$)'}
                </label>
                <Input 
                  type="number"
                  step={formData.discountType === 'percentage' ? '1' : '0.01'}
                  value={formData.discountValue} 
                  onChange={e => setFormData({...formData, discountValue: e.target.value})}
                  className="rounded-lg border border-gray-300 focus:border-black focus:ring-1 focus:ring-black"
                  data-testid="input-discount-value"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Pedido Mínimo (R$)</label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.minOrderAmount} 
                  onChange={e => setFormData({...formData, minOrderAmount: e.target.value})}
                  placeholder="Opcional"
                  className="rounded-lg border border-gray-300 focus:border-black focus:ring-1 focus:ring-black"
                  data-testid="input-min-order"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Limite de Uso</label>
                <Input 
                  type="number"
                  value={formData.maxUsageCount} 
                  onChange={e => setFormData({...formData, maxUsageCount: e.target.value})}
                  placeholder="Ilimitado"
                  className="rounded-lg border border-gray-300 focus:border-black focus:ring-1 focus:ring-black"
                  data-testid="input-max-usage"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Aplica em</label>
              <select 
                className="w-full h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:border-black focus:ring-1 focus:ring-black transition-colors"
                value={formData.appliesTo}
                onChange={e => setFormData({...formData, appliesTo: e.target.value as 'all' | 'products' | 'collections'})}
                data-testid="select-applies-to"
              >
                <option value="all">Todos os produtos</option>
                <option value="products">Produtos específicos</option>
                <option value="collections">Coleções específicas</option>
              </select>
            </div>

            {formData.appliesTo === 'products' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Selecione os Produtos</label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {products.map(product => (
                    <label key={product.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.productIds.includes(product.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setFormData({...formData, productIds: [...formData.productIds, product.id]});
                          } else {
                            setFormData({...formData, productIds: formData.productIds.filter(id => id !== product.id)});
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{product.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formData.appliesTo === 'collections' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Selecione as Coleções</label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {collections.map(collection => (
                    <label key={collection.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.collectionIds.includes(collection.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setFormData({...formData, collectionIds: [...formData.collectionIds, collection.id]});
                          } else {
                            setFormData({...formData, collectionIds: formData.collectionIds.filter(id => id !== collection.id)});
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{collection.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Válido a partir de</label>
                <Input 
                  type="datetime-local"
                  value={formData.startDate} 
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                  className="rounded-lg border border-gray-300 focus:border-black focus:ring-1 focus:ring-black"
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Expira em</label>
                <Input 
                  type="datetime-local"
                  value={formData.expiresAt} 
                  onChange={e => setFormData({...formData, expiresAt: e.target.value})}
                  className="rounded-lg border border-gray-300 focus:border-black focus:ring-1 focus:ring-black"
                  data-testid="input-expires-at"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => setIsDialogOpen(false)} 
                className="flex-1 bg-gray-200 text-gray-900 hover:bg-gray-300 rounded-lg py-2 transition-colors font-medium"
                data-testid="button-cancel-coupon"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-black text-white hover:bg-gray-900 rounded-lg py-2 transition-colors font-medium"
                data-testid="button-submit-coupon"
              >
                {editingId ? 'Atualizar' : 'Criar Cupom'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Estatísticas do Cupom</DialogTitle>
          </DialogHeader>
          {selectedCouponStats && (
            <div className="py-4 space-y-4">
              <div className="text-center mb-6">
                <span className="font-mono text-2xl font-bold">{selectedCouponStats.coupon.code}</span>
                {selectedCouponStats.coupon.description && (
                  <p className="text-sm text-gray-500 mt-1">{selectedCouponStats.coupon.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedCouponStats.stats?.totalRedemptions || 0}
                  </div>
                  <div className="text-sm text-gray-500">Usos</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    R$ {(selectedCouponStats.stats?.totalOrderValue || 0).toFixed(2).replace('.', ',')}
                  </div>
                  <div className="text-sm text-gray-500">Valor Gerado</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    R$ {(selectedCouponStats.stats?.totalDiscount || 0).toFixed(2).replace('.', ',')}
                  </div>
                  <div className="text-sm text-gray-500">Desconto Total</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-gray-700 mb-2">Detalhes do Cupom</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Tipo:</div>
                  <div>{selectedCouponStats.coupon.discountType === 'percentage' ? 'Porcentagem' : 'Valor Fixo'}</div>
                  <div className="text-gray-500">Desconto:</div>
                  <div>
                    {selectedCouponStats.coupon.discountType === 'percentage' 
                      ? `${parseFloat(selectedCouponStats.coupon.discountValue)}%`
                      : `R$ ${parseFloat(selectedCouponStats.coupon.discountValue).toFixed(2)}`}
                  </div>
                  <div className="text-gray-500">Limite de Uso:</div>
                  <div>{selectedCouponStats.coupon.maxUsageCount || 'Ilimitado'}</div>
                  <div className="text-gray-500">Usos Restantes:</div>
                  <div>
                    {selectedCouponStats.coupon.maxUsageCount 
                      ? selectedCouponStats.coupon.maxUsageCount - selectedCouponStats.coupon.currentUsageCount
                      : 'Ilimitado'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
