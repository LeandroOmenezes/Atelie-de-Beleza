import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createCardForm, destroyCardForm, tokenizeCard } from "@/lib/mercadopago";
import { useToast } from "@/hooks/use-toast";

interface AppointmentPaymentBrickProps {
  appointmentId: number;
  amount: number;
  serviceDescription: string;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export function AppointmentPaymentBrick({
  appointmentId,
  amount,
  serviceDescription,
  isOpen,
  onClose,
  onPaymentSuccess,
}: AppointmentPaymentBrickProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCardFormReady, setIsCardFormReady] = useState(false);
  const [containerId] = useState(() => `payment-form-container-${Math.random().toString(36).slice(2)}`);
  const cardFormRef = useRef<any>(null);
  const { toast } = useToast();

  const cleanupCardForm = useCallback(async () => {
    if (!cardFormRef.current) {
      return;
    }

    const existingCardForm = cardFormRef.current;
    cardFormRef.current = null;
    setIsCardFormReady(false);

    try {
      await destroyCardForm(existingCardForm, containerId);
    } catch (error) {
      console.warn("AppointmentPaymentBrick: erro ao desmontar card form", error);
    }

    const previousContainer = document.getElementById(containerId);
    if (previousContainer) {
      previousContainer.innerHTML = "";
    }
  }, [containerId]);

  useEffect(() => {
    if (!isOpen || cardFormRef.current) {
      return;
    }

    let isMounted = true;

    async function mountCardForm() {
      try {
        const form = await createCardForm(containerId, {
          amount: amount.toFixed(2),
        });

        if (!isMounted) {
          await cleanupCardForm();
          return;
        }

        cardFormRef.current = form;
        setIsCardFormReady(true);
      } catch (error: any) {
        if (!isMounted) {
          return;
        }

        const message =
          error?.message ||
          (typeof error === "string" ? error : undefined) ||
          JSON.stringify(error) ||
          "Falha ao carregar formulário de pagamento";

        toast({
          title: "Erro",
          description: message,
          variant: "destructive",
        });
      }
    }

    mountCardForm();

    return () => {
      isMounted = false;
    };
  }, [amount, cleanupCardForm, isOpen, toast]);

  const handleOpenChange = async (open: boolean) => {
    if (!open) {
      await cleanupCardForm();
      onClose();
      return;
    }
  };

  const handlePay = async () => {
    if (!cardFormRef.current || !isCardFormReady) {
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
      const token = await tokenizeCard(cardFormRef.current);

      // Envia o token para o servidor processar o pagamento
      const response = await fetch(`/api/appointments/${appointmentId}/pay`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao processar pagamento");
      }

      const data = await response.json();
      toast({
        title: "Sucesso!",
        description: "Seu agendamento foi confirmado com sucesso!",
      });

      onPaymentSuccess();
    } catch (error: any) {
      toast({
        title: "Erro no pagamento",
        description: error.message || "Falha ao processar pagamento",
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
          <DialogTitle>Confirmação de Pagamento</DialogTitle>
          <DialogDescription>
            {serviceDescription} - R$ {amount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              ⏰ Este horário está reservado por <strong>15 minutos</strong>. Complete o pagamento antes que expire.
            </p>
          </div>

          <div id={containerId} className="space-y-4">
            {/* O formulário de cartão será renderizado aqui pelo SDK */}
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
              onClick={handlePay}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Processando..." : `Pagar R$ ${amount.toFixed(2)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
