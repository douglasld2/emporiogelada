import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { storeConfig } from '@/config/store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao fazer login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
            <Link href="/">
                <span className="text-3xl font-serif font-bold cursor-pointer hover:opacity-80 transition-opacity">{storeConfig.shortName}</span>
            </Link>
            <h1 className="text-lg mt-6 font-light text-gray-600">Entre na sua conta</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
                <Input 
                    type="email" 
                    placeholder="E-mail" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 px-4 rounded-lg border border-gray-300 focus:border-black focus:ring-1 focus:ring-black transition-all bg-white"
                    data-testid="input-email-login"
                />
            </div>
            <div className="space-y-2">
                <Input 
                    type="password" 
                    placeholder="Senha" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 px-4 rounded-lg border border-gray-300 focus:border-black focus:ring-1 focus:ring-black transition-all bg-white"
                    data-testid="input-password-login"
                />
                <div className="text-right">
                    <Link href="/esqueci-senha">
                        <span className="text-sm text-gray-500 hover:text-black cursor-pointer" data-testid="link-forgot-password">Esqueci minha senha</span>
                    </Link>
                </div>
            </div>
            
            <Button 
                type="submit"
                data-testid="button-login"
                disabled={isLoading}
                className="w-full h-12 bg-black text-white hover:bg-gray-900 rounded-lg uppercase tracking-widest font-medium transition-colors disabled:opacity-70"
            >
                {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="text-center text-sm text-gray-600 pt-2">
                Não tem uma conta? <Link href="/register"><span className="font-medium text-black hover:underline cursor-pointer">Cadastre-se aqui</span></Link>
            </div>
            <div className="text-center text-xs text-gray-400 mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                💡 Dica: Use <span className="font-mono font-medium text-gray-600">admin@emporiogelada.com.br</span> para acessar o Painel Admin
            </div>
        </form>
      </div>
    </div>
  );
}
