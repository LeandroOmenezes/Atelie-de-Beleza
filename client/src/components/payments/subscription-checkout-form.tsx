import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, Lock, CreditCard, BadgeCheck, Sparkles, CircleCheckBig, Landmark, CreditCard as CreditCardIcon } from "lucide-react";
import { createCardForm, destroyCardForm } from "@/lib/mercadopago";
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
  onSuccess: _onSuccess,
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
    setIsLoading(true);
    try {
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao criar assinatura");
      }

      const data = await response.json();
      if (!data.redirectUrl) {
        throw new Error("Mercado Pago não retornou o link de autorização");
      }

      window.location.assign(data.redirectUrl);
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
      <DialogContent className="sm:max-w-md border-0 shadow-2xl transition-all duration-300 ease-out overflow-hidden p-4 sm:p-5">
        <div className="max-h-[76vh] overflow-y-auto overflow-x-hidden pr-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <DialogHeader className="space-y-2">
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

        <div className="space-y-3 animate-[fadeIn_0.25s_ease-out]">
          <Card className="border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-3 shadow-sm">
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

          <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-2.5 text-sm text-emerald-700 shadow-sm">
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

          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900">
            <div className="flex items-center gap-2 font-semibold">
              <Landmark className="h-4 w-4 text-blue-700" />
              Você será direcionado ao Mercado Pago
            </div>
            <p className="mt-2 text-blue-800">
              A autorização do cartão e da assinatura recorrente será concluída com segurança no ambiente oficial do Mercado Pago.
            </p>
          </div>

          <form id={containerId} key={containerId} className="hidden" noValidate>
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
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">CPF do titular do cartão</label>
                <input
                  id={`${containerId}-identificationNumber`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
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

          <div className="flex gap-2 pt-3">
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="flex-1 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="flex-1 bg-blue-500 text-white shadow-sm hover:bg-blue-600"
            >
              {isLoading ? "Abrindo Mercado Pago..." : "Continuar no Mercado Pago"}
            </Button>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
