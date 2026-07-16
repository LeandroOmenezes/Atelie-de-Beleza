
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Appointment, Service, type Professional } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, Clock, X, MessageCircle } from "lucide-react";

export default function AppointmentsManagement() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const previousAppointmentIdsRef = useRef<number[] | null>(null);
  const { toast } = useToast();

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments'],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ['/api/services/all'],
  });

  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ['/api/professionals'],
  });

  const { data: siteConfig } = useQuery<{ siteName?: string }>({
    queryKey: ['/api/site-config'],
  });

  const { data: footerConfig } = useQuery<{ whatsapp?: string }>({
    queryKey: ['/api/footer'],
  });

  const markSeenMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/appointments/mark-seen"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/unseen-count'] });
      toast({
        title: "Agendamentos atualizados",
        description: "Os novos agendamentos foram marcados como vistos.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao marcar como visto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const playNewAppointmentSound = () => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, audioContext.currentTime + 0.18);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.24);

    oscillator.onended = () => {
      void audioContext.close();
    };
  };

  useEffect(() => {
    if (!appointments) return;

    const currentAppointmentIds = appointments.map((appointment) => appointment.id);
    const previousAppointmentIds = previousAppointmentIdsRef.current;

    if (previousAppointmentIds === null) {
      previousAppointmentIdsRef.current = currentAppointmentIds;
      return;
    }

    const newAppointmentIds = currentAppointmentIds.filter((id) => !previousAppointmentIds.includes(id));

    if (newAppointmentIds.length > 0) {
      playNewAppointmentSound();
      toast({
        title: newAppointmentIds.length === 1 ? "Novo agendamento" : "Novos agendamentos",
        description:
          newAppointmentIds.length === 1
            ? "Um novo agendamento acabou de entrar nesta fila."
            : `${newAppointmentIds.length} novos agendamentos acabaram de entrar nesta fila.`,
      });
    }

    previousAppointmentIdsRef.current = currentAppointmentIds;
  }, [appointments, toast]);

  const formatClientPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const notifyClientViaWhatsApp = async (appointment: Appointment, newStatus: string) => {
    if (!appointment.phone) return;

    const salonName = siteConfig?.siteName || 'Salão';
    const serviceName = getServiceName(appointment.serviceId);
    const dateFormatted = formatDate(appointment.date);

    let message = '';
    if (newStatus === 'confirmed') {
      message =
        `Olá, ${appointment.name}! 😊\n\n` +
        `✅ *Seu agendamento foi CONFIRMADO!*\n\n` +
        `📋 *Detalhes:*\n` +
        `• Serviço: ${serviceName}\n` +
        `• Data: ${dateFormatted}\n` +
        `• Horário: ${appointment.time}\n\n` +
        `Aguardamos você com prazer! Qualquer dúvida, é só falar. 🙏\n\n` +
        `— ${salonName}`;
    } else if (newStatus === 'cancelled') {
      message =
        `Olá, ${appointment.name}.\n\n` +
        `❌ *Seu agendamento foi CANCELADO.*\n\n` +
        `📋 *Detalhes do agendamento cancelado:*\n` +
        `• Serviço: ${serviceName}\n` +
        `• Data: ${dateFormatted}\n` +
        `• Horário: ${appointment.time}\n\n` +
        `Sentimos muito pelo inconveniente. Entre em contato para reagendar quando quiser. 💙\n\n` +
        `— ${salonName}`;
    } else {
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: "Mensagem copiada!",
        description: `Cole no WhatsApp do cliente ${appointment.name} (${appointment.phone}).`,
        duration: 6000,
      });
    } catch {
      // fallback: abre o WhatsApp Web caso clipboard não esteja disponível
      const clientPhone = formatClientPhone(appointment.phone);
      const url = `https://web.whatsapp.com/send?phone=${clientPhone}&text=${encodeURIComponent(message)}`;
      window.open(url, 'whatsapp_notifications');
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${id}/status`, { status });
      return { appointment: await res.json(), status };
    },
    onSuccess: ({ appointment, status }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/available-times'] });

      const statusLabel = status === 'confirmed' ? 'confirmado' : status === 'cancelled' ? 'cancelado' : 'atualizado';
      toast({
        title: "Status atualizado",
        description: `Agendamento ${statusLabel} com sucesso.`,
      });

      if (status === 'confirmed' || status === 'cancelled') {
        notifyClientViaWhatsApp(appointment, status);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getFilteredAppointments = () => {
    if (!appointments) return [];
    if (statusFilter === "all") return appointments;
    return appointments.filter(appointment => appointment.status === statusFilter);
  };

  const filteredAppointments = getFilteredAppointments();
  const unseenAppointments = useMemo(
    () => filteredAppointments.filter((appointment) => !appointment.seenByAdmin),
    [filteredAppointments]
  );

  const getServiceName = (serviceId: number | string) => {
    if (!services) return "Carregando...";
    const service = services.find(s => s.id === Number(serviceId));
    return service ? service.name : "Serviço não encontrado";
  };

  const getProfessionalName = (professionalId: number | null | undefined) => {
    if (!professionalId) return null;
    const p = professionals.find(pr => pr.id === professionalId);
    return p ? p.name : null;
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md max-w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-xl font-bold text-gray-800">Agendamentos</h3>
          {unseenAppointments.length > 0 && (
            <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100 shrink-0">
              {unseenAppointments.length} novo{unseenAppointments.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {unseenAppointments.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto whitespace-normal"
              onClick={() => markSeenMutation.mutate()}
              disabled={markSeenMutation.isPending}
            >
              Marcar novos como vistos
            </Button>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="confirmed">Confirmados</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto max-w-full">
        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Carregando agendamentos...</p>
          </div>
        ) : !appointments || appointments.length === 0 ? (
          <div className="p-10 text-center border rounded-lg">
            <p className="text-xl text-gray-500 mb-2">Nenhum agendamento encontrado</p>
            <p className="text-gray-400">Quando os clientes fizerem agendamentos, eles aparecerão aqui.</p>
          </div>
        ) : (
          <table className="min-w-[900px] w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-3 px-4 text-left">Cliente</th>
                <th className="py-3 px-4 text-left">Serviço</th>
                <th className="py-3 px-4 text-left">Data</th>
                <th className="py-3 px-4 text-left">Horário</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appointment) => (
                <tr
                  key={appointment.id}
                  className={`border-t transition-colors ${
                    !appointment.seenByAdmin ? "bg-amber-50/70" : ""
                  }`}
                >
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <span>{appointment.name}</span>
                        {!appointment.seenByAdmin && (
                          <Badge className="bg-red-500 text-white hover:bg-red-500 px-2 py-0 text-[10px]">
                            NOVO
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{appointment.phone}</div>
                      <div className="text-sm text-gray-500">{appointment.email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>{getServiceName(appointment.serviceId)}</div>
                    {getProfessionalName(appointment.professionalId) && (
                      <div className="text-xs text-blue-600 mt-0.5">
                        👤 {getProfessionalName(appointment.professionalId)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">{formatDate(appointment.date)}</td>
                  <td className="py-3 px-4">{appointment.time}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {appointment.status === 'pending' ? 'Pendente' :
                       appointment.status === 'confirmed' ? 'Confirmado' :
                       appointment.status === 'completed' ? 'Concluído' :
                       'Cancelado'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-2">
                      {appointment.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'confirmed' })}
                            disabled={updateStatusMutation.isPending}
                            title="Confirmar e notificar cliente via WhatsApp"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Confirmar
                            <MessageCircle className="h-3 w-3 ml-1 text-green-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'cancelled' })}
                            disabled={updateStatusMutation.isPending}
                            title="Cancelar e notificar cliente via WhatsApp"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancelar
                            <MessageCircle className="h-3 w-3 ml-1 text-red-400" />
                          </Button>
                        </>
                      )}
                      {appointment.status === 'confirmed' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'completed' })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Concluir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                            onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'pending' })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Pendente
                          </Button>
                        </>
                      )}
                      {(appointment.status === 'completed' || appointment.status === 'cancelled') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                          onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'pending' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Reativar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
        <MessageCircle className="h-3 w-3" />
        <span>Ao confirmar ou cancelar, a mensagem para o cliente é copiada automaticamente — é só colar no WhatsApp Web.</span>
      </div>
    </div>
  );
}
