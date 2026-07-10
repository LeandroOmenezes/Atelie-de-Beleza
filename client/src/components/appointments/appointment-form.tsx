import { z } from "zod";
import { useState, useEffect } from "react";
import { ddmmyyyyToIso, getISODateForTimeZone, maskPhone, isoToDDMMYYYY } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Category, ServiceOption, type Professional } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, MessageSquare, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AppointmentPaymentBrick } from "@/components/payments/appointment-payment-brick";

const appointmentFormSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
    // O telefone pode ser preenchido pelo perfil do usuário; validar em tempo de envio
    phone: z.string().optional(),
  categoryId: z.string().min(1, { message: "Selecione uma categoria" }),
  serviceId: z.string().min(1, { message: "Selecione um serviço" }),
  professionalId: z.string().optional(),
  date: z.string().min(1, { message: "Selecione uma data" }),
  time: z.string().min(1, { message: "Selecione um horário" }),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface TimeSlot {
  time: string;
  available: boolean;
  status: 'available' | 'occupied' | 'blocked' | 'lunch' | 'past';
}

interface AvailableTimesResponse {
  timeSlots: TimeSlot[];
  blocked: boolean;
  blockReason?: string;
  blockDescription?: string;
}

export default function AppointmentForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [appointmentAwaitingPayment, setAppointmentAwaitingPayment] = useState<any>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      name: user?.name || user?.username || "",
      email: user?.username || "",
      phone: user?.phone || "",
      categoryId: "",
      serviceId: "",
      professionalId: "",
      date: "",
      time: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.setValue("name", user.name || user.username || "");
      form.setValue("email", user.username || "");
      if (user.phone) {
        form.setValue("phone", user.phone);
      }
    }
  }, [user, form]);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: services } = useQuery<ServiceOption[]>({
    queryKey: ['/api/services', selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      const response = await fetch(`/api/services/${selectedCategoryId}`);
      const data = await response.json();
      // Normalize possible responses to always return an array of services
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.items)) return data.items;
      // If API returns an object keyed by ids, get values
      if (data && typeof data === 'object') return Object.values(data) as ServiceOption[];
      return [];
    },
    enabled: !!selectedCategoryId,
  });

  const { data: categoryProfessionals = [] } = useQuery<Professional[]>({
    queryKey: ['/api/professionals/category', selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      const response = await fetch(`/api/professionals/category/${selectedCategoryId}`);
      return response.json();
    },
    enabled: !!selectedCategoryId,
  });

  const requiresProfessionalSelection = selectedCategoryId !== "" && categoryProfessionals.length > 0;
  const businessCurrentDate = getISODateForTimeZone('America/Sao_Paulo');

  // SSE subscription to receive realtime updates and invalidate available-times
  useEffect(() => {
    let es: any;
    try {
      es = new EventSource('/api/appointments/stream');
      // include cookies for auth if browser supports
      try { es.withCredentials = true; } catch {}

      es.addEventListener('time', () => {
        if (selectedDate === businessCurrentDate) {
          queryClient.invalidateQueries({ queryKey: ['/api/appointments/available-times', selectedDate, selectedProfessionalId] });
        }
      });

      es.addEventListener('refresh', (ev: any) => {
        let payload: any = null;
        try { payload = JSON.parse(ev.data); } catch {}
        if (!payload || payload.date === selectedDate) {
          queryClient.invalidateQueries({ queryKey: ['/api/appointments/available-times', selectedDate, selectedProfessionalId] });
        }
      });
    } catch (err) {
      // ignore
    }

    return () => { if (es) es.close(); };
  }, [selectedDate, selectedProfessionalId, businessCurrentDate]);

  const { data: availableTimesData, isLoading: isLoadingTimeSlots } = useQuery<AvailableTimesResponse>({
    queryKey: ['/api/appointments/available-times', selectedDate, selectedProfessionalId],
    queryFn: async () => {
      if (!selectedDate) return { timeSlots: [], blocked: false };
      const url = selectedProfessionalId
        ? `/api/appointments/available-times/${selectedDate}?professionalId=${selectedProfessionalId}`
        : `/api/appointments/available-times/${selectedDate}`;
      const response = await fetch(url);
      return response.json();
    },
    enabled: !!selectedDate && (
      !!selectedProfessionalId || (selectedCategoryId !== "" && categoryProfessionals.length === 0)
    ),
    refetchOnWindowFocus: true,
    refetchInterval: selectedDate === businessCurrentDate ? 60_000 : false,
  });
  const timeSlots = availableTimesData?.timeSlots ?? [];
  const dateBlocked = availableTimesData?.blocked ?? false;
  const blockReason = availableTimesData?.blockReason;
  const blockDescription = availableTimesData?.blockDescription;
  
  useEffect(() => {
    if (categories && selectedCategoryId) {
      const category = categories.find(cat => String(cat.id) === selectedCategoryId);
      if (category) {
        setSelectedCategoryName(category.name);
      }
    }
  }, [selectedCategoryId, categories]);
  
  useEffect(() => {
    const serviceId = form.getValues("serviceId");
    if (services && serviceId) {
      const service = services.find(serv => String(serv.id) === serviceId);
      if (service) {
        setSelectedService(service.name);
      }
    }
  }, [services, form]);

  // Observar mudanças na data para buscar horários disponíveis
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'date' && value.date) {
        // Impede seleção de datas anteriores à data de negócio (Brasília)
        if (value.date < businessCurrentDate) {
          toast({
            title: "Data inválida",
            description: "Não é possível selecionar datas anteriores. Ajustei para a data de hoje.",
            variant: "destructive",
          });
          // Força a data mínima
          setSelectedDate(businessCurrentDate);
          form.setValue('date', businessCurrentDate);
          form.setValue('time', '');
          return;
        }

        setSelectedDate(value.date);
        // Limpar horário selecionado quando a data mudar
        form.setValue('time', '');
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormValues) => {
      try {
        const response = await apiRequest("POST", "/api/appointments", data);
        return response.json();
      } catch (error: any) {
        const serverMsg = error?.message || '';
        // Normaliza mensagens conhecidas do servidor para o cliente
        if (serverMsg.toLowerCase().includes('já passou')) {
          throw new Error('Este horário já passou e não pode ser agendado.');
        }
        if (serverMsg.toLowerCase().includes('ocupad') || serverMsg.toLowerCase().includes('já está ocupado')) {
          throw new Error('Este horário já está ocupado. Por favor, escolha outro horário.');
        }
        if (serverMsg.toLowerCase().includes('bloquead')) {
          throw new Error(serverMsg); // já em português com razão
        }
        // Fallback: propaga a mensagem do servidor ou uma mensagem genérica
        throw new Error(serverMsg || 'Erro ao criar agendamento. Tente novamente mais tarde.');
      }
    },
    onSuccess: (data) => {
      // Verificar se o agendamento requer pagamento
      if (data.paymentStatus === 'pending' && data.paymentAmount) {
        // Armazenar dados do agendamento e mostrar modal de pagamento
        setAppointmentAwaitingPayment(data);
        setShowPaymentModal(true);
        toast({
          title: "Pagamento necessário",
          description: "Complete o pagamento para confirmar seu agendamento",
        });
      } else {
        // Agendamento confirmado sem pagamento necessário
        toast({
          title: "Agendamento realizado!",
          description: "Em breve entraremos em contato para confirmar.",
        });
        form.reset();
        setSelectedCategoryId("");
        setSelectedService("");
        setSelectedDate("");
        setSelectedProfessionalId(null);
        queryClient.invalidateQueries({ queryKey: ['/api/appointments/available-times'] });
      }
    },
    onError: (error: any) => {
      const serverMsg = error?.message || '';
      let title = "Erro ao agendar";
      let description = "Tente novamente mais tarde.";

      if (serverMsg.toLowerCase().includes('já passou')) {
        title = "Horário expirado";
        description = "Este horário já passou e não pode ser agendado.";
      } else if (serverMsg.toLowerCase().includes('ocupad') || serverMsg.toLowerCase().includes('já está ocupado')) {
        title = "Horário não disponível";
        description = "Este horário já está ocupado. Por favor, escolha outro horário.";
      } else if (serverMsg) {
        description = serverMsg;
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: AppointmentFormValues) {
    if (requiresProfessionalSelection && !selectedProfessionalId) {
      form.setError("professionalId", {
        type: "manual",
        message: "Selecione um profissional para esta categoria",
      });
      toast({ title: "Profissional obrigatório", description: "Escolha um profissional antes de continuar.", variant: "destructive" });
      return;
    }

    const finalData = { ...data } as AppointmentFormValues;

    // Se o usuário estiver logado e não informou telefone válido, usar telefone do perfil
    const hasValidPhone = finalData.phone && String(finalData.phone).replace(/\D/g, '').length >= 10;
    if (!hasValidPhone) {
      if (user?.phone) {
        finalData.phone = user.phone;
      } else {
        toast({ title: "Telefone obrigatório", description: "Por favor, informe um telefone válido.", variant: "destructive" });
        return;
      }
    }

    createAppointmentMutation.mutate(finalData);
  }

  const formatPhoneForWhatsApp = (phone: string = "") => {
    const numbersOnly = phone.replace(/\D/g, '');
    if (!numbersOnly) return "";
    if (numbersOnly.startsWith('55')) {
      return numbersOnly;
    }
    return `55${numbersOnly}`;
  };

  const handleWhatsAppScheduling = () => {
    // Valida o formulário antes de abrir o WhatsApp
    const formResult = form.trigger();
    
    formResult.then((isValid) => {
      if (!isValid) {
        toast({
          title: "Formulário incompleto",
          description: "Por favor, preencha todos os campos obrigatórios antes de agendar pelo WhatsApp.",
          variant: "destructive",
        });
        return;
      }
      
      // Pega os valores atuais do formulário
      const values = form.getValues();

      // Se não houver telefone válido no formulário, usar telefone do perfil (se existir)
      const hasValidPhone = values.phone && String(values.phone).replace(/\D/g, '').length >= 10;
      if (!hasValidPhone) {
        if (user?.phone) {
          values.phone = user.phone;
        } else {
          toast({ title: "Telefone obrigatório", description: "Por favor, informe um telefone válido antes de agendar pelo WhatsApp.", variant: "destructive" });
          return;
        }
      }
      
      // Cria a mensagem para o WhatsApp
      let message = `Olá! Gostaria de agendar um horário para ${selectedService || "um serviço"} na categoria ${selectedCategoryName || "de beleza"}.\n\n`;
      message += `Nome: ${values.name}\n`;
      message += `Email: ${values.email}\n`;
      message += `Data: ${values.date}\n`;
      message += `Horário: ${values.time}\n`;
      
      if (values.notes) {
        message += `\nObservações: ${values.notes}`;
      }
      
      // Formata o número do telefone do cliente para WhatsApp
      const rawPhoneForWhatsApp = String(values.phone || user?.phone || "");
      const formattedClientPhone = formatPhoneForWhatsApp(rawPhoneForWhatsApp);
      
      // Formata o número do WhatsApp (número do salão) - este seria o número comercial do salão
      const salonWhatsApp = "5511999999999"; // Número de exemplo do salão
      
      // Registramos os dados do cliente no sistema antes de redirecionar para o WhatsApp
      createAppointmentMutation.mutate(values);
      
      // Cria a URL do WhatsApp com a mensagem codificada e o telefone do cliente
      const whatsappUrl = `https://wa.me/${salonWhatsApp}?text=${encodeURIComponent(message + "\n\nMeu telefone: " + formattedClientPhone)}`;
      
      // Abre o WhatsApp em uma nova janela
      window.open(whatsappUrl, '_blank');
    });
  };

  return (
    <>
      {/* Payment Modal */}
      {appointmentAwaitingPayment && (
        <AppointmentPaymentBrick
          appointmentId={appointmentAwaitingPayment.id}
          amount={appointmentAwaitingPayment.paymentAmount}
          serviceDescription={`${appointmentAwaitingPayment.date} às ${appointmentAwaitingPayment.time}`}
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setAppointmentAwaitingPayment(null);
          }}
          onPaymentSuccess={() => {
            setShowPaymentModal(false);
            setAppointmentAwaitingPayment(null);
            form.reset();
            setSelectedCategoryId("");
            setSelectedService("");
            setSelectedDate("");
            setSelectedProfessionalId(null);
            queryClient.invalidateQueries({ queryKey: ['/api/appointments/available-times'] });
          }}
        />
      )}

    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="bg-white p-8 rounded-2xl shadow-xl max-w-xl mx-auto border border-blue-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">Nome Completo</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Seu nome completo" 
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      disabled
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="seu.email@exemplo.com" 
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    disabled
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Telefone (WhatsApp)</FormLabel>
                <FormControl>
                  <Input 
                    type="tel" 
                    placeholder="(11) 99999-9999" 
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    {...field}
                    onChange={(e) => field.onChange(maskPhone(e.target.value))}
                    maxLength={15}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Categoria de Serviço</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedCategoryId(value);
                    setSelectedProfessionalId(null);
                    form.setValue("serviceId", "");
                    form.setValue("professionalId", "");
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Selecione uma categoria">
                        {categories?.find(cat => String(cat.id) === field.value)?.name}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        <i className={`${category.icon} mr-2`}></i>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="serviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Serviço Específico</FormLabel>
                  <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Atualiza o nome do serviço selecionado para uso no WhatsApp
                    if (Array.isArray(services)) {
                      const service = services.find(s => String(s.id) === value);
                      if (service) {
                        setSelectedService(service.name);
                      }
                    } else {
                      setSelectedService('');
                    }
                  }}
                  value={field.value}
                  disabled={!selectedCategoryId}
                >
                    <FormControl>
                    <SelectTrigger className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Selecione o serviço">
                        {Array.isArray(services) ? services.find(serv => String(serv.id) === field.value)?.name : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Array.isArray(services) ? services : []).map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Professional Selection - shown when category has professionals */}
          {selectedCategoryId && categoryProfessionals.length > 0 && (
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="professionalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">
                      Profissional de Preferência <span className="text-red-600">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("professionalId", value);
                          setSelectedProfessionalId(value);
                          form.setValue('time', '');
                          if (selectedDate) {
                            queryClient.invalidateQueries({ queryKey: ['/api/appointments/available-times', selectedDate, value] });
                          }
                        }}
                        value={field.value}
                      >
                        <SelectTrigger className={`w-full px-4 py-3 rounded-lg focus:ring-2 ${requiresProfessionalSelection && !field.value ? 'border-red-500 bg-red-50 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-500'}`}>
                          <SelectValue placeholder={requiresProfessionalSelection && !field.value ? "Selecione um profissional (obrigatório)" : "Selecione um profissional"} />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryProfessionals.map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              <span className="flex items-center gap-2">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                                  {p.photoBase64 ? (
                                    <img
                                      src={p.photoBase64.startsWith('http') ? p.photoBase64 : `data:${p.photoMimeType};base64,${p.photoBase64}`}
                                      alt={p.name}
                                      className="h-8 w-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <Users className="h-4 w-4" />
                                  )}
                                </span>
                                <span>{p.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <p className="text-xs text-gray-500 mt-2">
                      Esta categoria exige seleção de profissional. A agenda só será carregada para o profissional escolhido.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Data</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    min={businessCurrentDate}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    {...field}
                    // Prevent printable character input but allow navigation keys so
                    // the native date picker can open on click/focus in all browsers.
                    onKeyDown={(e) => {
                      // e.key length === 1 are printable characters (numbers, letters, punctuation)
                      // Allow control/navigation keys like Tab, Enter, Arrow keys, Backspace
                      if (e.key && e.key.length === 1) {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      const normalizedValue = rawValue.includes('/')
                        ? ddmmyyyyToIso(rawValue)
                        : rawValue;

                      field.onChange(normalizedValue);
                      setSelectedDate(normalizedValue);
                      form.setValue('time', '');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">
                  Horário {selectedDate && `- ${isoToDDMMYYYY(selectedDate)}`}
                </FormLabel>
                {!selectedDate ? (
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-center">
                    Selecione uma data primeiro
                  </div>
                ) : !selectedCategoryId ? (
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-center">
                    Selecione a categoria de serviço para ver os horários disponíveis.
                  </div>
                ) : categoryProfessionals.length > 0 && !selectedProfessionalId ? (
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-center">
                    Selecione um profissional para carregar a agenda correta.
                  </div>
                ) : isLoadingTimeSlots ? (
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                      Carregando horários...
                    </div>
                  </div>
                ) : dateBlocked ? (
                  <div className="w-full px-4 py-5 border-2 border-red-200 rounded-lg bg-red-50 text-center">
                    <div className="text-red-600 font-semibold mb-1">🚫 Data indisponível</div>
                    <div className="text-red-700 text-sm font-medium">{blockReason}</div>
                    {blockDescription && (
                      <div className="text-red-500 text-xs mt-1">{blockDescription}</div>
                    )}
                    <div className="text-gray-500 text-xs mt-2">Por favor, escolha outra data.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots?.filter(slot => slot.status !== 'lunch').map((slot) => {
                      const slotLabel = !slot.available
                        ? slot.status === 'occupied'
                          ? 'Ocupado'
                          : slot.status === 'past'
                            ? 'Já passou'
                            : 'Indisponível'
                        : undefined;

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => slot.available && field.onChange(slot.time)}
                          disabled={!slot.available}
                          className={`
                            px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center min-h-16
                            ${field.value === slot.time
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : slot.available
                                  ? 'bg-green-50 text-green-700 border-green-200 hover:border-green-400 hover:bg-green-100 hover:shadow-sm'
                                  : slot.status === 'past'
                                    ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                                    : slot.status === 'occupied'
                                      ? 'bg-red-50 text-red-400 border-red-200 cursor-not-allowed'
                                      : 'bg-red-50 text-red-400 border-red-200 cursor-not-allowed'
                              }
                          `}
                        >
                          {slot.time}
                          {!slot.available && (
                            <div className="text-xs leading-tight">{slotLabel}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Informações adicionais ou pedidos especiais" 
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="mt-8 space-y-6">
          <Button
            type="submit"
            className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            disabled={createAppointmentMutation.isPending || (requiresProfessionalSelection && !selectedProfessionalId)}
          >
            {createAppointmentMutation.isPending ? (
              <div className="flex items-center justify-center gap-2">
                <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Agendando...</span>
              </div>
            ) : (
              "Confirmar Agendamento"
            )}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">
                ou agende diretamente pelo
              </span>
            </div>
          </div>
          
          <Button
            type="button"
            onClick={handleWhatsAppScheduling}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-xl transition-colors duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
          >
            <MessageSquare className="h-5 w-5" />
            Agendar pelo WhatsApp
          </Button>
        </div>
      </form>
    </Form>
    </>
  );
}
