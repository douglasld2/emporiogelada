import { Link, useSearch } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Clock, Mail, ArrowRight } from 'lucide-react';

export default function CheckoutPending() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const paymentId = params.get('payment_id');
  const externalReference = params.get('external_reference');

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full text-center bg-white rounded-2xl shadow-lg p-8"
      >
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-yellow-600" />
        </div>
        
        <h1 className="text-3xl font-serif mb-4 text-gray-900">Pagamento Pendente</h1>
        
        <p className="text-gray-600 mb-6">
          Seu pagamento está sendo processado. Assim que for confirmado, você receberá uma notificação.
        </p>

        <div className="bg-yellow-50 rounded-lg p-4 mb-6 text-left border border-yellow-100">
          <div className="flex items-center gap-3 mb-3">
            <Mail className="w-5 h-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">Pagamento PIX ou Boleto?</span>
          </div>
          <p className="text-sm text-yellow-700">
            Se você escolheu PIX ou boleto, lembre-se de efetuar o pagamento dentro do prazo. 
            Após a confirmação, seu pedido será processado.
          </p>
        </div>

        {paymentId && (
          <p className="text-xs text-gray-500 mb-2">
            ID do Pagamento: {paymentId}
          </p>
        )}
        {externalReference && (
          <p className="text-xs text-gray-500 mb-4">
            Referência: {externalReference}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Link href="/account/orders">
            <Button 
              className="w-full bg-black text-white hover:bg-gray-900 rounded-lg h-12 font-medium transition-colors flex items-center justify-center gap-2"
              data-testid="button-view-orders"
            >
              Ver Meus Pedidos
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button 
              variant="outline"
              className="w-full rounded-lg h-12 font-medium"
              data-testid="button-return-home"
            >
              Voltar para a Loja
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
