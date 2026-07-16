import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubscriptionCheckoutForm } from "@/components/payments/subscription-checkout-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { BadgeCheck, CalendarClock, ShieldCheck, Sparkles } from "lucide-react";
import type { SubscriptionPlan, UserSubscription } from "@shared/schema";

function parseIncludedServiceIds(value: string | number[] | null | undefined): number[] {
  if (!value) return [];

  // Caso o backend já retorne um array
  if (Array.isArray(value)) {
    return value.filter((id): id is number => typeof id === "number");
  }

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
    }

    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => !Number.isNaN(id));
    }

    const singleId = Number(trimmed);
    return Number.isNaN(singleId) ? [] : [singleId];
  } catch {
    return [];
  }
}

export function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [priceItems, setPriceItems] = useState<Array<{ id: number; name?: string }>>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchData = async () => {
      try {
        const [plansRes, subscriptionRes] = await Promise.all([
          fetch("/api/subscription-plans"),
          fetch("/api/my-subscription", { credentials: "include" }),
        ]);

        // fetch price items for display
        try {
          const svcRes = await fetch("/api/prices");
          if (svcRes.ok) {
            const svcData = await svcRes.json();
            setPriceItems(Array.isArray(svcData) ? svcData.map((s: any) => ({ id: s.id, name: s.name })) : []);
          }
        } catch {}

        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setPlans(plansData);
        }

        if (subscriptionRes.ok) {
          const subData = await subscriptionRes.json();
          if (subData) {
            setUserSubscription(subData);
          }
        }
      } catch (error) {
        toast({
          title: "Erro",
          description: "Falha ao carregar planos",
          variant: "destructive",
        });
      } finally {
        setPageIsLoading(false);
      }
    };

    fetchData();
  }, [user, navigate, toast]);

  const handleSubscribe = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowCheckout(true);
  };

  const handleCancelSubscription = async () => {
    if (!userSubscription) return;

    if (!confirm("Tem certeza que deseja cancelar sua assinatura?")) {
      return;
    }

    try {
      const response = await fetch(`/api/subscriptions/${userSubscription.id}/cancel`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erro ao cancelar");
      }

      toast({
        title: "Assinatura cancelada",
        description: "Sua assinatura foi cancelada com sucesso",
      });

      setUserSubscription(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao cancelar assinatura",
        variant: "destructive",
      });
    }
  };

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    setSelectedPlan(null);
    navigate("/profile");
  };

  if (pageIsLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Carregando planos...</p>
      </div>
    );
  }

  const recommendedPlanId = plans.reduce((bestId, plan) => {
    const bestPlan = plans.find((p) => p.id === bestId);
    if (!bestPlan) return plan.id;
    return plan.price > bestPlan.price ? plan.id : bestId;
  }, plans[0]?.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Nossos Planos</h1>
          <p className="text-xl text-gray-600">
            Escolha um plano e desfrute de acesso aos nossos serviços inclusos
          </p>
        </div>

        {/* User's Current Subscription */}
        {userSubscription && (
          <Card className="mb-8 p-6 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-green-900">Você tem uma assinatura ativa</h2>
                <p className="text-green-700">
                  Próxima cobrança: {new Date(userSubscription.nextBillingDate).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleCancelSubscription}
              >
                Cancelar Assinatura
              </Button>
            </div>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => {
            const isCurrentPlan = !!(userSubscription && userSubscription.planId === plan.id);
            const isRecommended = recommendedPlanId === plan.id;

            return (
            <Card
              key={plan.id}
              className={`flex h-full flex-col border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
                isRecommended
                  ? "border-amber-300 bg-gradient-to-b from-amber-50 to-white"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-1 flex-col p-6">
                <div className="mb-4 flex min-h-[24px] items-center gap-2">
                  {isRecommended ? (
                    <Badge className="border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100">Mais escolhido</Badge>
                  ) : null}
                  {isCurrentPlan ? (
                    <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Sua assinatura atual</Badge>
                  ) : null}
                </div>

                <h3 className="mb-2 text-2xl font-bold text-slate-900">{plan.name}</h3>
                <p className="mb-4 flex-1 text-sm text-slate-600">{plan.description}</p>

                {/* Price */}
                <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-4xl font-bold text-slate-900">
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-sm text-slate-600">por mês</p>
                  <p className="mt-1 text-xs text-slate-500">Cobrança recorrente mensal</p>
                </div>

                {/* Services included */}
                {(() => {
                  const includedIds = parseIncludedServiceIds(plan.includedServiceIds as string | null | undefined);
                  return includedIds.length > 0 ? (
                    <div className="mb-6">
                      <p className="mb-2 text-sm font-semibold text-slate-700">Serviços inclusos:</p>
                      <div className="flex flex-wrap gap-2">
                        {includedIds.map((serviceId) => {
                          const svc = priceItems.find((s) => s.id === serviceId);
                          return (
                            <Badge key={serviceId} variant="secondary" className="bg-slate-100 text-slate-700">
                              {svc?.name ?? `Serviço #${serviceId}`}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}

                <div className="mb-5 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                  Cancelamento quando desejar, sem multa ou taxa adicional.
                </div>

                {/* Subscribe Button */}
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrentPlan}
                  className={`w-full ${isRecommended ? "bg-amber-500 text-black hover:bg-amber-400" : ""}`}
                >
                  {isCurrentPlan
                    ? "Assinatura ativa"
                    : "Assinar Agora"}
                </Button>
              </div>
            </Card>
          )})}
        </div>

        {/* Benefits Section */}
        <Card className="mb-6 overflow-hidden border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-0 text-white shadow-xl">
          <div className="p-8 md:p-10">
            <div className="mb-8 flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-amber-300" />
              <h2 className="text-2xl font-bold md:text-3xl">Benefícios da Assinatura</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/15 bg-white/5 p-5 backdrop-blur">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-300/20">
                  <BadgeCheck className="h-5 w-5 text-emerald-300" />
                </div>
                <h3 className="mb-1 font-semibold">Acesso Prioritário</h3>
                <p className="text-sm text-slate-200">Agende seus serviços inclusos com prioridade de atendimento.</p>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/5 p-5 backdrop-blur">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-cyan-300/20">
                  <CalendarClock className="h-5 w-5 text-cyan-300" />
                </div>
                <h3 className="mb-1 font-semibold">Renovação Mensal Automática</h3>
                <p className="text-sm text-slate-200">Sua assinatura é renovada mensalmente para manter seus benefícios ativos.</p>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/5 p-5 backdrop-blur">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-300/20">
                  <ShieldCheck className="h-5 w-5 text-amber-300" />
                </div>
                <h3 className="mb-1 font-semibold">Cancelamento Simples no App</h3>
                <p className="text-sm text-slate-200">Você pode cancelar quando quiser, sem multa ou taxa adicional.</p>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/5 p-5 backdrop-blur">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-fuchsia-300/20">
                  <BadgeCheck className="h-5 w-5 text-fuchsia-300" />
                </div>
                <h3 className="mb-1 font-semibold">Suporte Dedicado</h3>
                <p className="text-sm text-slate-200">Atendimento prioritário para dúvidas e suporte da assinatura.</p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100">
              Transparencia para voce: valor e periodicidade sao exibidos antes da confirmacao. O cancelamento pode ser solicitado diretamente no seu painel.
            </div>
          </div>
        </Card>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <SubscriptionCheckoutForm
          planId={selectedPlan.id}
          planName={selectedPlan.name}
          planPrice={selectedPlan.price}
          isOpen={showCheckout}
          onClose={() => {
            setShowCheckout(false);
            setSelectedPlan(null);
          }}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
