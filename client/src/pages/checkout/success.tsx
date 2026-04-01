import { useEffect, useState } from 'react';
import { Link, useSearch } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, Package, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';

export default function CheckoutSuccess() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const externalReference = params.get('external_reference');
  const paymentId = params.get('payment_id');
  
  const { clearCart } = useCart();
  const { user } = useAuth();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAndCreateOrder = async () => {
      if (orderCreated || isCreatingOrder || !externalReference) return;
      
      setIsCreatingOrder(true);
      setError(null);
      
      try {
        const res = await fetch('/api/payments/verify-and-create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ externalReference, paymentId }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.error === 'Payment not approved') {
            setError(`Pagamento não aprovado. Status: ${data.status}`);
          } else {
            setError(data.error || 'Erro ao criar pedido');
          }
          setIsCreatingOrder(false);
          return;
        }

        setOrderNumber(data.order?.orderNumber || null);
        setOrderCreated(true);
        clearCart();
        localStorage.removeItem('emporio-pending-payment');
        localStorage.removeItem('emporio_gelada_cart');
        localStorage.removeItem('referral_code');
      } catch (err) {
        console.error('Error creating order:', err);
        setError('Erro ao processar o pedido');
      } finally {
        setIsCreatingOrder(false);
      }
    };

    verifyAndCreateOrder();
  }, [externalReference, orderCreated, isCreatingOrder, clearCart]);

  if (!externalReference) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center bg-white rounded-2xl shadow-lg p-8"
        >
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-serif mb-4 text-gray-900">Referência não encontrada</h1>
          <p className="text-gray-600 mb-6">Não foi possível identificar o pagamento.</p>
          <Link href="/shop">
            <Button className="w-full bg-black text-white hover:bg-gray-900 rounded-lg h-12 font-medium">
              Voltar para a Loja
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (isCreatingOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center bg-white rounded-2xl shadow-lg p-8"
        >
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-6" />
          <h1 className="text-2xl font-serif mb-4 text-gray-900">Verificando pagamento...</h1>
          <p className="text-gray-600">Aguarde enquanto confirmamos seu pagamento.</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center bg-white rounded-2xl shadow-lg p-8"
        >
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-serif mb-4 text-gray-900">Atenção</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <Link href="/checkout">
              <Button className="w-full bg-black text-white hover:bg-gray-900 rounded-lg h-12 font-medium">
                Tentar Novamente
              </Button>
            </Link>
            <Link href="/shop">
              <Button variant="outline" className="w-full rounded-lg h-12 font-medium">
                Voltar para a Loja
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full text-center bg-white rounded-2xl shadow-lg p-8"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-serif mb-4 text-gray-900">Pagamento Aprovado!</h1>
        
        <p className="text-gray-600 mb-6">
          Obrigado pela sua compra! Seu pedido foi confirmado e está sendo processado.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <div className="flex items-center gap-3 mb-3">
            <Package className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Informações do Pedido</span>
          </div>
          {orderNumber && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Número do Pedido:</span> #{orderNumber}
            </p>
          )}
          {paymentId && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">ID do Pagamento:</span> {paymentId}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Você receberá um email com os detalhes do pedido.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {user && (
            <Link href="/account/orders">
              <Button 
                className="w-full bg-black text-white hover:bg-gray-900 rounded-lg h-12 font-medium transition-colors flex items-center justify-center gap-2"
                data-testid="button-view-orders"
              >
                Ver Meus Pedidos
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
          <Link href="/shop">
            <Button 
              variant={user ? "outline" : "default"}
              className={`w-full rounded-lg h-12 font-medium ${!user ? 'bg-black text-white hover:bg-gray-900' : ''}`}
              data-testid="button-continue-shopping"
            >
              Continuar Comprando
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
