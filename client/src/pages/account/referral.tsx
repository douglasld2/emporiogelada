import { AccountLayout } from '@/components/AccountLayout';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';
import { Link2, Copy, Check, Gift, Clock, CheckCircle, XCircle, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const GOLD = '#c9a96e';

interface ReferralCode { code: string; link: string }
interface Referral {
  id: string;
  referredEmail: string;
  status: 'pending' | 'available' | 'used';
  rewardType: string;
  rewardValue: string;
  createdAt: string;
}
interface MyReferrals {
  referrals: Referral[];
  availableReward: Referral | null;
  availableCount: number;
  rewardType: string;
  rewardValue: number;
  minReferrerPurchase: number;
}

const STATUS_CONFIG = {
  pending: { label: 'Aguardando compra', icon: Clock, color: '#f59e0b' },
  available: { label: 'Recompensa disponível!', icon: CheckCircle, color: '#16a34a' },
  used: { label: 'Recompensa usada', icon: Check, color: '#9ca3af' },
};

export default function AccountReferral() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: codeData } = useQuery<ReferralCode>({
    queryKey: ['referral-code'],
    queryFn: async () => {
      const res = await fetch('/api/referral/code', { credentials: 'include' });
      return res.json();
    },
    enabled: !!user,
  });

  const { data: myData } = useQuery<MyReferrals>({
    queryKey: ['referral-my'],
    queryFn: async () => {
      const res = await fetch('/api/referral/my', { credentials: 'include' });
      return res.json();
    },
    enabled: !!user,
  });

  const handleCopy = () => {
    if (codeData?.link) {
      navigator.clipboard.writeText(codeData.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const rewardLabel = myData
    ? myData.rewardType === 'percentage'
      ? `${myData.rewardValue}%`
      : `R$ ${Number(myData.rewardValue).toFixed(2).replace('.', ',')}`
    : '';

  const availableCount = myData?.availableCount ?? 0;

  return (
    <AccountLayout>
      <h1 className="text-2xl font-serif mb-8">Indicações</h1>

      {/* Your referral link */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)', border: '1px solid rgba(201,169,110,0.2)' }}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-5 h-5" style={{ color: GOLD }} />
            <p className="font-semibold text-white text-sm uppercase tracking-widest" style={{ color: GOLD }}>Seu link de indicação</p>
          </div>
          <p className="text-white/70 text-sm mb-5">
            Compartilhe o link abaixo. Quando um amigo fizer a primeira compra qualificada
            você ganha <strong style={{ color: GOLD }}>{rewardLabel || '...'} de desconto</strong> para usar em uma compra.
            Cada indicação gera <strong className="text-white/90">1 crédito de desconto</strong> — créditos acumulam, mas apenas 1 é usado por compra.
          </p>

          {codeData ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Link2 className="w-4 h-4 text-white/40 flex-shrink-0" />
                <span className="text-white text-sm flex-1 truncate">{codeData.link}</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-black"
                  style={{ backgroundColor: copied ? '#16a34a' : GOLD }}
                  data-testid="button-copy-referral-link"
                >
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                </button>
              </div>
              <p className="text-white/40 text-xs text-center">Código: <strong className="text-white/60">{codeData.code}</strong></p>
            </div>
          ) : (
            <div className="animate-pulse h-10 rounded-lg bg-white/10" />
          )}
        </div>

        {/* Available reward banner */}
        {availableCount > 0 && (
          <div className="px-6 py-3 border-t flex items-center gap-3" style={{ backgroundColor: 'rgba(22,163,74,0.15)', borderColor: 'rgba(22,163,74,0.3)' }}>
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-400 font-medium text-sm">
                {availableCount === 1
                  ? `1 crédito de ${rewardLabel} disponível`
                  : `${availableCount} créditos de ${rewardLabel} acumulados`}
              </p>
              <p className="text-green-300/70 text-xs">
                1 crédito é usado por compra
                {myData && myData.minReferrerPurchase > 0 && ` (compra mínima R$ ${Number(myData.minReferrerPurchase).toFixed(2).replace('.', ',')})`}.
                {availableCount > 1 && ` Os demais ficam guardados para as próximas compras.`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-widest">Como funciona</h2>
        <div className="space-y-4">
          {[
            { n: '1', text: 'Compartilhe seu link com amigos' },
            { n: '2', text: 'Seu amigo faz a primeira compra qualificada com seu código' },
            { n: '3', text: `Você ganha 1 crédito de ${rewardLabel || '...'} de desconto — 1 crédito por compra, sem acumular %` },
            { n: '4', text: 'Indique mais amigos para acumular mais créditos para suas próximas compras' },
          ].map(step => (
            <div key={step.n} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-black" style={{ backgroundColor: GOLD }}>
                {step.n}
              </div>
              <p className="text-sm text-gray-600 pt-0.5">{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referral list */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-800 text-sm">Histórico de Indicações</h2>
        </div>

        {!myData || myData.referrals.length === 0 ? (
          <div className="py-12 text-center">
            <Gift className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 text-sm">Nenhuma indicação registrada ainda.</p>
            <p className="text-gray-300 text-xs mt-1">Compartilhe seu link para começar!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {myData.referrals.map(r => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={r.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.referredEmail}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(r.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: cfg.color }}>
                    <Icon className="w-4 h-4" />
                    {cfg.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
