import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Token de verificação não encontrado.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'E-mail verificado com sucesso!');
          queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        } else {
          setStatus('error');
          setMessage(data.error || 'Erro ao verificar e-mail.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Erro de conexão. Tente novamente.');
      }
    };

    verifyEmail();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-md mx-auto text-center">
          {status === 'loading' && (
            <div className="space-y-6">
              <Loader2 className="w-16 h-16 mx-auto animate-spin text-gray-400" />
              <h1 className="text-2xl font-serif">Verificando seu e-mail...</h1>
              <p className="text-gray-500">Por favor, aguarde.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="w-20 h-20 mx-auto bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-serif">E-mail Verificado!</h1>
              <p className="text-gray-500">{message}</p>
              <p className="text-gray-500">Sua conta está ativada e você já pode aproveitar todas as funcionalidades.</p>
              <div className="pt-4 space-y-3">
                <Link href="/account">
                  <Button className="w-full bg-black text-white hover:bg-gray-800 h-12 rounded-none uppercase tracking-widest" data-testid="button-go-to-account">
                    Ir para Minha Conta
                  </Button>
                </Link>
                <Link href="/shop">
                  <Button variant="outline" className="w-full h-12 rounded-none uppercase tracking-widest border-black" data-testid="button-continue-shopping">
                    Continuar Comprando
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="w-20 h-20 mx-auto bg-red-50 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-serif">Erro na Verificação</h1>
              <p className="text-gray-500">{message}</p>
              <div className="pt-4 space-y-3">
                <Link href="/login">
                  <Button className="w-full bg-black text-white hover:bg-gray-800 h-12 rounded-none uppercase tracking-widest" data-testid="button-go-to-login">
                    Ir para Login
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
