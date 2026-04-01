import { useState } from 'react';
import { Link } from 'wouter';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, informe seu e-mail.');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        toast.error(data.error || 'Erro ao processar solicitação.');
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
          <Link href="/login">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-black transition-colors mb-8 cursor-pointer">
              <ArrowLeft className="w-3 h-3" /> Voltar para Login
            </div>
          </Link>

          {isSubmitted ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-serif">Verifique seu E-mail</h1>
              <p className="text-gray-500">
                Se o e-mail <span className="font-medium text-black">{email}</span> estiver cadastrado, 
                você receberá um link para redefinir sua senha.
              </p>
              <p className="text-sm text-gray-400">
                O link expira em 30 minutos. Verifique também sua pasta de spam.
              </p>
              <div className="pt-4">
                <Link href="/login">
                  <Button variant="outline" className="w-full h-12 rounded-none uppercase tracking-widest border-black" data-testid="button-back-to-login">
                    Voltar para Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-12">
                <h1 className="text-4xl font-serif mb-4">Esqueceu a Senha?</h1>
                <p className="text-gray-500">Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-widest">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-none border-gray-200 pl-10"
                      placeholder="seu@email.com"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-black text-white hover:bg-gray-800 rounded-none uppercase tracking-widest"
                  data-testid="button-submit"
                >
                  {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </Button>
              </form>

              <div className="text-center mt-8">
                <p className="text-sm text-gray-500">
                  Lembrou a senha?{' '}
                  <Link href="/login">
                    <span className="text-black underline cursor-pointer" data-testid="link-login">Entrar</span>
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
