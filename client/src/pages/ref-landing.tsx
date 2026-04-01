import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Gift, ShoppingBag, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GOLD = '#c9a96e';

interface RefInfo {
  valid: boolean;
  referrerName: string;
  rewardType: 'percentage' | 'fixed';
  rewardValue: number;
  minReferredPurchase: number;
  referredRewardType: 'percentage' | 'fixed';
  referredRewardValue: number;
}

export default function RefLandingPage() {
  const { code } = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const [saved, setSaved] = useState(false);

  const { data: info, isLoading, isError } = useQuery<RefInfo>({
    queryKey: ['referral-info', code],
    queryFn: async () => {
      const res = await fetch(`/api/referral/info/${code}`);
      if (!res.ok) throw new Error('invalid');
      return res.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (info?.valid && code) {
      localStorage.setItem('referral_code', code.toUpperCase());
      setSaved(true);
    }
  }, [info, code]);

  const referredRewardLabel = info && info.referredRewardValue > 0
    ? info.referredRewardType === 'percentage'
      ? `${info.referredRewardValue}% de desconto`
      : `R$ ${Number(info.referredRewardValue).toFixed(2).replace('.', ',')} de desconto`
    : null;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {isLoading && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: GOLD }} />
            <p className="text-white/60 text-sm">Verificando convite...</p>
          </div>
        )}

        {isError && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center mx-auto">
              <Gift className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-serif text-white">Link inválido</h1>
            <p className="text-white/60">Este link de indicação não existe ou expirou.</p>
            <Button onClick={() => navigate('/shop')} className="mt-4 text-black font-medium" style={{ backgroundColor: GOLD }}>
              Ver a loja
            </Button>
          </div>
        )}

        {info?.valid && (
          <div className="space-y-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.2) 0%, rgba(201,169,110,0.05) 100%)', border: '1px solid rgba(201,169,110,0.3)' }}
            >
              <Sparkles className="w-10 h-10" style={{ color: GOLD }} />
            </div>

            <div>
              <p className="text-sm uppercase tracking-widest mb-2" style={{ color: GOLD }}>Convite especial</p>
              <h1 className="text-3xl font-serif text-white mb-3">
                {info.referrerName} te convidou!
              </h1>
              <p className="text-white/70 leading-relaxed">
                Você foi convidado para o <strong className="text-white">Empório Gelada</strong> — a melhor seleção de bebidas e tabacaria premium da região.
              </p>
            </div>

            {/* Referred person's discount banner */}
            {referredRewardLabel && (
              <div
                className="rounded-xl p-4"
                style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.15) 0%, rgba(201,169,110,0.05) 100%)', border: '1px solid rgba(201,169,110,0.35)' }}
              >
                <p className="text-xs uppercase tracking-widest mb-1 font-medium" style={{ color: GOLD }}>Seu benefício</p>
                <p className="text-2xl font-serif text-white font-bold">{referredRewardLabel}</p>
                <p className="text-white/60 text-sm mt-1">
                  na sua primeira compra
                  {info.minReferredPurchase > 0 && <> acima de <strong className="text-white">R$ {Number(info.minReferredPurchase).toFixed(2).replace('.', ',')}</strong></>}
                </p>
              </div>
            )}

            <div
              className="rounded-xl p-4 text-sm text-left space-y-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="font-medium text-white/80">Como funciona:</p>
              <ul className="space-y-2 text-white/60">
                <li className="flex items-start gap-2">
                  <span style={{ color: GOLD }} className="font-bold flex-shrink-0">1.</span>
                  <span>Crie sua conta no Empório Gelada</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: GOLD }} className="font-bold flex-shrink-0">2.</span>
                  <span>
                    Faça{' '}
                    {info.minReferredPurchase > 0
                      ? <>sua compra acima de <strong className="text-white/80">R$ {Number(info.minReferredPurchase).toFixed(2).replace('.', ',')}</strong></>
                      : 'sua primeira compra'
                    }
                  </span>
                </li>
                {referredRewardLabel && (
                  <li className="flex items-start gap-2">
                    <span style={{ color: GOLD }} className="font-bold flex-shrink-0">3.</span>
                    <span>O desconto de <strong style={{ color: GOLD }}>{referredRewardLabel}</strong> é aplicado automaticamente no checkout</span>
                  </li>
                )}
                {!referredRewardLabel && (
                  <li className="flex items-start gap-2">
                    <span style={{ color: GOLD }} className="font-bold flex-shrink-0">3.</span>
                    <span>Aproveite os melhores rótulos com entrega rápida</span>
                  </li>
                )}
              </ul>
            </div>

            {saved && (
              <p className="text-xs text-white/40">✓ Código de indicação registrado</p>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate('/shop')}
                className="w-full text-black font-medium h-12 rounded-xl text-sm uppercase tracking-widest"
                style={{ backgroundColor: GOLD }}
                data-testid="button-referral-shop"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                {referredRewardLabel ? `Aproveitar ${referredRewardLabel}` : 'Explorar a loja'}
              </Button>
              <Button
                onClick={() => navigate('/register')}
                variant="outline"
                className="w-full h-12 rounded-xl text-sm uppercase tracking-widest border-white/20 text-white hover:bg-white/5"
                data-testid="button-referral-register"
              >
                Criar minha conta
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
