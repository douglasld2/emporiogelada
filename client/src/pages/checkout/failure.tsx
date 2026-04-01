import { Link, useSearch } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function CheckoutFailure() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const paymentId = params.get('payment_id');

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full text-center bg-white rounded-2xl shadow-lg p-8"
      >
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        
        <h1 className="text-3xl font-serif mb-4 text-gray-900">Pagamento não Aprovado</h1>
        
        <p className="text-gray-600 mb-6">
          Infelizmente seu pagamento não foi aprovado. Isso pode acontecer por diversos motivos, 
          como dados incorretos ou limite insuficiente.
        </p>

        <div className="bg-red-50 rounded-lg p-4 mb-6 text-left border border-red-100">
          <p className="text-sm text-red-800 font-medium mb-2">Possíveis causas:</p>
          <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
            <li>Dados do cartão incorretos</li>
            <li>Limite de crédito insuficiente</li>
            <li>Cartão bloqueado ou vencido</li>
            <li>Transação não autorizada pelo banco</li>
          </ul>
        </div>

        {paymentId && (
          <p className="text-xs text-gray-500 mb-4">
            ID do Pagamento: {paymentId}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Link href="/checkout">
            <Button 
              className="w-full bg-black text-white hover:bg-gray-900 rounded-lg h-12 font-medium transition-colors flex items-center justify-center gap-2"
              data-testid="button-try-again"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </Button>
          </Link>
          <Link href="/shop">
            <Button 
              variant="outline"
              className="w-full rounded-lg h-12 font-medium flex items-center justify-center gap-2"
              data-testid="button-back-to-shop"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para a Loja
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
