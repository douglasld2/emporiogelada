import { AdminLayout } from '@/components/AdminLayout';
import { useStore } from '@/lib/StoreContext';
import { useQuery } from '@tanstack/react-query';
import { Package, DollarSign, ShoppingBag, Users, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Order } from '@shared/schema';

interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  recentOrders: Order[];
}

export default function AdminDashboard() {
  const { collections, products } = useStore();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard/stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'bg-blue-50 text-blue-600';
      case 'shipped':
        return 'bg-purple-50 text-purple-600';
      case 'delivered':
        return 'bg-green-50 text-green-600';
      case 'pending':
        return 'bg-yellow-50 text-yellow-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'processing':
        return 'Em preparo';
      case 'shipped':
        return 'Enviado';
      case 'delivered':
        return 'Entregue';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const statCards = [
    { 
      label: 'Vendas Totais', 
      value: isLoading ? '...' : formatCurrency(stats?.totalSales || 0), 
      icon: DollarSign, 
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      label: 'Total de Pedidos', 
      value: isLoading ? '...' : stats?.totalOrders || 0, 
      icon: ShoppingBag, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Total de Produtos', 
      value: products.length, 
      icon: Package, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    { 
      label: 'Clientes', 
      value: isLoading ? '...' : stats?.totalCustomers || 0, 
      icon: Users, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-serif mb-2">Dashboard</h1>
        <p className="text-gray-600">Visão geral da sua loja</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm" data-testid={`stat-card-${i}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 ${stat.bgColor} rounded-md`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <h3 className="text-2xl font-serif mb-1">{stat.value}</h3>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
          <h3 className="font-serif text-lg mb-6 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-gray-600" />
            Pedidos Recentes
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="space-y-4">
              {stats.recentOrders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">Pedido #{order.orderNumber || order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-gray-400">
                      {order.shippingName} · {format(new Date(order.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(parseFloat(order.totalAmount))}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Nenhum pedido ainda</p>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
          <h3 className="font-serif text-lg mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            Top Produtos
          </h3>
          {products.length > 0 ? (
            <div className="space-y-4">
              {products.slice(0, 5).map(product => (
                <div key={product.id} className="flex items-center gap-4">
                  <div className="w-10 h-12 bg-gray-100 rounded-sm overflow-hidden flex-shrink-0">
                    <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(parseFloat(product.price))}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Nenhum produto cadastrado</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
