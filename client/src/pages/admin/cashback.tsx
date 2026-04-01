import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/lib/StoreContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Pencil, Trash2, X, Save, Settings, Percent, Tag, FolderOpen, Grid, Package,
  ToggleLeft, ToggleRight, Wallet, BarChart3, TrendingUp, TrendingDown, Users, ArrowUpRight, ArrowDownLeft, Clock, ChevronDown, ChevronRight as ChevronRightIcon,
} from 'lucide-react';

const GOLD = '#c9a96e';
const BORDEAUX = '#8b1a1a';

interface CashbackRule {
  id: string;
  targetType: 'group' | 'collection' | 'product';
  targetId: string;
  targetName: string;
  percentage: string;
  isActive: boolean;
  createdAt: string;
}

interface RuleInsight {
  ruleId: string;
  targetName: string;
  targetType: string;
  percentage: string;
  isActive: boolean;
  totalEarned: number;
  transactionCount: number;
  lastUsed: string | null;
}

interface Dashboard {
  totalEarned: number;
  totalSpent: number;
  circulatingBalance: number;
  usersWithBalance: number;
  transactionCount: number;
  perRule: RuleInsight[];
}

interface CashbackSettings {
  minPurchase: number;
  maxDiscountPct: number;
  enabled: boolean;
}

function TargetIcon({ type, size = 4 }: { type: string; size?: number }) {
  const cls = `w-${size} h-${size}`;
  if (type === 'group') return <FolderOpen className={cls} style={{ color: GOLD }} />;
  if (type === 'collection') return <Grid className={cls} style={{ color: BORDEAUX }} />;
  return <Package className={`${cls} text-gray-500`} />;
}

const TARGET_LABELS: Record<string, string> = {
  group: 'Grupo',
  collection: 'Subgrupo',
  product: 'Produto',
};

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <div className="p-2 rounded-lg" style={{ backgroundColor: color ? `${color}18` : '#f3f4f6' }}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-serif text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function AdminCashback() {
  const queryClient = useQueryClient();
  const { groups, collections } = useStore();
  const [tab, setTab] = useState<'dashboard' | 'rules' | 'settings'>('dashboard');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<CashbackRule | null>(null);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const [form, setForm] = useState({
    targetType: 'group' as 'group' | 'collection' | 'product',
    targetId: '',
    targetName: '',
    percentage: '',
    isActive: true,
  });

  const [settingsForm, setSettingsForm] = useState<CashbackSettings>({ minPurchase: 0, maxDiscountPct: 100, enabled: true });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: rules = [], isLoading } = useQuery<CashbackRule[]>({
    queryKey: ['cashback-rules'],
    queryFn: async () => {
      const res = await fetch('/api/admin/cashback/rules', { credentials: 'include' });
      if (!res.ok) throw new Error('Unauthorized');
      return res.json();
    },
  });

  const { data: dashboard, isLoading: dashLoading } = useQuery<Dashboard>({
    queryKey: ['cashback-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/admin/cashback/dashboard', { credentials: 'include' });
      if (!res.ok) throw new Error('Unauthorized');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: settings } = useQuery<CashbackSettings>({
    queryKey: ['cashback-settings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/cashback/settings', { credentials: 'include' });
      if (!res.ok) throw new Error('Unauthorized');
      return res.json();
    },
    onSuccess: (data) => setSettingsForm(data),
  } as any);

  useState(() => {
    if (settings) setSettingsForm(settings);
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/api/admin/cashback/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, percentage: parseFloat(data.percentage) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao criar regra');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashback-rules'] });
      queryClient.invalidateQueries({ queryKey: ['cashback-dashboard'] });
      closeDialog();
    },
    onError: (e: any) => setFormError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof form> & { isActive?: boolean } }) => {
      const res = await fetch(`/api/admin/cashback/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, percentage: data.percentage ? parseFloat(data.percentage) : undefined }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashback-rules'] });
      queryClient.invalidateQueries({ queryKey: ['cashback-dashboard'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/cashback/rules/${id}`, { method: 'DELETE', credentials: 'include' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashback-rules'] });
      queryClient.invalidateQueries({ queryKey: ['cashback-dashboard'] });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: CashbackSettings) => {
      const res = await fetch('/api/admin/cashback/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashback-settings'] });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ targetType: 'group', targetId: '', targetName: '', percentage: '', isActive: true });
    setFormError(null);
    setShowDialog(true);
  }

  function openEdit(rule: CashbackRule) {
    setEditing(rule);
    setForm({ targetType: rule.targetType, targetId: rule.targetId, targetName: rule.targetName, percentage: rule.percentage, isActive: rule.isActive });
    setFormError(null);
    setShowDialog(true);
  }

  function closeDialog() {
    setShowDialog(false);
    setEditing(null);
    setFormError(null);
  }

  function handleTargetChange(targetId: string) {
    let targetName = targetId;
    if (form.targetType === 'group') {
      targetName = groups.find(g => g.id === targetId)?.name || targetId;
    } else if (form.targetType === 'collection') {
      targetName = collections.find(c => c.id === targetId)?.title || targetId;
    }
    setForm(f => ({ ...f, targetId, targetName }));
  }

  function handleSubmit() {
    setFormError(null);
    if (!form.targetId || !form.percentage) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (parseFloat(form.percentage) <= 0 || parseFloat(form.percentage) > 100) {
      setFormError('Percentual deve ser entre 0.01% e 100%.');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const targetOptions = {
    group: groups.map(g => ({ id: g.id, label: g.name })),
    collection: collections.map(c => ({ id: c.id, label: c.title })),
    product: [],
  };

  const insightByRuleId = (dashboard?.perRule ?? []).reduce<Record<string, RuleInsight>>((acc, r) => {
    acc[r.ruleId] = r;
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-gray-900">Cashback</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gerencie regras, visualize métricas e configure o programa de cashback</p>
          </div>
          {tab === 'rules' && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-black transition-opacity hover:opacity-80"
              style={{ backgroundColor: GOLD }}
              data-testid="button-add-cashback-rule"
            >
              <Plus className="w-4 h-4" /> Nova Regra
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {([
            { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { key: 'rules', label: 'Regras', icon: Percent },
            { key: 'settings', label: 'Configurações', icon: Settings },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: tab === t.key ? 'white' : 'transparent',
                color: tab === t.key ? '#111' : '#666',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ── */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            {dashLoading ? (
              <div className="text-center py-16 text-gray-400">Carregando dados...</div>
            ) : (
              <>
                {/* Overview cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={<TrendingUp className="w-5 h-5" style={{ color: '#16a34a' }} />}
                    label="Total Emitido"
                    value={`R$ ${fmt(dashboard?.totalEarned ?? 0)}`}
                    sub="Cashback gerado para clientes"
                    color="#16a34a"
                  />
                  <StatCard
                    icon={<TrendingDown className="w-5 h-5" style={{ color: BORDEAUX }} />}
                    label="Total Resgatado"
                    value={`R$ ${fmt(dashboard?.totalSpent ?? 0)}`}
                    sub="Cashback usado em compras"
                    color={BORDEAUX}
                  />
                  <StatCard
                    icon={<Wallet className="w-5 h-5" style={{ color: GOLD }} />}
                    label="Saldo Circulante"
                    value={`R$ ${fmt(dashboard?.circulatingBalance ?? 0)}`}
                    sub="Saldo total nas carteiras"
                    color={GOLD}
                  />
                  <StatCard
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    label="Clientes com Saldo"
                    value={String(dashboard?.usersWithBalance ?? 0)}
                    sub={`${dashboard?.transactionCount ?? 0} transações no total`}
                    color="#2563eb"
                  />
                </div>

                {/* Retention visual */}
                {(dashboard?.totalEarned ?? 0) > 0 && (() => {
                  const earned = dashboard!.totalEarned;
                  const spent = dashboard!.totalSpent;
                  const redPct = earned > 0 ? Math.min(100, (spent / earned) * 100) : 0;
                  const greenPct = 100 - redPct;
                  return (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Taxa de Aproveitamento</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Resgatado vs. Emitido</span>
                          <span className="font-medium text-gray-800">
                            {redPct > 0 ? `${redPct.toFixed(1)}% resgatado` : 'Nenhum resgate ainda'}
                          </span>
                        </div>
                        <div className="w-full h-3 rounded-full overflow-hidden flex">
                          {redPct > 0 && (
                            <div
                              className="h-full transition-all duration-500"
                              style={{ width: `${redPct}%`, backgroundColor: BORDEAUX }}
                            />
                          )}
                          <div
                            className="h-full transition-all duration-500"
                            style={{ width: `${greenPct}%`, backgroundColor: '#16a34a' }}
                          />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-400">Resgatado: <strong style={{ color: BORDEAUX }}>R$ {fmt(spent)}</strong></span>
                          <span className="text-gray-400">Emitido: <strong style={{ color: '#16a34a' }}>R$ {fmt(earned)}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Per-rule breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" style={{ color: GOLD }} />
                    <h3 className="font-semibold text-gray-800 text-sm">Cashback por Regra</h3>
                  </div>
                  {(dashboard?.perRule ?? []).length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-sm">Nenhuma regra cadastrada ainda.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-5 py-3 font-medium text-gray-500">Regra</th>
                          <th className="text-left px-5 py-3 font-medium text-gray-500">%</th>
                          <th className="text-right px-5 py-3 font-medium text-gray-500">Emitido</th>
                          <th className="text-right px-5 py-3 font-medium text-gray-500">Transações</th>
                          <th className="text-right px-5 py-3 font-medium text-gray-500">Último uso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(dashboard?.perRule ?? []).map(r => (
                          <tr key={r.ruleId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <TargetIcon type={r.targetType} size={3} />
                                <div>
                                  <p className="font-medium text-gray-900 text-xs">{r.targetName}</p>
                                  <p className="text-xs text-gray-400">{TARGET_LABELS[r.targetType]}</p>
                                </div>
                                {!r.isActive && (
                                  <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">Inativa</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(201,169,110,0.12)', color: GOLD }}>
                                <Percent className="w-2.5 h-2.5" />
                                {Number(r.percentage).toFixed(1)}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-medium" style={{ color: r.totalEarned > 0 ? '#16a34a' : '#9ca3af' }}>
                              R$ {fmt(r.totalEarned)}
                            </td>
                            <td className="px-5 py-3 text-right text-gray-700">{r.transactionCount}</td>
                            <td className="px-5 py-3 text-right text-gray-500 text-xs">
                              {r.lastUsed ? format(new Date(r.lastUsed), 'dd/MM/yy', { locale: ptBR }) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── RULES TAB ── */}
        {tab === 'rules' && (
          <div>
            <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
              <strong>Hierarquia de cashback:</strong> Se um Grupo tem cashback, ele se aplica a todos os subgrupos e produtos daquele grupo — não é possível acumular com regras de nível inferior.
              <span className="block mt-1 opacity-70">Prioridade: <strong>Grupo</strong> › Subgrupo › Produto</span>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-gray-400">Carregando...</div>
            ) : rules.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Percent className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma regra de cashback cadastrada.</p>
                <button onClick={openCreate} className="mt-3 text-sm underline" style={{ color: GOLD }}>Criar primeira regra</button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {rules.map((rule, idx) => {
                  const insight = insightByRuleId[rule.id];
                  const isExpanded = expandedRule === rule.id;
                  return (
                    <div key={rule.id} className={idx > 0 ? 'border-t border-gray-100' : ''}>
                      {/* Main row */}
                      <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2 w-28">
                          <TargetIcon type={rule.targetType} />
                          <span className="text-xs text-gray-500">{TARGET_LABELS[rule.targetType]}</span>
                        </div>
                        <div className="flex-1 font-medium text-gray-900 text-sm">{rule.targetName}</div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(201,169,110,0.15)', color: GOLD }}>
                          <Percent className="w-3 h-3" />
                          {Number(rule.percentage).toFixed(2)}%
                        </span>
                        <button
                          onClick={() => updateMutation.mutate({ id: rule.id, data: { isActive: !rule.isActive } })}
                          className="transition-opacity hover:opacity-70 ml-1"
                          data-testid={`button-toggle-cashback-${rule.id}`}
                        >
                          {rule.isActive
                            ? <ToggleRight className="w-6 h-6" style={{ color: '#16a34a' }} />
                            : <ToggleLeft className="w-6 h-6 text-gray-300" />
                          }
                        </button>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(rule)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" data-testid={`button-edit-cashback-${rule.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { if (confirm('Excluir esta regra?')) deleteMutation.mutate(rule.id); }} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" data-testid={`button-delete-cashback-${rule.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            data-testid={`button-insight-cashback-${rule.id}`}
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Insight drawer */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mx-5 mb-3 mt-1 rounded-xl border border-gray-100 bg-gray-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Insight desta regra</p>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                  <p className="text-lg font-serif font-bold" style={{ color: '#16a34a' }}>
                                    R$ {fmt(insight?.totalEarned ?? 0)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">Total emitido</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-serif font-bold text-gray-800">
                                    {insight?.transactionCount ?? 0}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">Pedidos com cashback</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-serif font-bold text-gray-800">
                                    {insight?.lastUsed
                                      ? format(new Date(insight.lastUsed), 'dd/MM/yy', { locale: ptBR })
                                      : '—'}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">Último uso</p>
                                </div>
                              </div>
                              {(insight?.transactionCount ?? 0) === 0 && (
                                <p className="text-center text-xs text-gray-400 mt-3 italic">
                                  Nenhum cashback gerado por esta regra ainda. Começará a aparecer quando pedidos elegíveis forem entregues.
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === 'settings' && (
          <div className="max-w-xl space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Cashback habilitado</p>
                  <p className="text-xs text-gray-500 mt-0.5">Permite que clientes ganhem e usem cashback</p>
                </div>
                <button
                  onClick={() => setSettingsForm(f => ({ ...f, enabled: !f.enabled }))}
                  data-testid="button-toggle-cashback-enabled"
                >
                  {settingsForm.enabled
                    ? <ToggleRight className="w-8 h-8" style={{ color: '#16a34a' }} />
                    : <ToggleLeft className="w-8 h-8 text-gray-300" />
                  }
                </button>
              </div>

              <hr />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Valor mínimo de compra para usar cashback (R$)
                </label>
                <p className="text-xs text-gray-400 mb-2">Defina 0 para não ter valor mínimo</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settingsForm.minPurchase}
                    onChange={e => setSettingsForm(f => ({ ...f, minPurchase: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-gray-500 focus:outline-none"
                    data-testid="input-cashback-min-purchase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Máximo de abatimento no pedido (%)
                </label>
                <p className="text-xs text-gray-400 mb-2">Ex: 50% = o cashback pode pagar no máximo 50% do valor do pedido.</p>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={settingsForm.maxDiscountPct}
                    onChange={e => setSettingsForm(f => ({ ...f, maxDiscountPct: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) }))}
                    className="w-full pl-4 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-gray-500 focus:outline-none"
                    data-testid="input-cashback-max-discount"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => saveSettingsMutation.mutate(settingsForm)}
              disabled={saveSettingsMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-black transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: GOLD }}
              data-testid="button-save-cashback-settings"
            >
              <Save className="w-4 h-4" />
              {saveSettingsMutation.isPending ? 'Salvando...' : settingsSaved ? 'Salvo!' : 'Salvar Configurações'}
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <AnimatePresence>
        {showDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeDialog}
            />
            <motion.div
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-serif text-gray-900">{editing ? 'Editar Regra' : 'Nova Regra de Cashback'}</h2>
                <button onClick={closeDialog} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nível do agrupamento</label>
                  <div className="flex gap-2">
                    {(['group', 'collection'] as const).map(type => (
                      <button
                        key={type}
                        disabled={!!editing}
                        onClick={() => setForm(f => ({ ...f, targetType: type, targetId: '', targetName: '' }))}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-all"
                        style={{
                          borderColor: form.targetType === type ? GOLD : '#e5e7eb',
                          backgroundColor: form.targetType === type ? 'rgba(201,169,110,0.1)' : 'white',
                          color: form.targetType === type ? GOLD : '#6b7280',
                          opacity: editing ? 0.6 : 1,
                        }}
                      >
                        <TargetIcon type={type} />
                        {TARGET_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {TARGET_LABELS[form.targetType]}
                  </label>
                  {targetOptions[form.targetType].length > 0 ? (
                    <select
                      disabled={!!editing}
                      value={form.targetId}
                      onChange={e => handleTargetChange(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500 disabled:bg-gray-50"
                      data-testid="select-cashback-target"
                    >
                      <option value="">Selecione...</option>
                      {targetOptions[form.targetType].map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      disabled={!!editing}
                      value={form.targetId}
                      onChange={e => setForm(f => ({ ...f, targetId: e.target.value, targetName: e.target.value }))}
                      placeholder="ID do produto"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Percentual de cashback (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.01"
                      max="100"
                      step="0.01"
                      value={form.percentage}
                      onChange={e => setForm(f => ({ ...f, percentage: e.target.value }))}
                      placeholder="Ex: 5.00"
                      className="w-full pl-4 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500"
                      data-testid="input-cashback-percentage"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">Regra ativa</span>
                  <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                    {form.isActive
                      ? <ToggleRight className="w-7 h-7" style={{ color: '#16a34a' }} />
                      : <ToggleLeft className="w-7 h-7 text-gray-300" />
                    }
                  </button>
                </div>

                {formError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={closeDialog} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-black transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: GOLD }}
                  data-testid="button-save-cashback-rule"
                >
                  <Save className="w-4 h-4" />
                  {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
