import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AccountLayout } from '@/components/AccountLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLocation } from 'wouter';
import { MessageSquare, Send, Plus, ArrowLeft, Clock, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { storeConfig } from '@/config/store';

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
}

interface SupportMessage {
  id: string;
  senderType: string;
  senderName: string;
  message: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  open: { label: 'Aberto', color: 'bg-green-100 text-green-800', icon: AlertCircle },
  waiting: { label: 'Aguardando Resposta', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  closed: { label: 'Fechado', color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
};

export default function AccountSupport() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const ticketIdFromUrl = searchParams.get('ticket');
  const orderIdFromUrl = searchParams.get('order');
  
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(ticketIdFromUrl);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ['/api/support/tickets'],
    queryFn: async () => {
      const res = await fetch('/api/support/tickets', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch tickets');
      return res.json();
    },
  });

  const { data: ticketData, isLoading: ticketLoading } = useQuery<{ ticket: SupportTicket; messages: SupportMessage[] }>({
    queryKey: ['/api/support/tickets', selectedTicketId],
    queryFn: async () => {
      const res = await fetch(`/api/support/tickets/${selectedTicketId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch ticket');
      return res.json();
    },
    enabled: !!selectedTicketId,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; orderId?: string }) => {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
      setSelectedTicketId(data.ticket.id);
      setShowNewTicket(false);
      setNewTicketSubject('');
      setNewTicketMessage('');
      toast({ title: 'Ticket criado com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar ticket', variant: 'destructive' });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`/api/support/tickets/${selectedTicketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
      setNewMessage('');
    },
    onError: () => {
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticketData?.messages]);

  useEffect(() => {
    if (orderIdFromUrl && !selectedTicketId) {
      setShowNewTicket(true);
      setNewTicketSubject(`Dúvida sobre o pedido #${orderIdFromUrl}`);
      // Also clear any previous message if needed, or keep it
    }
  }, [orderIdFromUrl, selectedTicketId]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) return;
    
    // Extract long orderId if available in the URL (it might be short version from link)
    // But our API expects the real ID or we can handle short ID in backend
    // For now, let's just pass what we have
    createTicketMutation.mutate({
      subject: newTicketSubject,
      message: newTicketMessage,
      orderId: orderIdFromUrl || undefined,
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  const renderTicketList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">Meus Tickets</h2>
        <Button 
          onClick={() => setShowNewTicket(true)}
          className="bg-black text-white hover:bg-gray-800"
          data-testid="button-new-ticket"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Ticket
        </Button>
      </div>

      {ticketsLoading ? (
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Você ainda não tem tickets de suporte</p>
          <Button 
            onClick={() => setShowNewTicket(true)}
            className="mt-4 bg-black text-white hover:bg-gray-800"
            data-testid="button-create-first-ticket"
          >
            Criar Primeiro Ticket
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const status = statusConfig[ticket.status] || statusConfig.open;
            const StatusIcon = status.icon;
            return (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className="w-full text-left p-4 bg-white border border-gray-100 rounded-sm hover:border-gray-300 transition-colors"
                data-testid={`ticket-item-${ticket.id}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-sm">{ticket.subject}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>#{ticket.id.slice(0, 8).toUpperCase()}</span>
                  <span>{format(new Date(ticket.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  {ticket.orderId && (
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Pedido vinculado
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderNewTicketForm = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setShowNewTicket(false)}
          data-testid="button-back-from-new-ticket"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h2 className="text-lg font-medium">Novo Ticket</h2>
      </div>

      <form onSubmit={handleCreateTicket} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Assunto</label>
          <Input
            value={newTicketSubject}
            onChange={(e) => setNewTicketSubject(e.target.value)}
            placeholder="Descreva brevemente o assunto..."
            className="border-gray-200"
            data-testid="input-ticket-subject"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Mensagem</label>
          <Textarea
            value={newTicketMessage}
            onChange={(e) => setNewTicketMessage(e.target.value)}
            placeholder="Descreva seu problema ou dúvida em detalhes..."
            rows={6}
            className="border-gray-200"
            data-testid="input-ticket-message"
          />
        </div>
        <Button 
          type="submit" 
          className="w-full bg-black text-white hover:bg-gray-800"
          disabled={createTicketMutation.isPending}
          data-testid="button-submit-ticket"
        >
          {createTicketMutation.isPending ? 'Enviando...' : 'Criar Ticket'}
        </Button>
      </form>
    </div>
  );

  const renderTicketChat = () => {
    if (!ticketData) return null;
    const { ticket, messages } = ticketData;
    const status = statusConfig[ticket.status] || statusConfig.open;
    const StatusIcon = status.icon;

    return (
      <div className="flex flex-col h-[600px]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedTicketId(null)}
              data-testid="button-back-to-tickets"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h3 className="font-medium text-sm">{ticket.subject}</h3>
              <span className="text-xs text-gray-500">#{ticket.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${status.color}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {ticketLoading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.senderType === 'customer' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                  msg.senderType === 'admin' ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {msg.senderType === 'admin' ? 'M' : msg.senderName.charAt(0).toUpperCase()}
                </div>
                <div className={`max-w-[75%] p-3 rounded-lg ${
                  msg.senderType === 'customer' 
                    ? 'bg-black text-white rounded-tr-none' 
                    : 'bg-white shadow-sm rounded-tl-none'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <span className={`text-[10px] mt-2 block ${
                    msg.senderType === 'customer' ? 'text-white/50' : 'text-gray-400'
                  }`}>
                    {format(new Date(msg.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {ticket.status !== 'closed' ? (
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white">
            <div className="flex gap-3">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 border-gray-200"
                data-testid="input-message"
              />
              <Button 
                type="submit" 
                className="bg-black text-white hover:bg-gray-800"
                disabled={sendMessageMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-sm text-gray-500">
            Este ticket foi fechado
          </div>
        )}
      </div>
    );
  };

  return (
    <AccountLayout>
      <h1 className="text-2xl font-serif mb-8">Suporte & Atendimento</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-sm shadow-sm">
          {selectedTicketId ? (
            renderTicketChat()
          ) : showNewTicket ? (
            <div className="p-6">{renderNewTicketForm()}</div>
          ) : (
            <div className="p-6">{renderTicketList()}</div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 border border-gray-100 rounded-sm shadow-sm">
            <h3 className="font-serif mb-4">Perguntas Frequentes</h3>
            <div className="space-y-3" data-testid="faq-list">
              <button className="w-full text-left text-sm text-gray-600 hover:text-black hover:underline py-2 border-b border-gray-50" data-testid="button-faq-order-status">
                Onde está meu pedido?
              </button>
              <button className="w-full text-left text-sm text-gray-600 hover:text-black hover:underline py-2 border-b border-gray-50" data-testid="button-faq-returns">
                Como faço uma devolução?
              </button>
              <button className="w-full text-left text-sm text-gray-600 hover:text-black hover:underline py-2 border-b border-gray-50" data-testid="button-faq-size-guide">
                Guia de Tamanhos
              </button>
              <button className="w-full text-left text-sm text-gray-600 hover:text-black hover:underline py-2" data-testid="button-faq-care-instructions">
                Instruções de Cuidados
              </button>
            </div>
          </div>

          <div className="bg-black text-white p-6 rounded-sm shadow-sm">
            <h3 className="font-serif mb-2">Linha Direta</h3>
            <p className="text-sm text-gray-400 mb-4">Prefere falar com alguém?</p>
            <p className="text-xl mb-1">{storeConfig.support.phoneDisplay}</p>
            <p className="text-xs text-gray-500">{storeConfig.support.hours}</p>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
