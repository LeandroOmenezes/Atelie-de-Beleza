import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { Calendar, Clock, User, Phone, Mail, Star, Pencil, Check, X } from "lucide-react";
import { maskPhone } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfileImageUpload } from "@/components/profile/profile-image-upload";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SubscriptionPlan, UserSubscription } from "@shared/schema";

interface UserAppointment {
  id: number;
  name: string;
  email: string;
  phone: string;
  serviceId: number;
  categoryId: number;
  date: string;
  time: string;
  notes?: string;
  status: string;
  createdAt: string;
}

interface Service {
  id: number;
  name: string;
  description: string;
  minPrice: number;
  maxPrice: number;
  categoryId: number;
  icon: string;
  featured: boolean;
  imageUrl?: string;
}

interface Category {
  id: number;
  name: string;
  icon: string;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");

  if (authLoading) {
    return (
      <div className="font-sans bg-gray-100 text-gray-800 min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { data: myAppointments = [], isLoading: appointmentsLoading } = useQuery<UserAppointment[]>({
    queryKey: ["/api/my-appointments"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services/all"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: mySubscription = null } = useQuery<UserSubscription | null>({
    queryKey: ["/api/my-subscription"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const { data: subscriptionPlans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const updatePhoneMutation = useMutation({
    mutationFn: async (phone: string) => {
      const res = await apiRequest("PATCH", "/api/user/phone", { phone });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setEditingPhone(false);
      toast({ title: "WhatsApp salvo!", description: "Seu número foi atualizado com sucesso." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message || "Não foi possível salvar o número.", variant: "destructive" });
    },
  });

  const startEditPhone = () => {
    setPhoneValue(user?.phone || "");
    setEditingPhone(true);
  };

  const cancelEditPhone = () => {
    setEditingPhone(false);
    setPhoneValue("");
  };

  const savePhone = () => {
    const cleaned = phoneValue.replace(/\D/g, "");
    if (cleaned.length < 10) {
      toast({ title: "Número inválido", description: "Digite um número com DDD (mínimo 10 dígitos).", variant: "destructive" });
      return;
    }
    updatePhoneMutation.mutate(phoneValue.trim());
  };

  const getServiceData = (serviceId: number) => services.find(s => s.id === serviceId);
  const getCategoryData = (categoryId: number) => categories.find(c => c.id === categoryId);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Aguardando Confirmação';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Realizado';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return '📅';
      case 'pending': return '⏳';
      case 'cancelled': return '❌';
      case 'completed': return '✅';
      default: return '📋';
    }
  };

  const currentPlan = mySubscription
    ? subscriptionPlans.find((plan) => plan.id === mySubscription.planId)
    : null;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="font-sans bg-gray-100 text-gray-800 min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="py-16 bg-gray-100">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">

              {/* Card de Perfil */}
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-8 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                  <div className="mx-auto sm:mx-0">
                    <ProfileImageUpload
                      userId={user!.id}
                      currentImageUrl={user!.profileImageBase64 ? (user!.profileImageBase64.startsWith('http') ? user!.profileImageBase64 : `/api/images/user/${user!.id}`) : undefined}
                      size="lg"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 break-words">{user?.name || user?.username}</h1>
                    <div className="flex flex-col space-y-2 mt-3 text-gray-600">
                      {/* Email */}
                      <div className="flex items-center justify-center sm:justify-start space-x-2 min-w-0">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate text-sm sm:text-base">{user?.username}</span>
                      </div>

                      {/* WhatsApp / Telefone */}
                      <div className="flex items-center justify-center sm:justify-start space-x-2 min-w-0">
                        <Phone className="w-4 h-4 flex-shrink-0 text-green-600" />
                        {editingPhone ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Input
                              value={phoneValue}
                              onChange={e => setPhoneValue(maskPhone(e.target.value))}
                              placeholder="(11) 99999-9999"
                              maxLength={15}
                              className="h-8 w-44 text-sm"
                              autoFocus
                              onKeyDown={e => { if (e.key === "Enter") savePhone(); if (e.key === "Escape") cancelEditPhone(); }}
                            />
                            <Button
                              size="sm"
                              className="h-8 px-2 bg-green-600 hover:bg-green-700"
                              onClick={savePhone}
                              disabled={updatePhoneMutation.isPending}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={cancelEditPhone}
                              disabled={updatePhoneMutation.isPending}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : user?.phone ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base">{user.phone}</span>
                            <button
                              onClick={startEditPhone}
                              className="text-gray-400 hover:text-blue-500 transition-colors"
                              title="Editar WhatsApp"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={startEditPhone}
                            className="text-sm text-amber-600 hover:text-amber-700 font-medium underline underline-offset-2 transition-colors"
                          >
                            Adicionar WhatsApp
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Minha Assinatura */}
              <Card className="mb-8 border-amber-200 bg-gradient-to-r from-amber-50 to-white">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    <span>Minha Assinatura</span>
                  </CardTitle>
                  <CardDescription>
                    Status atual do seu plano mensal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mySubscription ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm text-gray-600">Status</span>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          {mySubscription.status === "authorized" ? "Ativa" : mySubscription.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm text-gray-600">Plano</span>
                        <span className="font-medium text-gray-900">
                          {currentPlan?.name || `Plano #${mySubscription.planId}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm text-gray-600">Valor mensal</span>
                        <span className="font-medium text-gray-900">
                          {currentPlan ? formatCurrency(Number(currentPlan.price)) : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm text-gray-600">Próxima cobrança</span>
                        <span className="font-medium text-gray-900">
                          {mySubscription.nextBillingDate
                            ? new Date(mySubscription.nextBillingDate).toLocaleDateString("pt-BR")
                            : "-"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">Você ainda não possui assinatura ativa.</p>
                      <Button onClick={() => (window.location.href = "/planos")}>Ver planos</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Meus Agendamentos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Meus Agendamentos</span>
                  </CardTitle>
                  <CardDescription>
                    Visualize e acompanhe o status dos seus agendamentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {appointmentsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Carregando agendamentos...</p>
                    </div>
                  ) : myAppointments.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento encontrado</h3>
                      <p className="text-gray-600">Você ainda não possui agendamentos. Que tal agendar um serviço?</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myAppointments.map((appointment) => {
                        const serviceData = getServiceData(appointment.serviceId);
                        const categoryData = getCategoryData(appointment.categoryId);

                        return (
                          <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    {serviceData && (
                                      <i className={`${serviceData.icon} text-blue-500`}></i>
                                    )}
                                    <h3 className="font-semibold text-gray-900">
                                      {serviceData?.name || `Serviço #${appointment.serviceId}`}
                                    </h3>
                                  </div>
                                  {categoryData && (
                                    <p className="text-sm text-gray-600 mb-1">
                                      <i className={`${categoryData.icon} mr-1`}></i>
                                      {categoryData.name}
                                    </p>
                                  )}
                                  {serviceData && serviceData.minPrice && (
                                    <p className="text-sm text-green-600 font-medium">
                                      A partir de R$ {serviceData.minPrice.toFixed(2).replace('.', ',')}
                                    </p>
                                  )}
                                </div>
                                <Badge className={`${getStatusColor(appointment.status)} border flex items-center space-x-1 flex-shrink-0`}>
                                  <span>{getStatusIcon(appointment.status)}</span>
                                  <span>{getStatusText(appointment.status)}</span>
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4 flex-shrink-0" />
                                  <span>{formatDate(appointment.date)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 flex-shrink-0" />
                                  <span>{appointment.time}</span>
                                </div>
                              </div>

                              {appointment.notes && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-md border-l-4 border-blue-200">
                                  <p className="text-sm text-gray-700">
                                    <strong className="text-blue-800">Observações:</strong> {appointment.notes}
                                  </p>
                                </div>
                              )}

                              <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                                Agendamento #{appointment.id} • Criado em: {new Date(appointment.createdAt).toLocaleDateString('pt-BR')} às{' '}
                                {new Date(appointment.createdAt).toLocaleTimeString('pt-BR')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Estatísticas Rápidas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-xl font-bold text-gray-900">{myAppointments.length}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-lg mb-2">✅</div>
                    <div className="text-xl font-bold text-green-600">
                      {myAppointments.filter(a => a.status === 'completed').length}
                    </div>
                    <div className="text-xs text-gray-600">Realizados</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-lg mb-2">📅</div>
                    <div className="text-xl font-bold text-blue-600">
                      {myAppointments.filter(a => a.status === 'confirmed').length}
                    </div>
                    <div className="text-xs text-gray-600">Confirmados</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-lg mb-2">⏳</div>
                    <div className="text-xl font-bold text-yellow-600">
                      {myAppointments.filter(a => a.status === 'pending').length}
                    </div>
                    <div className="text-xs text-gray-600">Pendentes</div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
