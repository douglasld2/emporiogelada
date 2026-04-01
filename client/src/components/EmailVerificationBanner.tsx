import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Mail, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!user || user.emailVerified || isDismissed) {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "E-mail enviado!",
          description: "Verifique sua caixa de entrada (e spam).",
        });
      } else {
        if (data.error === "Este e-mail já foi verificado") {
          await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
          toast({
            title: "E-mail já verificado!",
            description: "Sua conta já está ativa.",
          });
        } else {
          toast({
            title: "Erro",
            description: data.error || "Falha ao reenviar e-mail",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao reenviar e-mail de verificação",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white px-4 py-2.5 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Mail className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            Seu e-mail ainda não foi verificado. Verifique sua caixa de entrada para ativar sua conta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleResend}
            disabled={isResending}
            className="bg-white text-amber-600 hover:bg-amber-50 text-xs font-medium"
            data-testid="button-resend-verification-banner"
          >
            {isResending ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="w-3 h-3 mr-1.5" />
                Reenviar e-mail
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            className="text-white hover:bg-amber-600 text-xs"
            data-testid="button-refresh-verification-status"
          >
            Já verifiquei
          </Button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 hover:bg-amber-600 rounded transition-colors"
            aria-label="Fechar"
            data-testid="button-dismiss-verification-banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
