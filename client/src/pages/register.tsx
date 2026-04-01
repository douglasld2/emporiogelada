import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { storeConfig } from '@/config/store';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(email, password, name);
      toast({
        title: "Sucesso",
        description: "Conta criada com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar conta",
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
            <h1 className="text-lg mt-6 font-light text-gray-600">Crie sua conta</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
                <Input 
                    type="text" 
                    placeholder="Nome Completo" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 px-4 rounded-lg border border-gray-300 focus:border-black focus:ring-1 focus:ring-black transition-all bg-white"
                    data-testid="input-name-register"
                />
            </div>
            <div className="space-y-2">
                <Input 
                    type="email" 
                    placeholder="E-mail" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 px-4 rounded-lg border border-gray-300 focus:border-black focus:ring-1 focus:ring-black transition-all bg-white"
                    data-testid="input-email-register"
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
                    data-testid="input-password-register"
                />
            </div>
            
            <Button 
                type="submit"
                data-testid="button-register"
                disabled={isLoading}
                className="w-full h-12 bg-black text-white hover:bg-gray-900 rounded-lg uppercase tracking-widest font-medium transition-colors disabled:opacity-70"
            >
                {isLoading ? 'Criando Conta...' : 'Criar Conta'}
            </Button>

            <div className="text-center text-sm text-gray-600 pt-2">
                Já tem uma conta? <Link href="/login"><span className="font-medium text-black hover:underline cursor-pointer">Entre aqui</span></Link>
            </div>
        </form>
      </div>
    </div>
  );
}
