import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubscriptionCheckoutForm } from "@/components/payments/subscription-checkout-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
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
        setIsLoading(false);
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
    // Recarrega assinatura do usuário
    fetch("/api/my-subscription", { credentials: "include" }).then((res) => {
      if (res.ok) return res.json();
      return null;
    }).then((sub) => setUserSubscription(sub));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Carregando planos...</p>
      </div>
    );
  }

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
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col h-full hover:shadow-lg transition-shadow">
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-4 flex-1">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <p className="text-4xl font-bold text-primary">
                    R$ {plan.price.toFixed(2)}
                  </p>
                  <p className="text-gray-600 text-sm">/mês</p>
                </div>

                {/* Services included */}
                {(() => {
                  const includedIds = parseIncludedServiceIds(plan.includedServiceIds as string | null | undefined);
                  return includedIds.length > 0 ? (
                    <div className="mb-6">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Serviços Inclusos:</p>
                      <div className="flex flex-wrap gap-2">
                        {includedIds.map((serviceId) => {
                          const svc = priceItems.find((s) => s.id === serviceId);
                          return (
                            <Badge key={serviceId} variant="secondary">
                              {svc?.name ?? `Serviço #${serviceId}`}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Subscribe Button */}
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={!!(userSubscription && userSubscription.planId === plan.id)}
                  className="w-full"
                >
                  {userSubscription && userSubscription.planId === plan.id
                    ? "Assinatura Ativa"
                    : "Assinar Agora"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <Card className="p-8 bg-gradient-to-r from-blue-50 to-blue-100">
          <h2 className="text-2xl font-bold mb-6">Benefícios da Assinatura</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="text-2xl">✓</div>
              <div>
                <h3 className="font-semibold text-gray-900">Acesso Prioritário</h3>
                <p className="text-gray-700">Agende seus serviços inclusos sem preocupação com disponibilidade</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-2xl">✓</div>
              <div>
                <h3 className="font-semibold text-gray-900">Renovação Automática</h3>
                <p className="text-gray-700">Sua assinatura renova automaticamente todo mês</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-2xl">✓</div>
              <div>
                <h3 className="font-semibold text-gray-900">Cancelamento Flexível</h3>
                <p className="text-gray-700">Cancele quando quiser, sem multa ou taxa adicional</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-2xl">✓</div>
              <div>
                <h3 className="font-semibold text-gray-900">Suporte Dedicado</h3>
                <p className="text-gray-700">Acesso prioritário ao nosso time de atendimento</p>
              </div>
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
