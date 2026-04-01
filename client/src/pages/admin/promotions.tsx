import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Percent, Tag, Calendar, Trash2, Edit2, TrendingUp,
  ShoppingBag, DollarSign, Package, ChevronRight, Clock, CheckCircle, BarChart3, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GOLD = '#c9a96e';
const BORDEAUX = '#8b1a1a';

type TargetType = 'all' | 'group' | 'collection' | 'product';
type DiscountType = 'percentage' | 'fixed';

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: string;
  targetType: TargetType;
  targetId: string | null;
  targetName: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

interface Insights {
  orderCount: number;
  revenue: number;
  itemsSold: number;
  avgOrderValue: number;
  estimatedDiscount: number;
  topProducts: { name: string; qty: number; revenue: number }[];
}

interface TargetOption { id: string; name: string }

const fmtR$ = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

function promoStatus(p: Promotion): 'active' | 'scheduled' | 'expired' {
  const now = Date.now();
  const start = new Date(p.startDate).getTime();
  const end = new Date(p.endDate).getTime();
  if (now < start) return 'scheduled';
  if (now > end) return 'expired';
  return 'active';
}

function StatusBadge({ status }: { status: 'active' | 'scheduled' | 'expired' }) {
  const map = {
    active: { label: 'Ativa', color: '#16a34a', bg: 'rgba(22,163,74,0.1)', icon: CheckCircle },
    scheduled: { label: 'Agendada', color: GOLD, bg: 'rgba(201,169,110,0.12)', icon: Clock },
    expired: { label: 'Encerrada', color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: AlertTriangle },
  };
  const { label, color, bg, icon: Icon } = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ color, backgroundColor: bg }}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function InsightsPanel({ promoId, promo }: { promoId: string; promo: Promotion }) {
  const { data, isLoading, isError } = useQuery<Insights>({
    queryKey: ['/api/admin/promotions', promoId, 'insights'],
    queryFn: async () => {
      const r = await fetch(`/api/admin/promotions/${promoId}/insights`, { credentials: 'include' });
      if (!r.ok) throw new Error('Falha ao carregar insights');
      return r.json();
    },
  });

  const status = promoStatus(promo);
  const discLabel = promo.discountType === 'percentage'
    ? `${promo.discountValue}% OFF`
    : `R$ ${parseFloat(promo.discountValue).toFixed(2)} OFF`;

  const days = Math.round((new Date(promo.endDate).getTime() - new Date(promo.startDate).getTime()) / 86400000);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg text-gray-900">{promo.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {fmtDate(promo.startDate)} → {fmtDate(promo.endDate)} · {days} dias · {discLabel}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {promo.targetType !== 'all' && (
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <Tag className="w-3.5 h-3.5" />
          <span>Alvo: <strong className="text-gray-700">{promo.targetName || promo.targetId}</strong>
            {' '}({promo.targetType === 'group' ? 'Grupo' : promo.targetType === 'collection' ? 'Subgrupo' : 'Produto'})</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-xs text-red-500 text-center py-4">Não foi possível carregar os dados desta promoção.</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Pedidos', value: data.orderCount.toString(), icon: ShoppingBag, color: BORDEAUX },
              { label: 'Receita', value: fmtR$(data.revenue), icon: DollarSign, color: '#16a34a' },
              { label: 'Itens Vendidos', value: data.itemsSold.toString(), icon: Package, color: GOLD },
              { label: 'Ticket Médio', value: data.orderCount > 0 ? fmtR$(data.avgOrderValue) : '—', icon: BarChart3, color: '#3b82f6' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl p-4 border border-gray-100 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${color}18` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {data.estimatedDiscount > 0 && (
            <div className="rounded-xl p-4 border flex items-center gap-4"
              style={{ backgroundColor: 'rgba(139,26,26,0.04)', borderColor: 'rgba(139,26,26,0.15)' }}>
              <Percent className="w-5 h-5 flex-shrink-0" style={{ color: BORDEAUX }} />
              <div>
                <p className="text-xs text-gray-500">Desconto estimado concedido</p>
                <p className="font-semibold" style={{ color: BORDEAUX }}>{fmtR$(data.estimatedDiscount)}</p>
              </div>
            </div>
          )}

          {data.topProducts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Top Produtos no Período</p>
              <div className="space-y-2">
                {data.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-700 truncate max-w-[55%]">{p.name}</span>
                    <div className="flex gap-4 text-right">
                      <span className="text-gray-400 text-xs">{p.qty} un.</span>
                      <span className="font-medium text-gray-800">{fmtR$(p.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.orderCount === 0 && (
            <div className="text-center py-8 text-gray-400">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {status === 'scheduled' ? 'Promoção ainda não iniciou' : 'Nenhum pedido no período desta promoção'}
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

const EMPTY_FORM = {
  name: '',
  description: '',
  discountType: 'percentage' as DiscountType,
  discountValue: '',
  targetType: 'all' as TargetType,
  targetId: '',
  targetName: '',
  startDate: '',
  endDate: '',
  isActive: true,
};

export default function AdminPromotions() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'active' | 'scheduled' | 'expired'>('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: promos = [], isLoading } = useQuery<Promotion[]>({
    queryKey: ['/api/admin/promotions'],
    queryFn: async () => {
      const r = await fetch('/api/admin/promotions', { credentials: 'include' });
      return r.json();
    },
    staleTime: 0,
    refetchInterval: 60_000,
  });

  const { data: groups = [] } = useQuery<TargetOption[]>({
    queryKey: ['/api/groups'],
    queryFn: async () => {
      const r = await fetch('/api/groups');
      const d = await r.json();
      return d.map((g: any) => ({ id: g.id, name: g.name }));
    },
  });

  const { data: collections = [] } = useQuery<TargetOption[]>({
    queryKey: ['/api/collections'],
    queryFn: async () => {
      const r = await fetch('/api/collections');
      const d = await r.json();
      return d.map((c: any) => ({ id: c.id, name: c.title }));
    },
  });

  const { data: products = [] } = useQuery<TargetOption[]>({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const r = await fetch('/api/products');
      const d = await r.json();
      return d.map((p: any) => ({ id: p.id, name: p.name }));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
      const url = editingId ? `/api/admin/promotions/${editingId}` : '/api/admin/promotions';
      const method = editingId ? 'PUT' : 'POST';
      const payload: any = {
        ...data,
        discountValue: data.discountValue,
        targetId: data.targetId || null,
        targetName: data.targetName || null,
      };
      if (!payload.targetId) { payload.targetId = null; payload.targetName = null; }
      const r = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/admin/promotions'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/promotions/${id}`, { method: 'DELETE', credentials: 'include' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/admin/promotions'] });
      if (selectedId === deleteConfirm) setSelectedId(null);
      setDeleteConfirm(null);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const r = await fetch(`/api/admin/promotions/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/admin/promotions'] }),
  });

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(p: Promotion) {
    setEditingId(p.id);
    const toDateInput = (d: string) => new Date(d).toISOString().slice(0, 16);
    setForm({
      name: p.name,
      description: p.description || '',
      discountType: p.discountType,
      discountValue: p.discountValue,
      targetType: p.targetType,
      targetId: p.targetId || '',
      targetName: p.targetName || '',
      startDate: toDateInput(p.startDate),
      endDate: toDateInput(p.endDate),
      isActive: p.isActive,
    });
    setDialogOpen(true);
  }

  function handleTargetChange(targetId: string, type: TargetType) {
    const options = type === 'group' ? groups : type === 'collection' ? collections : products;
    const opt = options.find(o => o.id === targetId);
    setForm(f => ({ ...f, targetId, targetName: opt?.name || '' }));
  }

  const byStatus = {
    active: promos.filter(p => promoStatus(p) === 'active'),
    scheduled: promos.filter(p => promoStatus(p) === 'scheduled'),
    expired: promos.filter(p => promoStatus(p) === 'expired'),
  };

  const displayed = byStatus[tab];
  const selectedPromo = promos.find(p => p.id === selectedId);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-serif text-gray-900">Promoções</h2>
          <p className="text-xs text-gray-500 mt-0.5">Gerencie campanhas e acompanhe resultados</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-promotion"
          className="flex items-center gap-2 text-sm"
          style={{ backgroundColor: GOLD, color: '#000' }}>
          <Plus className="w-4 h-4" /> Nova Promoção
        </Button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Ativas', count: byStatus.active.length, color: '#16a34a', tab: 'active' as const },
          { label: 'Agendadas', count: byStatus.scheduled.length, color: GOLD, tab: 'scheduled' as const },
          { label: 'Encerradas', count: byStatus.expired.length, color: '#64748b', tab: 'expired' as const },
        ].map(({ label, count, color, tab: t }) => (
          <button key={t} onClick={() => setTab(t)}
            className="rounded-xl p-4 border text-left transition-all"
            style={{
              borderColor: tab === t ? color : '#e5e7eb',
              backgroundColor: tab === t ? `${color}08` : '#fff',
            }}>
            <p className="text-2xl font-semibold" style={{ color }}>{count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Left: list */}
        <div className="flex-1 min-w-0 space-y-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)
          ) : displayed.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Percent className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma promoção {tab === 'active' ? 'ativa' : tab === 'scheduled' ? 'agendada' : 'encerrada'}</p>
              {tab === 'active' && <button onClick={openCreate} className="text-xs underline mt-2" style={{ color: GOLD }}>Criar primeira promoção</button>}
            </div>
          ) : (
            displayed.map(p => {
              const status = promoStatus(p);
              const isSelected = selectedId === p.id;
              const discLabel = p.discountType === 'percentage'
                ? `${p.discountValue}% OFF`
                : `R$ ${parseFloat(p.discountValue).toFixed(2)} OFF`;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border bg-white cursor-pointer transition-all hover:shadow-md"
                  style={{ borderColor: isSelected ? GOLD : '#e5e7eb', boxShadow: isSelected ? `0 0 0 2px ${GOLD}22` : '' }}
                  onClick={() => setSelectedId(isSelected ? null : p.id)}
                  data-testid={`card-promotion-${p.id}`}
                >
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: status === 'active' ? 'rgba(22,163,74,0.1)' : status === 'scheduled' ? 'rgba(201,169,110,0.12)' : 'rgba(100,116,139,0.08)' }}>
                        <Percent className="w-5 h-5" style={{ color: status === 'active' ? '#16a34a' : status === 'scheduled' ? GOLD : '#94a3b8' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: BORDEAUX }}>{discLabel}</span>
                          {p.targetType !== 'all' && (
                            <span className="text-xs text-gray-400 truncate">· {p.targetName || 'Alvo específico'}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {fmtDate(p.startDate)} → {fmtDate(p.endDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={status} />
                      <button onClick={e => { e.stopPropagation(); openEdit(p); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        data-testid={`button-edit-promotion-${p.id}`}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteConfirm(p.id); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        data-testid={`button-delete-promotion-${p.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Toggle active */}
                  <div className="px-4 pb-3 flex items-center gap-2 border-t border-gray-50 pt-2"
                    onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-gray-400">Ativo</span>
                    <button
                      onClick={() => toggleActive.mutate({ id: p.id, isActive: !p.isActive })}
                      className="relative inline-flex h-4 w-8 items-center rounded-full transition-colors"
                      style={{ backgroundColor: p.isActive ? GOLD : '#d1d5db' }}>
                      <span className="inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform"
                        style={{ transform: p.isActive ? 'translateX(17px)' : 'translateX(2px)' }} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Right: insights panel */}
        <AnimatePresence>
          {selectedPromo && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 380 }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              className="flex-shrink-0 overflow-hidden"
            >
              <div className="w-[380px] rounded-xl border border-gray-200 bg-white p-5 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <TrendingUp className="w-4 h-4" style={{ color: GOLD }} />
                    Insights da Promoção
                  </span>
                  <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-700 text-xs">✕</button>
                </div>
                <InsightsPanel promoId={selectedPromo.id} promo={selectedPromo} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); setEditingId(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? 'Editar Promoção' : 'Nova Promoção'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Nome da Promoção *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Black Friday Vinhos" data-testid="input-promotion-name" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Descrição</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descrição opcional" data-testid="input-promotion-description" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Tipo de Desconto</label>
                <select
                  value={form.discountType}
                  onChange={e => setForm(f => ({ ...f, discountType: e.target.value as DiscountType }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  data-testid="select-promotion-discount-type">
                  <option value="percentage">Percentual (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">
                  {form.discountType === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}
                </label>
                <Input type="number" min="0" step="0.01"
                  value={form.discountValue}
                  onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                  placeholder={form.discountType === 'percentage' ? '15' : '20.00'}
                  data-testid="input-promotion-value" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Aplicar em</label>
              <select
                value={form.targetType}
                onChange={e => setForm(f => ({ ...f, targetType: e.target.value as TargetType, targetId: '', targetName: '' }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                data-testid="select-promotion-target-type">
                <option value="all">Toda a loja</option>
                <option value="group">Grupo específico</option>
                <option value="collection">Subgrupo específico</option>
                <option value="product">Produto específico</option>
              </select>
            </div>

            {form.targetType !== 'all' && (
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">
                  {form.targetType === 'group' ? 'Selecionar Grupo' : form.targetType === 'collection' ? 'Selecionar Subgrupo' : 'Selecionar Produto'}
                </label>
                <select
                  value={form.targetId}
                  onChange={e => handleTargetChange(e.target.value, form.targetType)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  data-testid="select-promotion-target">
                  <option value="">-- Selecione --</option>
                  {(form.targetType === 'group' ? groups : form.targetType === 'collection' ? collections : products)
                    .map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />Início
                </label>
                <Input type="datetime-local" value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  data-testid="input-promotion-start" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />Fim
                </label>
                <Input type="datetime-local" value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  data-testid="input-promotion-end" />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4" data-testid="checkbox-promotion-active" />
              <span className="text-sm">Ativa</span>
            </label>

            {saveMutation.isError && (
              <p className="text-xs text-red-600">Erro ao salvar promoção. Verifique os campos.</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancelar</Button>
              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={!form.name || !form.discountValue || !form.startDate || !form.endDate || saveMutation.isPending}
                className="flex-1"
                style={{ backgroundColor: GOLD, color: '#000' }}
                data-testid="button-save-promotion">
                {saveMutation.isPending ? 'Salvando...' : editingId ? 'Salvar' : 'Criar Promoção'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir promoção?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Essa ação não pode ser desfeita. O histórico de pedidos associado será mantido.</p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending} className="flex-1"
              data-testid="button-confirm-delete-promotion">
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
