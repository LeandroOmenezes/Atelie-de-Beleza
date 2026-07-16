import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ServiceOption, Professional, type SiteConfig } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { buildPixPayload } from "@/lib/pix";
import QRCode from "qrcode";
import { QrCode, Copy, Check } from "lucide-react";

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const salesFormSchema = z.object({
  clientName: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  serviceId: z.string().min(1, { message: "Selecione um serviço" }),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Valor deve ser maior que zero",
  }),
  date: z.string().min(1, { message: "Selecione uma data" }),
  paymentMethod: z.string().min(1, { message: "Selecione um método de pagamento" }),
  notes: z.string().optional(),
  professionalId: z.string().optional(),
});

type SalesFormValues = z.infer<typeof salesFormSchema>;

const PAYMENT_METHODS = [
  { id: "cash", name: "Dinheiro" },
  { id: "credit", name: "Cartão de Crédito" },
  { id: "debit", name: "Cartão de Débito" },
  { id: "pix", name: "PIX" },
];

export default function SalesForm() {
  const { toast } = useToast();
  const [selectedServiceName, setSelectedServiceName] = useState<string | null>(null);
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string | null>(null);
  const [pixPayloadStr, setPixPayloadStr] = useState<string | null>(null);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const form = useForm<SalesFormValues>({
    resolver: zodResolver(salesFormSchema),
    defaultValues: {
      clientName: "",
      serviceId: "",
      amount: "",
      date: localDateStr(),
      paymentMethod: "",
      notes: "",
      professionalId: "",
    },
  });

  const { data: services } = useQuery<ServiceOption[]>({
    queryKey: ["/api/services/all"],
  });

  const { data: siteConfig } = useQuery<SiteConfig>({
    queryKey: ["/api/site-config"],
  });

  const { data: allProfessionals = [] } = useQuery<Professional[]>({
    queryKey: ["/api/professionals"],
  });

  const watchedPayment = form.watch("paymentMethod");
  const watchedAmount = form.watch("amount");
  const watchedServiceId = form.watch("serviceId");
  const watchedClientName = form.watch("clientName");

  // Find the category of the selected service to filter professionals
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const availableProfessionals = selectedCategoryId
    ? allProfessionals.filter((p) => p.categoryId === selectedCategoryId && p.active)
    : allProfessionals.filter((p) => p.active);

  useEffect(() => {
    if (watchedServiceId && services) {
      const service = services.find((s) => s.id === watchedServiceId) as any;
      if (service) {
        form.setValue("amount", service.minPrice.toString());
        setSelectedServiceName(service.name);
        setSelectedCategoryId(service.categoryId ?? null);
        form.setValue("professionalId", "");
      }
    }
  }, [watchedServiceId, services, form]);

  useEffect(() => {
    const isPix = watchedPayment === "pix";
    const amount = parseFloat(watchedAmount);
    const hasPixConfig = siteConfig?.pixKey && siteConfig?.pixBeneficiaryName && siteConfig?.pixCity;

    if (isPix && hasPixConfig && !isNaN(amount) && amount > 0) {
      const payload = buildPixPayload(
        siteConfig!.pixKey!,
        siteConfig!.pixBeneficiaryName!,
        siteConfig!.pixCity!,
        amount
      );
      setPixPayloadStr(payload);
      QRCode.toDataURL(payload, { width: 280, margin: 2, color: { dark: "#1a1a1a", light: "#ffffff" } })
        .then((url) => setPixQrDataUrl(url))
        .catch(() => setPixQrDataUrl(null));
    } else {
      setPixQrDataUrl(null);
      setPixPayloadStr(null);
    }
  }, [watchedPayment, watchedAmount, siteConfig]);

  const createSaleMutation = useMutation({
    mutationFn: async (data: SalesFormValues) => {
      const response = await apiRequest("POST", "/api/sales", {
        ...data,
        amount: parseFloat(data.amount),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Venda registrada!", description: "A venda foi registrada com sucesso." });
      form.reset({
        clientName: "",
        serviceId: "",
        amount: "",
        date: localDateStr(),
        paymentMethod: "",
        notes: "",
        professionalId: "",
      });
      setSelectedServiceName(null);
      setSelectedCategoryId(null);
      setPixQrDataUrl(null);
      setPixPayloadStr(null);
      setPixModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao registrar venda", description: error.message || "Tente novamente.", variant: "destructive" });
    },
  });

  function onSubmit(data: SalesFormValues) {
    createSaleMutation.mutate(data);
  }

  function handleCopy() {
    if (!pixPayloadStr) return;
    navigator.clipboard.writeText(pixPayloadStr);
    setCopied(true);
    toast({ title: "Código PIX copiado!", description: "Cole no aplicativo do banco para pagar." });
    setTimeout(() => setCopied(false), 3000);
  }

  const hasPixConfig = !!(siteConfig?.pixKey && siteConfig?.pixBeneficiaryName && siteConfig?.pixCity);
  const amountValue = parseFloat(watchedAmount || "0");
  const pixReady = watchedPayment === "pix" && hasPixConfig && pixQrDataUrl && amountValue > 0;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">Venda manual</p>
              <p className="text-xs text-slate-500">Este lançamento não vem de agendamento automático.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
              Manual
            </span>
          </div>

          <FormField
            control={form.control}
            name="clientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Cliente</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do cliente" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Serviço</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    const service = services?.find((s) => s.id === value);
                    if (service) {
                      setSelectedServiceName(service.name);
                      form.setValue("amount", service.minPrice.toString());
                    }
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar serviço">{selectedServiceName}</SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {services?.map((service) => (
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

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Valor (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Data</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Forma de Pagamento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar método" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
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
            name="professionalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">
                  Profissional <span className="text-gray-400 font-normal">(opcional)</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar profissional" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableProfessionals.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">Nenhum profissional disponível</div>
                    ) : (
                      availableProfessionals.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Observações <span className="text-gray-400 font-normal">(opcional)</span></FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ex: desconto aplicado, serviço adicional, etc."
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* PIX status indicator */}
          {watchedPayment === "pix" && (
            <div className="rounded-lg border bg-green-50 border-green-200 p-3">
              {!hasPixConfig ? (
                <p className="text-sm text-amber-700 text-center">
                  Configure sua chave PIX nas <strong>Configurações do Site</strong> para gerar o QR Code.
                </p>
              ) : !amountValue || amountValue <= 0 ? (
                <p className="text-sm text-gray-500 text-center">Informe o valor para gerar o QR Code.</p>
              ) : pixReady ? (
                <button
                  type="button"
                  onClick={() => setPixModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                >
                  <QrCode size={18} />
                  Exibir QR Code ao Cliente
                </button>
              ) : (
                <p className="text-sm text-gray-400 text-center">Gerando QR Code…</p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full font-medium"
            disabled={createSaleMutation.isPending}
          >
            {createSaleMutation.isPending ? "Registrando..." : "Registrar Venda"}
          </Button>
        </form>
      </Form>

      {/* PIX Modal — full-screen opaque overlay so client sees nothing else */}
      {pixModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6">
          {/* Close button */}
          <button
            type="button"
            onClick={() => setPixModalOpen(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="w-full max-w-xs flex flex-col items-center gap-5">
            <h2 className="text-xl font-bold text-gray-800">Pagamento via PIX</h2>

            {pixQrDataUrl && (
              <div className="rounded-2xl border-2 border-green-200 bg-white p-3 shadow-md">
                <img src={pixQrDataUrl} alt="QR Code PIX" className="w-60 h-60" />
              </div>
            )}

            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-gray-800">{siteConfig?.pixBeneficiaryName}</p>
              {watchedClientName && (
                <p className="text-sm text-gray-500">
                  Cliente: <span className="font-medium text-gray-700">{watchedClientName}</span>
                </p>
              )}
              {selectedServiceName && (
                <p className="text-sm text-gray-500">
                  Serviço: <span className="font-medium text-gray-700">{selectedServiceName}</span>
                </p>
              )}
              <p className="text-3xl font-bold text-green-700 pt-1">
                R$ {amountValue.toFixed(2).replace(".", ",")}
              </p>
            </div>

            {pixPayloadStr && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 text-sm border border-green-300 bg-green-50 hover:bg-green-100 text-green-800 font-medium px-4 py-2.5 rounded-lg transition-colors w-full justify-center"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                {copied ? "Código copiado!" : "Copiar código PIX (copia e cola)"}
              </button>
            )}

            <p className="text-xs text-gray-400">Chave PIX: {siteConfig?.pixKey}</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
