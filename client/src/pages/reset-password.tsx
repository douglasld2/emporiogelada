import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    
    if (!tokenParam) {
      setStatus('error');
      setErrorMessage('Token de redefinição não encontrado.');
      return;
    }
    
    setToken(tokenParam);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast.error('Por favor, informe a nova senha.');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
      } else {
        toast.error(data.error || 'Erro ao redefinir senha.');
      }
    } catch (error) {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-md mx-auto">
          {status === 'error' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-red-50 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-serif">Link Inválido</h1>
              <p className="text-gray-500">{errorMessage}</p>
              <div className="pt-4">
                <Link href="/esqueci-senha">
                  <Button className="w-full bg-black text-white hover:bg-gray-800 h-12 rounded-none uppercase tracking-widest" data-testid="button-request-new">
                    Solicitar Novo Link
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-serif">Senha Redefinida!</h1>
              <p className="text-gray-500">Sua senha foi alterada com sucesso. Você já pode fazer login com a nova senha.</p>
              <div className="pt-4">
                <Link href="/login">
                  <Button className="w-full bg-black text-white hover:bg-gray-800 h-12 rounded-none uppercase tracking-widest" data-testid="button-go-to-login">
                    Ir para Login
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'form' && (
            <>
              <div className="text-center mb-12">
                <h1 className="text-4xl font-serif mb-4">Redefinir Senha</h1>
                <p className="text-gray-500">Crie uma nova senha para sua conta.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs uppercase tracking-widest">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-none border-gray-200 pl-10 pr-12"
                      placeholder="Mínimo 6 caracteres"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-widest">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 rounded-none border-gray-200 pl-10 pr-12"
                      placeholder="Repita a nova senha"
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-black text-white hover:bg-gray-800 rounded-none uppercase tracking-widest"
                  data-testid="button-submit"
                >
                  {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
