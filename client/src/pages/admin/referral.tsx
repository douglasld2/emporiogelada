import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ToggleLeft, ToggleRight, Users, Gift, Clock, CheckCircle, Check, Percent, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const GOLD = '#c9a96e';

interface ReferralSettings {
  enabled: boolean;
  minReferredPurchase: number;
  rewardType: 'percentage' | 'fixed';
  rewardValue: number;
  minReferrerPurchase: number;
  referredRewardType: 'percentage' | 'fixed';
  referredRewardValue: number;
}

interface ReferralEntry {
  id: string;
  referrerId: string;
  referrerName?: string;
  referrerEmail?: string;
  referredEmail: string;
  rewardType: string;
  rewardValue: string;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Aguardando', color: '#f59e0b' },
  available: { label: 'Disponível', color: '#16a34a' },
  used: { label: 'Usado', color: '#9ca3af' },
};

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-2xl font-serif" style={{ color: color || '#111' }}>{value}</p>
      <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}

export default function AdminReferral() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'activity' | 'settings'>('activity');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<ReferralSettings>({
    enabled: true,
    minReferredPurchase: 0,
    rewardType: 'percentage',
    rewardValue: 10,
    minReferrerPurchase: 0,
    referredRewardType: 'percentage',
    referredRewardValue: 0,
  });

  const { data: settings } = useQuery<ReferralSettings>({
    queryKey: ['admin-referral-settings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/referral/settings', { credentials: 'include' });
      return res.json();
    },
    onSuccess: (d: ReferralSettings) => setForm(d),
  } as any);

  const { data: list = [] } = useQuery<ReferralEntry[]>({
    queryKey: ['admin-referral-list'],
    queryFn: async () => {
      const res = await fetch('/api/admin/referral/list', { credentials: 'include' });
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ReferralSettings) => {
      const res = await fetch('/api/admin/referral/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referral-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const total = list.length;
  const available = list.filter(r => r.status === 'available').length;
  const used = list.filter(r => r.status === 'used').length;
  const pending = list.filter(r => r.status === 'pending').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-gray-900">Link de Indicação</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gerencie o programa de indicação e configure recompensas</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {([
            { key: 'activity', label: 'Atividade', icon: Users },
            { key: 'settings', label: 'Configurações', icon: Gift },
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

        {/* Activity Tab */}
        {tab === 'activity' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total de indicações" value={total} />
              <StatCard label="Aguardando compra" value={pending} color="#f59e0b" />
              <StatCard label="Recompensas disponíveis" value={available} color="#16a34a" />
              <StatCard label="Recompensas usadas" value={used} color="#9ca3af" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-sm">Todas as indicações</h3>
              </div>
              {list.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma indicação registrada ainda.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Indicador</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Indicado</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Recompensa</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(r => {
                      const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
                      return (
                        <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-900">{r.referrerName || '—'}</p>
                            <p className="text-xs text-gray-400">{r.referrerEmail || r.referrerId.slice(0, 8)}</p>
                          </td>
                          <td className="px-5 py-3 text-gray-700">{r.referredEmail}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(201,169,110,0.12)', color: GOLD }}>
                              {r.rewardType === 'percentage'
                                ? <><Percent className="w-3 h-3" />{Number(r.rewardValue).toFixed(1)}%</>
                                : <><DollarSign className="w-3 h-3" />R$ {Number(r.rewardValue).toFixed(2)}</>
                              }
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                          </td>
                          <td className="px-5 py-3 text-right text-gray-500 text-xs">
                            {format(new Date(r.createdAt), 'dd/MM/yy', { locale: ptBR })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="max-w-xl space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

              {/* Enable */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Programa de indicação ativo</p>
                  <p className="text-xs text-gray-500 mt-0.5">Clientes podem gerar e compartilhar links</p>
                </div>
                <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))} data-testid="toggle-referral-enabled">
                  {form.enabled
                    ? <ToggleRight className="w-8 h-8" style={{ color: '#16a34a' }} />
                    : <ToggleLeft className="w-8 h-8 text-gray-300" />
                  }
                </button>
              </div>

              <hr />

              {/* Reward type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de recompensa para o indicador</label>
                <div className="flex gap-2">
                  {([
                    { value: 'percentage', label: 'Porcentagem (%)', icon: Percent },
                    { value: 'fixed', label: 'Valor fixo (R$)', icon: DollarSign },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setForm(f => ({ ...f, rewardType: opt.value }))}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium transition-all"
                      style={{
                        borderColor: form.rewardType === opt.value ? GOLD : '#e5e7eb',
                        backgroundColor: form.rewardType === opt.value ? 'rgba(201,169,110,0.08)' : 'white',
                        color: form.rewardType === opt.value ? GOLD : '#6b7280',
                      }}
                      data-testid={`button-reward-type-${opt.value}`}
                    >
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reward value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Valor da recompensa do indicador
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {form.rewardType === 'percentage' ? '%' : 'R$'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step={form.rewardType === 'percentage' ? '1' : '0.01'}
                    value={form.rewardValue}
                    onChange={e => setForm(f => ({ ...f, rewardValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500"
                    data-testid="input-reward-value"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">O indicador receberá este desconto na sua próxima compra</p>
              </div>

              <hr />

              {/* Min referred purchase */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Compra mínima do indicado para qualificar a indicação (R$)
                </label>
                <p className="text-xs text-gray-400 mb-2">O indicado deve gastar pelo menos este valor na primeira compra. Use 0 para qualquer valor.</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minReferredPurchase}
                    onChange={e => setForm(f => ({ ...f, minReferredPurchase: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500"
                    data-testid="input-min-referred-purchase"
                  />
                </div>
              </div>

              {/* Min referrer purchase */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Compra mínima do indicador para usar o desconto (R$)
                </label>
                <p className="text-xs text-gray-400 mb-2">O indicador deve gastar pelo menos este valor para poder usar a recompensa. Use 0 para qualquer valor.</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minReferrerPurchase}
                    onChange={e => setForm(f => ({ ...f, minReferrerPurchase: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500"
                    data-testid="input-min-referrer-purchase"
                  />
                </div>
              </div>
            </div>

            {/* Referred person discount */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              <div>
                <p className="font-semibold text-gray-900">Desconto de boas-vindas (indicado)</p>
                <p className="text-xs text-gray-500 mt-0.5">Desconto que o indicado recebe na sua primeira compra. Use 0 para não dar desconto ao indicado.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de desconto para o indicado</label>
                <div className="flex gap-2">
                  {([
                    { value: 'percentage', label: 'Porcentagem (%)', icon: Percent },
                    { value: 'fixed', label: 'Valor fixo (R$)', icon: DollarSign },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setForm(f => ({ ...f, referredRewardType: opt.value }))}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium transition-all"
                      style={{
                        borderColor: form.referredRewardType === opt.value ? GOLD : '#e5e7eb',
                        backgroundColor: form.referredRewardType === opt.value ? 'rgba(201,169,110,0.08)' : 'white',
                        color: form.referredRewardType === opt.value ? GOLD : '#6b7280',
                      }}
                      data-testid={`button-referred-reward-type-${opt.value}`}
                    >
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Valor do desconto para o indicado
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {form.referredRewardType === 'percentage' ? '%' : 'R$'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step={form.referredRewardType === 'percentage' ? '1' : '0.01'}
                    value={form.referredRewardValue}
                    onChange={e => setForm(f => ({ ...f, referredRewardValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500"
                    data-testid="input-referred-reward-value"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Aplicado automaticamente no checkout da primeira compra do indicado</p>
              </div>
            </div>

            <button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-black transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: GOLD }}
              data-testid="button-save-referral-settings"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Configurações'}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
