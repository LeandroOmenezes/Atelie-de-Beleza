import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
          await destroyCardForm(existingCardForm);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assinar {planName}</DialogTitle>
          <DialogDescription>
            Complete seu pagamento para ativar a assinatura
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Mensalidade</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {planPrice.toFixed(2)}/mês
                </p>
              </div>
            </div>
          </Card>

          <form id={containerId} key={containerId} className="space-y-4" noValidate style={{ display: 'block' }}>
            <div className="space-y-3">
              <div id={`${containerId}-cardNumber`} style={{ minHeight: '40px', display: 'block' }} />
              <div className="grid grid-cols-2 gap-3">
                <div id={`${containerId}-cardExpirationDate`} style={{ minHeight: '40px', display: 'block' }} />
                <div id={`${containerId}-securityCode`} style={{ minHeight: '40px', display: 'block' }} />
              </div>
              <div id={`${containerId}-cardholderName`} style={{ minHeight: '40px', display: 'block' }} />
            </div>
          </form>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            Sua assinatura é recorrente. A próxima cobrança será em 30 dias. Você pode cancelar a qualquer momento.
          </div>

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
