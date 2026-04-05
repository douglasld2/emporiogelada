import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Package, Grid, LogOut, CreditCard, Ticket,
  ShoppingBag, Settings, MessageSquare, Menu, X, Gift,
  FolderOpen, ChevronDown, Tag, Percent, TrendingUp, Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { storeConfig } from '@/config/store';
import logoImg from "/logo.png";

const SIDEBAR_BG = "#0d0d0d";
const SIDEBAR_BORDER = "rgba(201,169,110,0.12)";
const ACTIVE_BG = "rgba(201,169,110,0.15)";
const ACTIVE_COLOR = "#c9a96e";

interface NavSection {
  type: 'section';
  label: string;
  icon: React.ElementType;
  items: { label: string; href: string; icon: React.ElementType }[];
}

interface NavItem {
  type: 'item';
  label: string;
  href: string;
  icon: React.ElementType;
}

type NavEntry = NavItem | NavSection;

const navEntries: NavEntry[] = [
  { type: 'item', icon: LayoutDashboard, label: 'Painel', href: '/admin' },
  { type: 'item', icon: ShoppingBag, label: 'Pedidos', href: '/admin/orders' },
  {
    type: 'section',
    label: 'Produtos',
    icon: Package,
    items: [
      { label: 'Grupos', href: '/admin/groups', icon: FolderOpen },
      { label: 'Subgrupos', href: '/admin/collections', icon: Grid },
      { label: 'Produtos', href: '/admin/products', icon: Package },
      { label: 'Kits & Presentes', href: '/admin/kits', icon: Gift },
    ],
  },
  {
    type: 'section',
    label: 'CRM',
    icon: TrendingUp,
    items: [
      { label: 'Cupons', href: '/admin/coupons', icon: Ticket },
      { label: 'Promoções', href: '/admin/promotions', icon: Percent },
      { label: 'Cashback', href: '/admin/cashback', icon: CreditCard },
      { label: 'Link de Indicação', href: '/admin/referral', icon: Link2 },
    ],
  },
  { type: 'item', icon: MessageSquare, label: 'Suporte', href: '/admin/support' },
  { type: 'item', icon: Settings, label: 'Configurações', href: '/admin/settings' },
];

const allItems = navEntries.flatMap(e =>
  e.type === 'item' ? [e] : e.items.map(i => ({ ...i, type: 'item' as const }))
);

function getLabelByHref(href: string) {
  return allItems.find(i => i.href === href)?.label ?? 'Admin';
}

function SidebarContent({ location, onNavigate, outOfStockCount }: {
  location: string;
  onNavigate: () => void;
  outOfStockCount: number;
}) {
  const sectionWithActive = navEntries
    .filter((e): e is NavSection => e.type === 'section')
    .find(s => s.items.some(i => i.href === location));

  const [openSections, setOpenSections] = useState<string[]>(
    sectionWithActive ? [sectionWithActive.label] : []
  );

  function toggleSection(label: string) {
    setOpenSections(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  }

  return (
    <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
      {navEntries.map(entry => {
        if (entry.type === 'item') {
          const isActive = location === entry.href;
          return (
            <Link key={entry.href} href={entry.href} onClick={onNavigate}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm font-medium"
                style={{
                  color: isActive ? ACTIVE_COLOR : 'rgba(255,255,255,0.55)',
                  backgroundColor: isActive ? ACTIVE_BG : 'transparent',
                  borderLeft: isActive ? `2px solid ${ACTIVE_COLOR}` : '2px solid transparent',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; }}
                data-testid={`nav-${entry.href.replace('/admin/', '') || 'dashboard'}`}
              >
                <entry.icon className="w-4 h-4 flex-shrink-0" />
                <span>{entry.label}</span>
              </div>
            </Link>
          );
        }

        const isOpen = openSections.includes(entry.label);
        const hasActive = entry.items.some(i => i.href === location);
        const isProdutosSection = entry.label === 'Produtos';

        return (
          <div key={entry.label}>
            <button
              onClick={() => toggleSection(entry.label)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium"
              style={{
                color: hasActive ? ACTIVE_COLOR : 'rgba(255,255,255,0.55)',
                backgroundColor: hasActive && !isOpen ? ACTIVE_BG : 'transparent',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = hasActive ? ACTIVE_COLOR : 'rgba(255,255,255,0.55)'; }}
              data-testid={`nav-section-${entry.label.toLowerCase()}`}
            >
              <entry.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{entry.label}</span>
              {isProdutosSection && outOfStockCount > 0 && (
                <span
                  className="flex items-center justify-center rounded-full text-[10px] font-bold min-w-[18px] h-[18px] px-1"
                  style={{ backgroundColor: '#8b1a1a', color: '#fff' }}
                  data-testid="badge-out-of-stock"
                  title={`${outOfStockCount} produto(s) sem estoque`}
                >
                  {outOfStockCount}
                </span>
              )}
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="ml-3 pl-3 py-1 space-y-0.5" style={{ borderLeft: `1px solid ${SIDEBAR_BORDER}` }}>
                    {entry.items.map(item => {
                      const isActive = location === item.href;
                      const isProductsLink = item.href === '/admin/products';
                      return (
                        <Link key={item.href} href={item.href} onClick={onNavigate}>
                          <div
                            className="flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-all text-sm"
                            style={{
                              color: isActive ? ACTIVE_COLOR : 'rgba(255,255,255,0.45)',
                              backgroundColor: isActive ? ACTIVE_BG : 'transparent',
                              fontWeight: isActive ? 500 : 400,
                            }}
                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'; }}
                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; }}
                            data-testid={`nav-${item.href.replace('/admin/', '')}`}
                          >
                            <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            {isProductsLink && outOfStockCount > 0 && (
                              <span
                                className="flex items-center justify-center rounded-full text-[10px] font-bold min-w-[18px] h-[18px] px-1"
                                style={{ backgroundColor: '#8b1a1a', color: '#fff' }}
                              >
                                {outOfStockCount}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { data: stockAlerts } = useQuery<{ outOfStockCount: number }>({
    queryKey: ['adminStockAlerts'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stock-alerts');
      if (!res.ok) return { outOfStockCount: 0 };
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const outOfStockCount = stockAlerts?.outOfStockCount ?? 0;

  const closeMenu = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header
        className="md:hidden text-white h-16 flex items-center justify-between px-6 sticky top-0 z-50"
        style={{ backgroundColor: SIDEBAR_BG, borderBottom: `1px solid ${SIDEBAR_BORDER}` }}
      >
        <img src={logoImg} alt={storeConfig.name} className="h-10 w-auto object-contain" />
        <div className="flex items-center gap-3">
          {outOfStockCount > 0 && (
            <span
              className="flex items-center justify-center rounded-full text-[11px] font-bold w-5 h-5"
              style={{ backgroundColor: '#8b1a1a', color: '#fff' }}
            >
              {outOfStockCount}
            </span>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md transition-colors"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            data-testid="button-toggle-sidebar"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={closeMenu} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-60 text-white flex flex-col transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:flex-shrink-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ backgroundColor: SIDEBAR_BG, borderRight: `1px solid ${SIDEBAR_BORDER}` }}
      >
        {/* Logo — desktop */}
        <div className="hidden md:flex flex-col items-center pt-7 pb-5 px-4">
          <img src={logoImg} alt={storeConfig.name} className="h-14 w-auto object-contain" />
          <span
            className="text-[10px] uppercase tracking-[0.3em] mt-2"
            style={{ color: 'rgba(201,169,110,0.5)' }}
          >
            Painel Admin
          </span>
          <div className="w-full mt-5 h-px" style={{ backgroundColor: SIDEBAR_BORDER }} />
        </div>

        {/* Mobile: close button */}
        <div className="p-4 md:hidden flex justify-end">
          <button onClick={closeMenu} className="p-1 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <SidebarContent location={location} onNavigate={closeMenu} outOfStockCount={outOfStockCount} />

        {/* Logout */}
        <div className="p-3" style={{ borderTop: `1px solid ${SIDEBAR_BORDER}` }}>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto flex flex-col min-h-0">
        <header className="bg-white border-b border-gray-200 h-16 hidden md:flex items-center justify-between px-8 sticky top-0 z-30">
          <h1 className="font-serif text-lg text-gray-900">
            {getLabelByHref(location)}
          </h1>
          <div className="text-xs text-gray-400 uppercase tracking-widest">Administrador</div>
        </header>
        <main className="p-4 md:p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
