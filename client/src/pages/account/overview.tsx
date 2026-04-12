import { AccountLayout } from '@/components/AccountLayout';
import { Package, Truck, CheckCircle, ShoppingBag, Wallet, ArrowUpRight, ArrowDownLeft, Clock, Undo2, History } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/lib/AuthContext';
import { useOrders, useOrderStats } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, type ReactElement } from 'react';

interface CashbackTransaction {
  id: string;
  type: 'earned' | 'spent' | 'adjusted' | 'expired' | 'reversed';
  amount: string;
  description: string | null;
  createdAt: string;
  orderId?: string | null;
}

interface WalletData {
  balance: number;
  transactions: CashbackTransaction[];
}

const TX_ICONS: Record<string, ReactElement> = {
  earned: <ArrowDownLeft className="w-3.5 h-3.5 text-green-600" />,
  spent: <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />,
  reversed: <Undo2 className="w-3.5 h-3.5 text-orange-500" />,
  adjusted: <Clock className="w-3.5 h-3.5 text-blue-500" />,
  expired: <Clock className="w-3.5 h-3.5 text-gray-400" />,
};

export default function AccountOverview() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [showCashbackHistory, setShowCashbackHistory] = useState(false);
  const { data: ordersData, isLoading: ordersLoading } = useOrders();
  const orders = ordersData?.orders || [];
  const { data: stats, isLoading: statsLoading } = useOrderStats();

  const { data: wallet } = useQuery<WalletData>({
    queryKey: ['cashback-wallet'],
    queryFn: async () => {
      const res = await fetch('/api/cashback/wallet', { credentials: 'include' });
      if (!res.ok) return { balance: 0, transactions: [] };
      return res.json();
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-gray-500">Carregando...</div>
        </div>
      </AccountLayout>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const recentOrder = orders && orders.length > 0 ? orders[0] : null;
  const isLoading = ordersLoading || statsLoading;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'bg-green-50 text-green-600';
      case 'shipped':
      case 'processing': return 'bg-orange-50 text-orange-600';
      case 'pending': return 'bg-blue-50 text-blue-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const translateStatus = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'Entregue';
      case 'shipped': return 'Enviado';
      case 'processing': return 'Processando';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const hasBalance = (wallet?.balance ?? 0) > 0;

  // Sort cashback transactions: group by orderId, spent/reversed before earned within same order,
  // orders sorted by the date of the first transaction in each group (newest order first)
  const sortedTransactions = (() => {
    if (!wallet?.transactions?.length) return [];
    const TYPE_PRIORITY: Record<string, number> = { spent: 0, reversed: 1, adjusted: 2, earned: 3, expired: 4 };
    // Group by orderId (null grouped separately per transaction)
    const groups = new Map<string, CashbackTransaction[]>();
    for (const tx of wallet.transactions) {
      const key = tx.orderId || `__no_order__${tx.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    }
    // Sort within each group: spent first, then earned
    for (const txs of Array.from(groups.values())) {
      txs.sort((a: CashbackTransaction, b: CashbackTransaction) => (TYPE_PRIORITY[a.type] ?? 9) - (TYPE_PRIORITY[b.type] ?? 9));
    }
    // Sort groups by the earliest (oldest) createdAt in the group, most recent group first
    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      const aTime = Math.max(...a.map(t => new Date(t.createdAt).getTime()));
      const bTime = Math.max(...b.map(t => new Date(t.createdAt).getTime()));
      return bTime - aTime;
    });
    return sortedGroups.flat();
  })();

  return (
    <AccountLayout>
      <h1 className="text-2xl font-serif mb-8" data-testid="text-welcome">Bem-vindo(a), {user.name?.split(' ')[0] || 'Cliente'}</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 border border-gray-100 rounded-lg shadow-sm" data-testid="stat-total-orders">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Package className="w-5 h-5" /></div>
            <span className="text-2xl font-serif">{isLoading ? '-' : (stats?.total || 0)}</span>
          </div>
          <p className="text-sm text-gray-500 uppercase tracking-wide">Total de Pedidos</p>
        </div>
        <div className="bg-white p-6 border border-gray-100 rounded-lg shadow-sm" data-testid="stat-in-transit">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-full"><Truck className="w-5 h-5" /></div>
            <span className="text-2xl font-serif">{isLoading ? '-' : (stats?.shipped || 0)}</span>
          </div>
          <p className="text-sm text-gray-500 uppercase tracking-wide">Em Trânsito</p>
        </div>
        <div className="bg-white p-6 border border-gray-100 rounded-lg shadow-sm" data-testid="stat-delivered">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-full"><CheckCircle className="w-5 h-5" /></div>
            <span className="text-2xl font-serif">{isLoading ? '-' : (stats?.delivered || 0)}</span>
          </div>
          <p className="text-sm text-gray-500 uppercase tracking-wide">Entregues</p>
        </div>
      </div>

      {/* Cashback Wallet */}
      <div className="bg-gradient-to-br from-black to-gray-900 rounded-xl p-6 mb-8 text-white relative overflow-hidden" data-testid="section-cashback-wallet">
        <div className="absolute right-4 top-4 opacity-10">
          <Wallet className="w-24 h-24" />
        </div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#c9a96e' }}>Carteira de Cashback</p>
            <p className="text-3xl font-serif" data-testid="text-cashback-balance">
              R$ {(wallet?.balance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {hasBalance ? 'Disponível para uso no próximo pedido' : 'Faça compras para acumular cashback'}
            </p>
          </div>
          <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(201,169,110,0.15)' }}>
            <Wallet className="w-6 h-6" style={{ color: '#c9a96e' }} />
          </div>
        </div>

        {sortedTransactions.length > 0 && (
          <div className="border-t border-white/10 pt-4 mt-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-widest text-gray-400">Últimas movimentações</p>
              {sortedTransactions.length > 3 && (
                <button
                  onClick={() => setShowCashbackHistory(true)}
                  className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                  style={{ color: '#c9a96e' }}
                  data-testid="button-cashback-history"
                >
                  <History className="w-3 h-3" />
                  Ver histórico completo ({sortedTransactions.length})
                </button>
              )}
            </div>
            {sortedTransactions.slice(0, 3).map(tx => (
              <div key={tx.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-full bg-white/10">{TX_ICONS[tx.type]}</div>
                  <span className="text-gray-300 text-xs truncate max-w-[220px]">{tx.description || tx.type}</span>
                </div>
                <span
                  className="text-xs font-medium ml-2 shrink-0"
                  style={{
                    color: tx.type === 'earned'
                      ? '#4ade80'
                      : (tx.type === 'spent' || tx.type === 'reversed')
                        ? '#f87171'
                        : '#c9a96e'
                  }}
                >
                  {(tx.type === 'spent' || tx.type === 'reversed') ? '-' : '+'}R$ {Number(tx.amount).toFixed(2).replace('.', ',')}
                </span>
              </div>
            ))}
            {sortedTransactions.length <= 3 && sortedTransactions.length > 0 && (
              <button
                onClick={() => setShowCashbackHistory(true)}
                className="flex items-center gap-1 text-xs mt-2 hover:opacity-80 transition-opacity"
                style={{ color: '#c9a96e' }}
                data-testid="button-cashback-history-all"
              >
                <History className="w-3 h-3" />
                Ver histórico completo
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cashback Full History Dialog */}
      <Dialog open={showCashbackHistory} onOpenChange={setShowCashbackHistory}>
        <DialogContent className="max-w-lg w-full p-0 overflow-hidden" data-testid="dialog-cashback-history">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Wallet className="w-5 h-5" style={{ color: '#c9a96e' }} />
              Histórico de Cashback
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              Saldo atual: <span className="font-semibold text-black">R$ {(wallet?.balance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] px-6 py-4 space-y-3" data-testid="list-cashback-transactions">
            {sortedTransactions.length > 0 ? (
              sortedTransactions.map(tx => (
                <div key={tx.id} className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-1.5 rounded-full bg-gray-100 shrink-0 mt-0.5">
                      {TX_ICONS[tx.type]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">{tx.description || tx.type}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {tx.createdAt ? format(new Date(tx.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-sm font-semibold ml-4 shrink-0"
                    style={{
                      color: tx.type === 'earned'
                        ? '#16a34a'
                        : (tx.type === 'spent' || tx.type === 'reversed')
                          ? '#dc2626'
                          : '#c9a96e'
                    }}
                  >
                    {(tx.type === 'spent' || tx.type === 'reversed') ? '-' : '+'}R$ {Number(tx.amount).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 py-8">Nenhuma movimentação encontrada.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Order */}
      <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-serif">Pedido Recente</h2>
          <Link href="/account/orders">
            <span className="text-sm underline cursor-pointer text-gray-500 hover:text-black" data-testid="link-view-all-orders">Ver todos os pedidos</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Carregando pedidos...</div>
        ) : recentOrder ? (
          <>
            <div className="border-b border-gray-100 pb-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-medium" data-testid="text-order-id">Pedido #{recentOrder.orderNumber || recentOrder.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500">
                    Realizado em {recentOrder.createdAt ? format(new Date(recentOrder.createdAt), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                  </p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(recentOrder.status)}`}>
                  {translateStatus(recentOrder.status)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-50 rounded-full"><ShoppingBag className="w-5 h-5 text-gray-600" /></div>
                <div>
                  <p className="font-medium text-lg">R$ {parseFloat(recentOrder.totalAmount).toFixed(2).replace('.', ',')}</p>
                  <p className="text-xs text-gray-500">Envio para {recentOrder.shippingCity}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Link href="/account/orders">
                <Button className="flex-1 bg-black text-white hover:bg-gray-800 rounded-lg uppercase tracking-widest text-xs h-10" data-testid="button-view-order">
                  Ver Pedido
                </Button>
              </Link>
              <Link href="/account/support">
                <Button variant="outline" className="flex-1 border-gray-200 rounded-lg uppercase tracking-widest text-xs h-10" data-testid="button-get-help">
                  Precisa de Ajuda?
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">Você ainda não fez nenhum pedido</p>
            <Link href="/shop">
              <Button className="bg-black text-white hover:bg-gray-800 rounded-lg uppercase tracking-widest text-xs h-10" data-testid="button-start-shopping">
                Começar a Comprar
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
