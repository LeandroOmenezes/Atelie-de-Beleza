import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CalendarDays, Clock, Phone, Mail, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { Appointment, Service } from "@shared/schema";

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "Pendente",   color: "bg-amber-100 text-amber-800 border-amber-200",  icon: AlertCircle  },
  confirmed: { label: "Confirmado", color: "bg-green-100 text-green-800 border-green-200",  icon: CheckCircle2 },
  cancelled: { label: "Cancelado",  color: "bg-red-100 text-red-800 border-red-200",        icon: XCircle      },
};

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function ProfessionalAppointmentsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: prof, isLoading: loadingProf } = useQuery<{ id: number; name: string; photoBase64?: string; photoMimeType?: string }>({
    queryKey: ["/api/professional/me"],
  });

  const { data: appointments = [], isLoading: loadingAppts } = useQuery<Appointment[]>({
    queryKey: ["/api/professional/appointments"],
    enabled: !!prof,
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services/all"],
  });

  const markSeenMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/professional/appointments/mark-seen"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional/unseen-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/professional/appointments"] });
    },
  });

  useEffect(() => {
    if (prof) {
      markSeenMutation.mutate();
    }
  }, [prof?.id]);

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user]);

  const getServiceName = (serviceId: number) =>
    services.find(s => s.id === serviceId)?.name ?? `Serviço #${serviceId}`;

  const upcoming = appointments.filter(a => a.status !== "cancelled" && new Date(`${a.date}T${a.time}`) >= new Date());
  const past = appointments.filter(a => a.status === "cancelled" || new Date(`${a.date}T${a.time}`) < new Date());

  if (loadingProf) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </>
    );
  }

  if (!prof) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-center px-4">
          <Users className="w-16 h-16 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-700">Nenhum perfil profissional vinculado</h2>
          <p className="text-gray-500 text-sm">Este usuário não está associado a nenhum profissional. Peça ao administrador para vincular sua conta.</p>
        </div>
        <Footer />
      </>
    );
  }

  const AppointmentCard = ({ a }: { a: Appointment }) => {
    const status = STATUS_MAP[a.status ?? "pending"] ?? STATUS_MAP.pending;
    const StatusIcon = status.icon;
    const isNew = !a.seenByProfessional;
    return (
      <Card className={`relative transition-all ${isNew ? "ring-2 ring-primary/40 shadow-md" : ""}`}>
        {isNew && (
          <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">NOVO</span>
        )}
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">{a.name}</p>
              <p className="text-sm text-primary font-medium">{getServiceName(a.serviceId)}</p>
            </div>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${status.color}`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
              {formatDate(a.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {a.time}
            </span>
            <span className="flex items-center gap-1.5 col-span-2">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              {a.phone}
            </span>
            <span className="flex items-center gap-1.5 col-span-2 truncate">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              {a.email}
            </span>
          </div>

          {a.notes && (
            <div className="flex items-start gap-1.5 text-sm text-gray-500 bg-gray-50 rounded-lg p-2">
              <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
              <span className="line-clamp-2">{a.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="bg-white border-b shadow-sm">
          <div className="container mx-auto px-4 py-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/30 bg-gray-100 flex items-center justify-center shrink-0">
              {prof.photoBase64 ? (
                <img
                  src={prof.photoBase64.startsWith('http') ? prof.photoBase64 : `data:${prof.photoMimeType};base64,${prof.photoBase64}`}
                  alt={prof.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-7 h-7 text-gray-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{prof.name}</h1>
              <p className="text-gray-500 text-sm">Seus agendamentos</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 space-y-8">
          {loadingAppts ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <CalendarDays className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum agendamento ainda</p>
              <p className="text-sm mt-1">Quando clientes agendarem com você, aparecerão aqui.</p>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    Próximos ({upcoming.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {upcoming.map(a => <AppointmentCard key={a.id} a={a} />)}
                  </div>
                </section>
              )}

              {past.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Anteriores ({past.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
                    {past.map(a => <AppointmentCard key={a.id} a={a} />)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
