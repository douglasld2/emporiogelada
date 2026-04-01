import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  XCircle,
  Search,
  RefreshCw,
  TrendingUp,
  QrCode,
  ArrowUpRight,
  Package,
  MapPin,
  User,
  Mail,
  Phone,
  Truck,
  X
} from 'lucide-react';
import type { Payment, Order, OrderItem } from '@shared/schema';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PaymentStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  totalAmount: number;
  approvedAmount: number;
}

interface OrderDetails {
  order: Order;
  items: OrderItem[];
}

export default function AdminPayments() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<PaymentStats>({
    queryKey: ['admin-payment-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/payments/stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const { data: payments = [], isLoading: paymentsLoading, refetch: refetchPayments } = useQuery<Payment[]>({
    queryKey: ['admin-payments', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const res = await fetch(`/api/admin/payments?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch payments');
      return res.json();
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const { data: orderDetails, isLoading: orderLoading } = useQuery<OrderDetails>({
    queryKey: ['admin-order-details', selectedPayment?.orderId],
    queryFn: async () => {
      if (!selectedPayment?.orderId) throw new Error('No order ID');
      const res = await fetch(`/api/admin/orders/${selectedPayment.orderId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch order');
      return res.json();
    },
    enabled: !!selectedPayment?.orderId && isModalOpen,
  });

  const handleRefresh = () => {
    refetchStats();
    refetchPayments();
  };

  const handleRowClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  const filteredPayments = payments.filter(payment => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      payment.payerEmail?.toLowerCase().includes(query) ||
      payment.payerName?.toLowerCase().includes(query) ||
      payment.mercadoPagoId?.toLowerCase().includes(query) ||
      payment.externalReference?.toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
      case 'in_process':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'pending':
        return 'Pendente';
      case 'in_process':
        return 'Processando';
      case 'rejected':
        return 'Rejeitado';
      case 'cancelled':
        return 'Cancelado';
      case 'processing':
        return 'Em preparo';
      case 'shipped':
        return 'Enviado';
      case 'delivered':
        return 'Entregue';
      default:
        return status;
    }
  };

  const getPaymentMethodIcon = (method: string | null) => {
    if (!method) return <CreditCard className="w-4 h-4" />;
    if (method.includes('pix')) return <QrCode className="w-4 h-4 text-green-600" />;
    return <CreditCard className="w-4 h-4 text-blue-600" />;
  };

  const formatCurrency = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif mb-2">Pagamentos</h1>
            <p className="text-gray-600">Monitore e gerencie os pagamentos do Mercado Pago</p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
            data-testid="button-refresh-payments"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">Total de Pagamentos</span>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900" data-testid="stat-total-payments">
              {statsLoading ? '...' : stats?.total || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">transações registradas</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">Aprovados</span>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600" data-testid="stat-approved-payments">
              {statsLoading ? '...' : stats?.approved || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">pagamentos confirmados</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">Pendentes</span>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-yellow-600" data-testid="stat-pending-payments">
              {statsLoading ? '...' : stats?.pending || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">aguardando confirmação</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">Valor Aprovado</span>
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600" data-testid="stat-approved-amount">
              {statsLoading ? '...' : formatCurrency(stats?.approvedAmount || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">receita confirmada</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por email, nome ou ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-payments"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="approved">Aprovados</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="rejected">Rejeitados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Pagador</th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      Carregando pagamentos...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      Nenhum pagamento encontrado
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr 
                      key={payment.id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors" 
                      onClick={() => handleRowClick(payment)}
                      data-testid={`payment-row-${payment.id}`}
                    >
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {format(new Date(payment.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(payment.createdAt), "HH:mm", { locale: ptBR })}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-gray-900">
                          {payment.payerName || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.payerEmail || 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(payment.paymentMethod)}
                          <span className="text-sm text-gray-700 capitalize">
                            {payment.paymentMethod || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                          {getStatusLabel(payment.status)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {payment.orderId ? (
                          <span className="text-xs text-blue-600 font-mono">
                            #{payment.orderId.slice(0, 8)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Detalhes da Venda</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Pagamento</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Status:</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedPayment.status)}`}>
                        {getStatusLabel(selectedPayment.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Valor:</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedPayment.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Método:</span>
                      <span className="text-sm capitalize">{selectedPayment.paymentMethod || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Data:</span>
                      <span className="text-sm">{format(new Date(selectedPayment.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                    </div>
                    {selectedPayment.mercadoPagoId && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">ID MP:</span>
                        <a
                          href={`https://www.mercadopago.com.br/activities/production/detail/${selectedPayment.mercadoPagoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {selectedPayment.mercadoPagoId.slice(0, 12)}...
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" /> Cliente
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-gray-400" />
                      <span className="text-sm">{selectedPayment.payerName || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-gray-400" />
                      <span className="text-sm">{selectedPayment.payerEmail || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedPayment.orderId && (
                <>
                  <Separator />
                  
                  {orderLoading ? (
                    <div className="text-center py-8 text-gray-500">Carregando detalhes do pedido...</div>
                  ) : orderDetails ? (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4" /> Endereço de Entrega
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium">{orderDetails.order.shippingName}</p>
                          <p>{orderDetails.order.shippingAddress}</p>
                          <p>{orderDetails.order.shippingCity} - {orderDetails.order.shippingZip}</p>
                          <p>{orderDetails.order.shippingCountry}</p>
                          {orderDetails.order.shippingPhone && (
                            <p className="flex items-center gap-2 mt-2">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {orderDetails.order.shippingPhone}
                            </p>
                          )}
                          <p className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {orderDetails.order.shippingEmail}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4" /> Produtos
                        </h4>
                        <div className="space-y-3">
                          {orderDetails.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                              <div>
                                <p className="text-sm font-medium">{item.productName}</p>
                                <p className="text-xs text-gray-500">Qtd: {item.quantity}</p>
                              </div>
                              <span className="text-sm font-medium">{formatCurrency(parseFloat(item.price) * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-black/5 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-600">Status do Pedido</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mt-1 ${getStatusColor(orderDetails.order.status)}`}>
                              {getStatusLabel(orderDetails.order.status)}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Total</p>
                            <p className="text-xl font-bold">{formatCurrency(orderDetails.order.totalAmount)}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">Pedido não encontrado</div>
                  )}
                </>
              )}

              {!selectedPayment.orderId && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <Truck className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Nenhum pedido associado a este pagamento</p>
                  <p className="text-xs mt-1">O pedido será criado após confirmação do pagamento</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
