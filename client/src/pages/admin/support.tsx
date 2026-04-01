import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Send, ArrowLeft, Clock, CheckCircle, AlertCircle, User, Mail, Package, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRoute } from 'wouter';

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  customerName: string;
  customerEmail: string;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
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
  waiting: { label: 'Aguardando Cliente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  closed: { label: 'Fechado', color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'text-blue-600' },
  normal: { label: 'Normal', color: 'text-gray-600' },
  high: { label: 'Alta', color: 'text-orange-600' },
  urgent: { label: 'Urgente', color: 'text-red-600' },
};

export default function AdminSupport() {
  const [, params] = useRoute('/admin/support/:ticketId');
  const ticketIdFromUrl = params?.ticketId;
  
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(ticketIdFromUrl || null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (ticketIdFromUrl) {
      setSelectedTicketId(ticketIdFromUrl);
    }
  }, [ticketIdFromUrl]);

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ['/api/admin/support/tickets', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/support/tickets?${params}`, { credentials: 'include' });
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/tickets'] });
      setNewMessage('');
    },
    onError: () => {
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' });
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async (data: { status?: string; priority?: string }) => {
      const res = await fetch(`/api/admin/support/tickets/${selectedTicketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/tickets'] });
      toast({ title: 'Ticket atualizado' });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/support/tickets/${selectedTicketId}/close`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to close ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/tickets'] });
      toast({ title: 'Ticket fechado com sucesso' });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticketData?.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  const openTicketsCount = tickets.filter(t => t.status === 'open').length;
  const waitingTicketsCount = tickets.filter(t => t.status === 'waiting').length;
  const totalUnread = tickets.reduce((sum, t) => sum + (t.unreadCount || 0), 0);

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-serif">Suporte ao Cliente</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os tickets de atendimento</p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
            {openTicketsCount} abertos
          </div>
          <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
            {waitingTicketsCount} aguardando
          </div>
          {totalUnread > 0 && (
            <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full">
              {totalUnread} não lidas
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full" data-testid="select-status-filter">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tickets</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="waiting">Aguardando Cliente</SelectItem>
                <SelectItem value="closed">Fechados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {ticketsLoading ? (
              <div className="p-8 text-center text-gray-500">Carregando...</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nenhum ticket encontrado</p>
              </div>
            ) : (
              tickets.map((ticket) => {
                const status = statusConfig[ticket.status] || statusConfig.open;
                const priority = priorityConfig[ticket.priority] || priorityConfig.normal;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedTicketId === ticket.id ? 'bg-gray-50' : ''
                    }`}
                    data-testid={`admin-ticket-item-${ticket.id}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm truncate">{ticket.subject}</h3>
                          {(ticket.unreadCount || 0) > 0 && (
                            <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                              {ticket.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{ticket.customerName}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>#{ticket.id.slice(0, 8).toUpperCase()}</span>
                      <span className={priority.color}>{priority.label}</span>
                      <span>{format(new Date(ticket.updatedAt), "dd/MM HH:mm")}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg overflow-hidden">
          {!selectedTicketId ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                <p className="text-gray-500">Selecione um ticket para ver os detalhes</p>
              </div>
            </div>
          ) : ticketLoading ? (
            <div className="h-[600px] flex items-center justify-center">
              <p className="text-gray-500">Carregando...</p>
            </div>
          ) : ticketData ? (
            <div className="flex flex-col h-[600px]">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedTicketId(null)}
                      className="lg:hidden"
                      data-testid="button-admin-back-to-tickets"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                      <h3 className="font-medium">{ticketData.ticket.subject}</h3>
                      <span className="text-xs text-gray-500">#{ticketData.ticket.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                  {ticketData.ticket.status !== 'closed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => closeTicketMutation.mutate()}
                      disabled={closeTicketMutation.isPending}
                      data-testid="button-close-ticket"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Fechar Ticket
                    </Button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    {ticketData.ticket.customerName}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    {ticketData.ticket.customerEmail}
                  </div>
                  {ticketData.ticket.orderId && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Package className="w-4 h-4" />
                      Pedido vinculado
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-3">
                  <Select 
                    value={ticketData.ticket.status} 
                    onValueChange={(value) => updateTicketMutation.mutate({ status: value })}
                    disabled={ticketData.ticket.status === 'closed'}
                  >
                    <SelectTrigger className="w-40" data-testid="select-ticket-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="waiting">Aguardando Cliente</SelectItem>
                      <SelectItem value="closed">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={ticketData.ticket.priority} 
                    onValueChange={(value) => updateTicketMutation.mutate({ priority: value })}
                  >
                    <SelectTrigger className="w-32" data-testid="select-ticket-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {ticketData.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.senderType === 'admin' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                      msg.senderType === 'admin' ? 'bg-black text-white' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {msg.senderType === 'admin' ? 'A' : msg.senderName.charAt(0).toUpperCase()}
                    </div>
                    <div className={`max-w-[75%] p-3 rounded-lg ${
                      msg.senderType === 'admin' 
                        ? 'bg-black text-white rounded-tr-none' 
                        : 'bg-white shadow-sm rounded-tl-none'
                    }`}>
                      <div className={`text-xs mb-1 ${msg.senderType === 'admin' ? 'text-white/70' : 'text-gray-500'}`}>
                        {msg.senderName}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <span className={`text-[10px] mt-2 block ${
                        msg.senderType === 'admin' ? 'text-white/50' : 'text-gray-400'
                      }`}>
                        {format(new Date(msg.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {ticketData.ticket.status !== 'closed' ? (
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex gap-3">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Digite sua resposta..."
                      className="flex-1"
                      data-testid="input-admin-message"
                    />
                    <Button 
                      type="submit" 
                      className="bg-black text-white hover:bg-gray-800"
                      disabled={sendMessageMutation.isPending}
                      data-testid="button-send-admin-message"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="p-4 border-t border-gray-200 bg-gray-100 text-center text-sm text-gray-500">
                  Este ticket está fechado
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </AdminLayout>
  );
}
