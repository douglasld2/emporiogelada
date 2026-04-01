import { AdminLayout } from '@/components/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Loader2, 
  Search, 
  Eye, 
  ChevronDown,
  Package,
  Truck,
  CheckCircle,
  Clock,
  X,
  Tag,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Order, OrderItem } from '@shared/schema';

interface OrderWithItems extends Order {
  items: (OrderItem & { productName?: string; productImage?: string })[];
}

const statusOptions = [
  { value: 'pending', label: 'Pendente', color: 'bg-yellow-50 text-yellow-600', icon: Clock },
  { value: 'processing', label: 'Em Preparo', color: 'bg-blue-50 text-blue-600', icon: Package },
  { value: 'shipped', label: 'Enviado', color: 'bg-purple-50 text-purple-600', icon: Truck },
  { value: 'delivered', label: 'Entregue', color: 'bg-green-50 text-green-600', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-50 text-red-600', icon: X },
];

export default function AdminOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const res = await fetch('/api/admin/orders', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: async ({ orderId, status, trackingCode }: { orderId: string; status: string; trackingCode?: string }) => {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, trackingCode }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      if (selectedOrder && updatedOrder.id === selectedOrder.id) {
        setSelectedOrder({ ...selectedOrder, ...updatedOrder });
      }
    },
  });

  const handleSaveTracking = () => {
    if (selectedOrder && trackingCode.trim()) {
      updateStatus({ 
        orderId: selectedOrder.id, 
        status: selectedOrder.status === 'processing' ? 'shipped' : selectedOrder.status, 
        trackingCode: trackingCode.trim() 
      });
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    const res = await fetch(`/api/admin/orders/${orderId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch order details');
    const data = await res.json();
    // API returns { order, items }, merge into single object
    setSelectedOrder({ ...data.order, items: data.items });
    setTrackingCode(data.order.trackingCode || '');
    setDetailsOpen(true);
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const getStatusConfig = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shippingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shippingEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-serif mb-2">Pedidos</h1>
        <p className="text-gray-600">Gerencie os pedidos da sua loja</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por ID, nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-orders"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {statusOptions.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Nenhum pedido encontrado</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm || statusFilter !== 'all' 
                ? 'Tente ajustar os filtros de busca'
                : 'Os pedidos aparecerão aqui quando forem realizados'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Pedido</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map(order => {
                  const statusConfig = getStatusConfig(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50" data-testid={`row-order-${order.id}`}>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">#{order.orderNumber || order.id.slice(0, 8).toUpperCase()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-sm">{order.shippingName}</p>
                          <p className="text-xs text-gray-500">{order.shippingEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 font-medium text-sm">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={order.status}
                          onValueChange={(value) => updateStatus({ orderId: order.id, status: value })}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className={`w-36 text-xs ${statusConfig.color} border-0`} data-testid={`select-status-${order.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(status => (
                              <SelectItem key={status.value} value={status.value}>
                                <div className="flex items-center gap-2">
                                  <status.icon className="w-3 h-3" />
                                  {status.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchOrderDetails(order.id)}
                          data-testid={`button-view-order-${order.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              Pedido #{selectedOrder?.orderNumber || selectedOrder?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</h4>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(value) => updateStatus({ orderId: selectedOrder.id, status: value, trackingCode: trackingCode || undefined })}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className={`w-36 text-xs ${getStatusConfig(selectedOrder.status).color} border-0`} data-testid="select-status-modal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <status.icon className="w-3 h-3" />
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Data do Pedido</h4>
                  <p className="text-sm">{format(new Date(selectedOrder.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Código de Rastreio</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: BR123456789BR"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    className="flex-1"
                    data-testid="input-tracking-code"
                  />
                  <Button
                    onClick={handleSaveTracking}
                    disabled={isUpdating || !trackingCode.trim()}
                    size="sm"
                    data-testid="button-save-tracking"
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4 mr-1" />}
                    {selectedOrder.status === 'processing' ? 'Enviar e Notificar' : 'Salvar Rastreio'}
                  </Button>
                </div>
                {selectedOrder.trackingCode && (
                  <p className="text-xs text-gray-500 mt-2">
                    Código atual: <span className="font-mono font-medium">{selectedOrder.trackingCode}</span>
                    {' • '}
                    <a 
                      href={`https://www.linkcorreios.com.br/?id=${selectedOrder.trackingCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Rastrear
                    </a>
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Ao adicionar o código de rastreio e clicar em "{selectedOrder.status === 'processing' ? 'Enviar e Notificar' : 'Salvar Rastreio'}", 
                  o cliente receberá um email com o código de rastreio.
                </p>
              </div>

              {selectedOrder.shippingMethod?.toLowerCase().includes('loggi') && (
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#c9a96e]" />
                    Loggi - Envio Express
                  </h4>
                  <div className="space-y-2">
                    {!(selectedOrder as any).loggiKey ? (
                      <Button
                        size="sm"
                        className="w-full bg-[#c9a96e] hover:bg-[#b8944f] text-black"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/admin/orders/${selectedOrder.id}/loggi-shipment`, {
                              method: 'POST',
                              credentials: 'include',
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error);
                            alert('Remessa Loggi criada! Chave: ' + data.loggiKey);
                            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
                          } catch (e: any) {
                            alert('Erro ao criar remessa: ' + e.message);
                          }
                        }}
                        data-testid="button-create-loggi-shipment"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Criar Remessa Loggi
                      </Button>
                    ) : (
                      <>
                        <div className="bg-[#c9a96e]/10 p-3 rounded-lg text-sm">
                          <p className="font-medium text-[#c9a96e]">Remessa criada</p>
                          <p className="text-xs text-gray-600 font-mono mt-1">Chave: {(selectedOrder as any).loggiKey}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-[#c9a96e] text-[#c9a96e] hover:bg-[#c9a96e]/10"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/admin/orders/${selectedOrder.id}/loggi-label`, {
                                  method: 'POST',
                                  credentials: 'include',
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error);
                                if (data.labelUrl) {
                                  window.open(data.labelUrl, '_blank');
                                } else {
                                  alert('Etiqueta gerada. Verifique o painel Loggi.');
                                }
                              } catch (e: any) {
                                alert('Erro ao gerar etiqueta: ' + e.message);
                              }
                            }}
                            data-testid="button-loggi-label"
                          >
                            <Tag className="w-4 h-4 mr-1" />
                            Etiqueta
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-[#c9a96e] text-[#c9a96e] hover:bg-[#c9a96e]/10"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/admin/orders/${selectedOrder.id}/loggi-tracking`, {
                                  credentials: 'include',
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error);
                                const events = (data.events || []).slice(0, 5).map((e: any) =>
                                  `${e.date}: ${e.description}`
                                ).join('\n');
                                alert(`Status: ${data.statusDescription || data.status}\n\n${events || 'Sem eventos recentes'}`);
                              } catch (e: any) {
                                alert('Erro ao rastrear: ' + e.message);
                              }
                            }}
                            data-testid="button-loggi-tracking"
                          >
                            <MapPin className="w-4 h-4 mr-1" />
                            Rastrear
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Endereço de Entrega</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm">
                  <p className="font-medium">{selectedOrder.shippingName}</p>
                  <p className="text-gray-600">{selectedOrder.shippingEmail}</p>
                  {selectedOrder.shippingPhone && (
                    <p className="text-gray-600">{selectedOrder.shippingPhone}</p>
                  )}
                  <p className="text-gray-600 mt-2">{selectedOrder.shippingAddress}</p>
                  <p className="text-gray-600">{selectedOrder.shippingCity} - CEP: {selectedOrder.shippingZip}</p>
                  <p className="text-gray-600">{selectedOrder.shippingCountry}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Itens do Pedido</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      {item.productImage && (
                        <img 
                          src={item.productImage} 
                          alt={item.productName || 'Produto'} 
                          className="w-16 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.productName || `Produto ${item.productId.slice(0, 8)}`}</p>
                        {item.selectedSize && (
                          <p className="text-xs text-gray-500">Tamanho: {item.selectedSize}</p>
                        )}
                        <p className="text-xs text-gray-500">Qtd: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-sm">{formatCurrency(item.price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(selectedOrder.subtotalAmount || selectedOrder.totalAmount)}</span>
                  </div>
                  {/* Individual discounts breakdown */}
                  {selectedOrder.couponDiscountAmount && parseFloat(selectedOrder.couponDiscountAmount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Cupom {selectedOrder.couponCode && `(${selectedOrder.couponCode})`}</span>
                      <span>-{formatCurrency(selectedOrder.couponDiscountAmount)}</span>
                    </div>
                  )}
                  {selectedOrder.cashbackDiscountAmount && parseFloat(selectedOrder.cashbackDiscountAmount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Cashback utilizado</span>
                      <span>-{formatCurrency(selectedOrder.cashbackDiscountAmount)}</span>
                    </div>
                  )}
                  {selectedOrder.referralDiscountAmount && parseFloat(selectedOrder.referralDiscountAmount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto indicação (recompensa)</span>
                      <span>-{formatCurrency(selectedOrder.referralDiscountAmount)}</span>
                    </div>
                  )}
                  {selectedOrder.referredDiscountAmount && parseFloat(selectedOrder.referredDiscountAmount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto indicação (indicado)</span>
                      <span>-{formatCurrency(selectedOrder.referredDiscountAmount)}</span>
                    </div>
                  )}
                  {/* Fallback: show combined discount if no breakdown available */}
                  {(!selectedOrder.couponDiscountAmount && !selectedOrder.cashbackDiscountAmount && !selectedOrder.referralDiscountAmount && !selectedOrder.referredDiscountAmount) && selectedOrder.discountAmount && parseFloat(selectedOrder.discountAmount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto total {selectedOrder.couponCode && `(${selectedOrder.couponCode})`}</span>
                      <span>-{formatCurrency(selectedOrder.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frete ({selectedOrder.shippingMethod || 'Padrão'})</span>
                    <span>{selectedOrder.shippingCost && parseFloat(selectedOrder.shippingCost) > 0 ? formatCurrency(selectedOrder.shippingCost) : 'Grátis'}</span>
                  </div>
                  <div className="flex justify-between text-lg font-medium pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span>{formatCurrency(selectedOrder.totalAmount)}</span>
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
