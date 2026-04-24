import { AccountLayout } from '@/components/AccountLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, ShoppingBag, AlertCircle, CreditCard, Loader2, Eye, Truck, Calendar, MapPin, CheckCircle2, Circle, ExternalLink, RefreshCw } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/AuthContext';
import { useOrders } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: string;
  selectedSize?: string | null;
}

interface OrderDetailsResponse {
  order: {
    id: string;
    orderNumber?: string;
    userId?: string;
    status: string;
    totalAmount: string;
    shippingName: string;
    shippingAddress: string;
    shippingCity: string;
    shippingZip: string;
    shippingPhone?: string;
    shippingCost?: string | null;
    shippingMethod?: string;
    discountAmount?: string | null;
    couponDiscountAmount?: string | null;
    cashbackDiscountAmount?: string | null;
    referralDiscountAmount?: string | null;
    referredDiscountAmount?: string | null;
    couponCode?: string | null;
    trackingCode?: string | null;
    paymentMethod?: string;
    createdAt: string;
    melhorEnvioCartId?: string | null;
    melhorEnvioProtocol?: string | null;
  };
  items: OrderItem[];
}

interface TrackingResponse {
  trackingCode: string | null;
  trackingUrl: string | null;
  carrier: string;
  isME: boolean;
  events: Array<{
    date: string;
    status: string;
    description: string;
    location?: string;
  }>;
}

const STATUS_STEPS = [
  { key: 'pending',    label: 'Confirmado',       icon: CheckCircle2 },
  { key: 'processing', label: 'Em preparo',        icon: Package },
  { key: 'shipped',    label: 'Enviado',           icon: Truck },
  { key: 'delivered',  label: 'Entregue',          icon: CheckCircle2 },
];

function getStepIndex(status: string) {
  switch (status?.toLowerCase()) {
    case 'pending':    return 0;
    case 'processing': return 1;
    case 'shipped':    return 2;
    case 'delivered':  return 3;
    default:           return 0;
  }
}

function StatusStepper({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">
        <Circle className="w-4 h-4" />
        Pedido cancelado
      </div>
    );
  }
  const current = getStepIndex(status);
  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= current;
        const active = i === current;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                done
                  ? active
                    ? 'bg-[#c9a96e] text-black'
                    : 'bg-[#c9a96e]/30 text-[#c9a96e]'
                  : 'bg-gray-100 text-gray-300'
              }`}>
                <step.icon className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] mt-1 text-center leading-tight max-w-[56px] ${
                done ? (active ? 'text-[#c9a96e] font-semibold' : 'text-gray-500') : 'text-gray-300'
              }`}>
                {step.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`h-0.5 w-8 mb-4 transition-colors ${
                i < current ? 'bg-[#c9a96e]/40' : 'bg-gray-100'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TrackingPanel({ orderId }: { orderId: string }) {
  const [enabled, setEnabled] = useState(false);

  const { data, isLoading, refetch } = useQuery<TrackingResponse>({
    queryKey: ['order-tracking', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/tracking`, { credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao buscar rastreio');
      return res.json();
    },
    enabled,
    staleTime: 60_000,
  });

  if (!enabled) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full border-[#c9a96e] text-[#c9a96e] hover:bg-[#c9a96e]/10"
        onClick={() => setEnabled(true)}
        data-testid="button-load-tracking"
      >
        <Truck className="w-4 h-4 mr-2" />
        Rastrear Pedido
      </Button>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-[#c9a96e]" />
        <span className="ml-2 text-sm text-gray-500">Buscando rastreio...</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* Carrier + code */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">{data.carrier}</p>
          {data.trackingCode ? (
            <p className="font-mono text-sm font-medium text-gray-800">{data.trackingCode}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">Código ainda não disponível</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            title="Atualizar"
            data-testid="button-refresh-tracking"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {data.trackingUrl && (
            <a
              href={data.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-tracking-external"
            >
              <Button size="sm" className="bg-black text-white hover:bg-gray-800 h-8 text-xs">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Ver no site
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Timeline of events */}
      {data.events.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Histórico</p>
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-100" />
            {data.events.map((ev, i) => (
              <div key={i} className="relative flex gap-4 pb-4 last:pb-0">
                <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  i === 0 ? 'bg-[#c9a96e] text-black' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Truck className="w-3 h-3" />
                </div>
                <div className="flex-1 pb-1">
                  <p className={`text-sm ${i === 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                    {ev.description || ev.status}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {ev.date && (
                      <span className="text-xs text-gray-400">{ev.date}</span>
                    )}
                    {ev.location && (
                      <span className="text-xs text-gray-400 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {ev.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : data.trackingCode ? (
        <p className="text-xs text-gray-400 text-center py-2">
          Nenhum evento registrado ainda. O rastreio pode demorar até 24h para aparecer.
        </p>
      ) : null}
    </div>
  );
}

export default function AccountOrders() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { data: orderData, isLoading: ordersLoading } = useOrders();
  const [retryingPayment, setRetryingPayment] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: orderDetailsData, isLoading: detailsLoading } = useQuery<OrderDetailsResponse>({
    queryKey: ['orderDetails', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) throw new Error('No order selected');
      const res = await fetch(`/api/orders/${selectedOrderId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch order details');
      return res.json();
    },
    enabled: !!selectedOrderId,
  });

  const handleRetryPayment = async (paymentId: string) => {
    setRetryingPayment(paymentId);
    try {
      const response = await fetch(`/api/payments/${paymentId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao gerar novo pagamento');
      }
      const data = await response.json();
      if (data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        toast({ title: 'Erro', description: 'Não foi possível gerar o link de pagamento', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao tentar pagar novamente', variant: 'destructive' });
    } finally {
      setRetryingPayment(null);
    }
  };

  if (authLoading) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-gray-500">Carregando...</div>
        </div>
      </AccountLayout>
    );
  }

  if (!user) { navigate('/login'); return null; }

  const orders = orderData?.orders || [];
  const pendingPayments = orderData?.pendingPayments || [];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':  return 'bg-green-50 text-green-600';
      case 'shipped':    return 'bg-orange-50 text-orange-600';
      case 'processing': return 'bg-blue-50 text-blue-600';
      case 'pending':    return 'bg-yellow-50 text-yellow-600';
      case 'cancelled':  return 'bg-red-50 text-red-600';
      default:           return 'bg-gray-50 text-gray-600';
    }
  };

  const translateStatus = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':  return 'Entregue';
      case 'shipped':    return 'Enviado';
      case 'processing': return 'Em preparo';
      case 'pending':    return 'Confirmado';
      case 'cancelled':  return 'Cancelado';
      default:           return status;
    }
  };

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const detailOrder = orderDetailsData?.order;
  const detailItems = orderDetailsData?.items || [];
  const itemsSubtotal = detailItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

  return (
    <AccountLayout>
      <h1 className="text-2xl font-serif mb-8" data-testid="text-order-history">
        Histórico de Pedidos
      </h1>

      {pendingPayments.length > 0 && (
        <div className="mb-8 space-y-4">
          <h2 className="text-lg font-serif text-yellow-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Pagamentos Pendentes
          </h2>
          {pendingPayments.map(payment => (
            <div key={payment.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-6" data-testid={`card-pending-payment-${payment.id}`}>
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <p className="font-medium text-yellow-900">Pagamento Pendente - {formatCurrency(payment.amount)}</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Criado em {format(new Date(payment.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  {payment.pendingOrderData && (
                    <p className="text-xs text-yellow-600 mt-2">Aguardando confirmação do pagamento para criar o pedido</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                    Aguardando Confirmação
                  </span>
                  <Button
                    onClick={() => handleRetryPayment(payment.id)}
                    disabled={retryingPayment === payment.id}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid={`button-retry-payment-${payment.id}`}
                  >
                    {retryingPayment === payment.id ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
                    ) : (
                      <><CreditCard className="w-4 h-4 mr-2" />Pagar Agora</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {ordersLoading ? (
        <div className="py-12 text-center text-gray-500">Carregando pedidos...</div>
      ) : orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 transition-all hover:shadow-md" data-testid={`card-order-${order.id}`}>
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-5 pb-4 border-b border-gray-50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-50 rounded-full">
                    <Package className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-lg" data-testid={`text-order-id-${order.id}`}>
                      Pedido #{order.orderNumber || order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.createdAt ? format(new Date(order.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                    {translateStatus(order.status)}
                  </span>
                  <span className="font-serif text-lg" data-testid={`text-order-total-${order.id}`}>
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Progress stepper */}
              <div className="mb-5 overflow-x-auto">
                <StatusStepper status={order.status} />
              </div>

              {/* Address + actions */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="text-sm text-gray-700">
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Enviar para</p>
                  <p className="font-medium">{order.shippingName}</p>
                  <p className="text-gray-500">{order.shippingAddress} — {order.shippingCity}</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedOrderId(order.id)}
                    className="flex-1 md:flex-none border-gray-200 rounded-lg uppercase tracking-widest text-xs h-10"
                    data-testid={`button-view-order-${order.id}`}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalhes
                  </Button>
                  <Link href={`/account/support?order=${order.orderNumber || order.id.slice(0, 8)}`}>
                    <Button variant="outline" className="flex-1 md:flex-none border-gray-200 rounded-lg uppercase tracking-widest text-xs h-10" data-testid={`button-order-help-${order.id}`}>
                      Precisa de Ajuda?
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : pendingPayments.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-12 text-center">
          <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-serif text-lg mb-2">Nenhum pedido ainda</h3>
          <p className="text-gray-500 mb-6">Quando você fizer um pedido, ele aparecerá aqui</p>
          <Link href="/shop">
            <Button className="bg-black text-white hover:bg-gray-800 rounded-lg uppercase tracking-widest text-xs h-10" data-testid="button-start-shopping">
              Começar a Comprar
            </Button>
          </Link>
        </div>
      ) : null}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Pedido #{detailOrder?.orderNumber || detailOrder?.id.slice(0, 8).toUpperCase() || '...'}
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Carregando...</p>
            </div>
          ) : detailOrder ? (
            <div className="space-y-6">
              {/* Status + date */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(detailOrder.status)}`}>
                  {translateStatus(detailOrder.status)}
                </span>
                <span className="text-sm text-gray-500">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {detailOrder.createdAt ? format(new Date(detailOrder.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                </span>
              </div>

              {/* Progress stepper */}
              <div className="overflow-x-auto">
                <StatusStepper status={detailOrder.status} />
              </div>

              {/* Tracking panel — always visible for shipped/delivered or if has tracking code */}
              {(detailOrder.status === 'shipped' || detailOrder.status === 'delivered' || detailOrder.trackingCode) && (
                <div>
                  <h4 className="text-sm font-medium uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Rastreamento
                  </h4>
                  <TrackingPanel orderId={detailOrder.id} />
                </div>
              )}

              {/* Products */}
              <div>
                <h4 className="text-sm font-medium uppercase tracking-widest text-gray-500 mb-3">Produtos</h4>
                <div className="space-y-3">
                  {detailItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-50" data-testid={`order-item-${item.id}`}>
                      <div>
                        <p className="font-medium text-sm">{item.productName}</p>
                        <p className="text-xs text-gray-500">
                          Qtd: {item.quantity}
                          {item.selectedSize && ` • Tamanho: ${item.selectedSize}`}
                        </p>
                      </div>
                      <p className="font-medium text-sm">{formatCurrency(parseFloat(item.price) * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatCurrency(itemsSubtotal)}</span>
                </div>
                {detailOrder.couponDiscountAmount && parseFloat(detailOrder.couponDiscountAmount) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Cupom {detailOrder.couponCode && `(${detailOrder.couponCode})`}</span>
                    <span>-{formatCurrency(detailOrder.couponDiscountAmount)}</span>
                  </div>
                )}
                {detailOrder.cashbackDiscountAmount && parseFloat(detailOrder.cashbackDiscountAmount) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Cashback utilizado</span>
                    <span>-{formatCurrency(detailOrder.cashbackDiscountAmount)}</span>
                  </div>
                )}
                {detailOrder.referralDiscountAmount && parseFloat(detailOrder.referralDiscountAmount) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto de indicação</span>
                    <span>-{formatCurrency(detailOrder.referralDiscountAmount)}</span>
                  </div>
                )}
                {detailOrder.referredDiscountAmount && parseFloat(detailOrder.referredDiscountAmount) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto boas-vindas</span>
                    <span>-{formatCurrency(detailOrder.referredDiscountAmount)}</span>
                  </div>
                )}
                {!detailOrder.couponDiscountAmount && !detailOrder.cashbackDiscountAmount && !detailOrder.referralDiscountAmount && !detailOrder.referredDiscountAmount && detailOrder.discountAmount && parseFloat(detailOrder.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto {detailOrder.couponCode && `(${detailOrder.couponCode})`}</span>
                    <span>-{formatCurrency(detailOrder.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frete ({detailOrder.shippingMethod?.replace(/\[me:\d+\]/g, '').trim() || 'Padrão'})</span>
                  <span>{parseFloat(detailOrder.shippingCost || '0') > 0 ? formatCurrency(detailOrder.shippingCost || '0') : 'Grátis'}</span>
                </div>
                <div className="flex justify-between font-medium text-base pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatCurrency(detailOrder.totalAmount)}</span>
                </div>
              </div>

              {/* Delivery address */}
              <div>
                <h4 className="text-sm font-medium uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereço de Entrega
                </h4>
                <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4">
                  <p className="font-medium">{detailOrder.shippingName}</p>
                  <p>{detailOrder.shippingAddress}</p>
                  <p>{detailOrder.shippingCity}, {detailOrder.shippingZip}</p>
                  {detailOrder.shippingPhone && <p className="mt-2 text-gray-500">{detailOrder.shippingPhone}</p>}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <Link href={`/account/support?order=${detailOrder.orderNumber || detailOrder.id.slice(0, 8)}`}>
                  <Button variant="outline" className="w-full" onClick={() => setSelectedOrderId(null)} data-testid="button-order-help-modal">
                    Precisa de Ajuda com Este Pedido?
                  </Button>
                </Link>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AccountLayout>
  );
}
