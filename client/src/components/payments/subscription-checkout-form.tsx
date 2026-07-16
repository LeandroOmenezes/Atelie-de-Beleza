import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, Lock, CreditCard, BadgeCheck, Sparkles, CircleCheckBig, Landmark, CreditCard as CreditCardIcon } from "lucide-react";
import { createCardForm, destroyCardForm, tokenizeCard } from "@/lib/mercadopago";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionCheckoutFormProps {
  planId: number;
  planName: string;
  planPrice: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const createContainerId = () => `subscription-form-container-${Math.random().toString(36).slice(2)}`;

export function SubscriptionCheckoutForm({
  planId,
  planName,
  planPrice,
  isOpen,
  onClose,
  onSuccess,
}: SubscriptionCheckoutFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCardFormReady, setIsCardFormReady] = useState(false);
  const [containerId, setContainerId] = useState(createContainerId);
  const cardFormRef = useRef<any>(null);
  const isMountingRef = useRef(false);
  const isCleaningRef = useRef(false);
  const { toast } = useToast();

  const cleanupPromiseRef = useRef<Promise<void> | null>(null);

  const cleanupCardForm = useCallback(async (targetContainerId = containerId) => {
    const previousCleanup = cleanupPromiseRef.current;
    if (previousCleanup) {
      await previousCleanup.catch(() => undefined);
    }

    isCleaningRef.current = true;

    const cleanupPromise = (async () => {
      if (cardFormRef.current) {
        const existingCardForm = cardFormRef.current;
        cardFormRef.current = null;
        setIsCardFormReady(false);

        try {
          await destroyCardForm(existingCardForm, targetContainerId);
        } catch (error) {
          console.warn("SubscriptionCheckoutForm: erro ao desmontar card form", error);
        }
      }

      const previousContainer = document.getElementById(targetContainerId);
      if (previousContainer) {
        previousContainer.innerHTML = "";
      }

      await new Promise((resolve) => setTimeout(resolve, 120));
    })();

    cleanupPromiseRef.current = cleanupPromise;
    try {
      await cleanupPromise;
    } finally {
      cleanupPromiseRef.current = null;
      isCleaningRef.current = false;
    }
  }, [containerId]);

  useEffect(() => {
    if (!isOpen || cardFormRef.current || cleanupPromiseRef.current || isMountingRef.current || isCleaningRef.current) {
      return;
    }

    let isMounted = true;
    isMountingRef.current = true;

    async function mountCardForm() {
      try {
        await cleanupCardForm(containerId);
        await new Promise((resolve) => requestAnimationFrame(resolve));

        const container = document.getElementById(containerId);
        if (!container) {
          throw new Error(`${containerId} não encontrado no DOM`);
        }

        const form = await createCardForm(containerId, {
          amount: planPrice.toFixed(2),
        });

        if (!isMounted) {
          await cleanupCardForm(containerId);
          return;
        }

        cardFormRef.current = form;
        setIsCardFormReady(true);
      } catch (error: any) {
        if (!isMounted) {
          return;
        }

        console.error("SubscriptionCheckoutForm: erro ao montar card form", error);
        console.error("SubscriptionCheckoutForm: erro detalhes", {
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          raw: error,
        });
        console.error("SubscriptionCheckoutForm: debug message", {
          containerId,
          isCleaning: isCleaningRef.current,
          isMounting: isMountingRef.current,
        });

        toast({
          title: "Erro",
          description: "Falha ao carregar formulário de pagamento",
          variant: "destructive",
        });
      } finally {
        isMountingRef.current = false;
      }
    }

    mountCardForm();

    return () => {
      isMounted = false;
    };
  }, [isOpen, planPrice, containerId, cleanupCardForm, toast]);

  useEffect(() => {
    if (!isOpen) {
      void cleanupCardForm(containerId);
      setContainerId(createContainerId());
    }

    return () => {
      void cleanupCardForm();
    };
  }, [cleanupCardForm, containerId, isOpen]);

  const handleOpenChange = async (open: boolean) => {
    if (!open) {
      await cleanupCardForm(containerId);
      setContainerId(createContainerId());
      onClose();
    }
  };

  const handleSubscribe = async () => {
    const cardForm = cardFormRef.current;
    if (!cardForm || !isCardFormReady) {
      toast({
        title: "Aguardando formulário",
        description: "O formulário de pagamento ainda está carregando. Tente novamente em alguns instantes.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Tokeniza o cartão
      const token = await tokenizeCard(cardForm);

      // Envia para o servidor criar a assinatura
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao criar assinatura");
      }

      const data = await response.json();
      toast({
        title: "Sucesso!",
        description: `Você se inscreveu no plano ${planName}! Primeira cobrança será em 1 mês.`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro na assinatura",
        description: error.message || "Falha ao processar assinatura",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl transition-all duration-300 ease-out">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-white p-1.5 shadow-sm">
                <Landmark className="h-4 w-4 text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Pagamento protegido</p>
                <p className="text-xs text-gray-600">Processado pelo Mercado Pago</p>
              </div>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              SSL + criptografia
            </div>
          </div>
          <DialogTitle>Assinar {planName}</DialogTitle>
          <DialogDescription>
            Complete seu pagamento para ativar a assinatura
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 animate-[fadeIn_0.25s_ease-out]">
          <Card className="border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-blue-700">Plano escolhido</p>
                <p className="text-xl font-semibold text-gray-900">{planName}</p>
                <p className="mt-1 text-sm text-gray-600">Cobrança mensal recorrente com segurança reforçada.</p>
              </div>
              <div className="rounded-full bg-white p-2 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-blue-100 pt-3">
              <span className="text-sm text-gray-600">Mensalidade</span>
              <span className="text-2xl font-bold text-gray-900">R$ {planPrice.toFixed(2)}/mês</span>
            </div>
          </Card>

          <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-3 text-sm text-emerald-700 shadow-sm">
            <div className="flex items-center gap-2 font-medium">
              <Lock className="h-4 w-4" />
              Pagamento processado com tecnologia de segurança do Mercado Pago
            </div>
            <p className="mt-1 text-emerald-700/90">
              Seus dados de cartão são protegidos e não ficam armazenados em nosso sistema.
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700/80">
              <CircleCheckBig className="h-3.5 w-3.5" />
              Checkout criptografado e com validação de segurança
            </div>
            <div className="mt-3 rounded-lg border border-emerald-100 bg-white/80 p-2">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                <Landmark className="h-3.5 w-3.5" />
                Aceitamos
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                  Mercado Pago
                </div>
                <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                  Visa
                </div>
                <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                  Mastercard
                </div>
                <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                  Elo
                </div>
              </div>
            </div>
          </div>

          <form id={containerId} key={containerId} className="space-y-4" noValidate style={{ display: 'block' }}>
            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  Dados do cartão
                </div>
                <div className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
                  <Sparkles className="h-3 w-3" />
                  Seguro
                </div>
              </div>
              <div id={`${containerId}-cardNumber`} style={{ minHeight: '40px', display: 'block' }} />
              <div className="grid grid-cols-2 gap-3">
                <div id={`${containerId}-cardExpirationDate`} style={{ minHeight: '40px', display: 'block' }} />
                <div id={`${containerId}-securityCode`} style={{ minHeight: '40px', display: 'block' }} />
              </div>
              <div id={`${containerId}-cardholderName`} style={{ minHeight: '40px', display: 'block' }} />
            </div>
          </form>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            <div className="flex items-center gap-2 font-medium text-gray-700">
              <BadgeCheck className="h-4 w-4 text-blue-600" />
              Sua assinatura é recorrente. A próxima cobrança será em 30 dias. Você pode cancelar a qualquer momento.
            </div>
          </div>

          {!isCardFormReady && (
            <div className="overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 text-sm text-blue-700 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Preparando seu formulário de pagamento seguro...
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700/80">
                  Proteção em andamento
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
                <div className="h-full w-1/3 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubscribe}
              disabled={isLoading || !isCardFormReady}
              className="flex-1"
            >
              {isLoading ? "Processando..." : !isCardFormReady ? "Carregando formulário..." : `Assinar por R$ ${planPrice.toFixed(2)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
