import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Navigation } from '@/components/Navigation';
import { Package, User, LifeBuoy, MapPin, LogOut, Menu, X, Gift } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export function AccountLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { logout, user, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { icon: User, label: 'Visão Geral', href: '/account' },
    { icon: Package, label: 'Pedidos', href: '/account/orders' },
    { icon: MapPin, label: 'Endereços', href: '/account/addresses' },
    { icon: Gift, label: 'Indicações', href: '/account/referral' },
    { icon: LifeBuoy, label: 'Suporte', href: '/account/support' },
  ];

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-gray-500 font-medium">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-20">
        {/* Mobile Account Header */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-3 w-full bg-white p-4 border border-gray-100 shadow-sm rounded-sm"
            data-testid="button-toggle-account-menu"
          >
            <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-sm font-serif">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">{user.name || 'Cliente'}</p>
              <p className="text-xs text-gray-500">{navItems.find(i => i.href === location)?.label || 'Minha Conta'}</p>
            </div>
            {isSidebarOpen ? <X className="w-5 h-5 text-gray-400" /> : <Menu className="w-5 h-5 text-gray-400" />}
          </button>

          {/* Mobile Dropdown Menu */}
          {isSidebarOpen && (
            <div className="bg-white border border-gray-100 border-t-0 shadow-sm rounded-b-sm">
              <nav className="p-2">
                {navItems.map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setIsSidebarOpen(false)}>
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer transition-colors ${
                      location === item.href 
                        ? 'bg-black text-white' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                    }`}>
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  </Link>
                ))}
                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer transition-colors text-gray-500 hover:bg-red-50 hover:text-red-600 mt-1 border-t border-gray-100"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sair</span>
                </button>
              </nav>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
            {/* Sidebar - Desktop only */}
            <div className="hidden lg:block w-64 flex-shrink-0">
                <div className="bg-white p-6 border border-gray-100 shadow-sm rounded-sm mb-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-lg font-serif">
                            {user.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <p className="font-medium">{user.name || 'Cliente'}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                    </div>
                    
                    <nav className="space-y-1">
                        {navItems.map(item => (
                            <Link key={item.href} href={item.href}>
                                <div className={`flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer transition-colors ${
                                    location === item.href 
                                        ? 'bg-black text-white' 
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                                }`}>
                                    <item.icon className="w-4 h-4" />
                                    <span className="text-sm font-medium">{item.label}</span>
                                </div>
                            </Link>
                        ))}
                        <button 
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer transition-colors text-gray-500 hover:bg-red-50 hover:text-red-600 mt-4 border-t border-gray-100"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-medium">Sair</span>
                        </button>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
                {children}
            </div>
        </div>
      </div>
    </div>
  );
}
