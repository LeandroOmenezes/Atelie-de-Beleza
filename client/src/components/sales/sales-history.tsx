import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sale, ServiceOption } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ban, Pencil, AlertTriangle } from "lucide-react";

type FilterPeriod = "day" | "week" | "month" | "all";

const PAYMENT_METHODS = [
  { id: "cash", name: "Dinheiro" },
  { id: "credit", name: "Cartão de Crédito" },
  { id: "debit", name: "Cartão de Débito" },
  { id: "pix", name: "PIX" },
];

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SalesHistory() {
  const { toast } = useToast();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");

  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; sale: Sale | null }>({ open: false, sale: null });
  const [cancelReason, setCancelReason] = useState("");

  const [editDialog, setEditDialog] = useState<{ open: boolean; sale: Sale | null }>({ open: false, sale: null });
  const [editData, setEditData] = useState<{
    clientName: string;
    amount: string;
    date: string;
    paymentMethod: string;
    serviceId: string;
    notes: string;
  }>({ clientName: "", amount: "", date: localDateStr(), paymentMethod: "", serviceId: "", notes: "" });

  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales", filterPeriod],
  });

  const { data: services } = useQuery<ServiceOption[]>({
    queryKey: ["/api/services/all"],
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/sales/${id}/cancel`, { reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Venda cancelada", description: "A venda foi marcada como cancelada." });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setCancelDialog({ open: false, sale: null });
      setCancelReason("");
    },
    onError: () => {
      toast({ title: "Erro ao cancelar", description: "Não foi possível cancelar a venda.", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof editData }) => {
      const res = await apiRequest("PATCH", `/api/sales/${id}`, {
        ...data,
        amount: parseFloat(data.amount),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Venda atualizada", description: "Os dados da venda foram salvos." });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setEditDialog({ open: false, sale: null });
    },
    onError: () => {
      toast({ title: "Erro ao editar", description: "Não foi possível salvar as alterações.", variant: "destructive" });
    },
  });

  const getFilteredSales = () => {
    if (!sales) return [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (filterPeriod) {
      case "day":
        return sales.filter(sale => new Date(sale.date + "T00:00:00") >= today);
      case "week": {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return sales.filter(sale => new Date(sale.date + "T00:00:00") >= weekStart);
      }
      case "month": {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return sales.filter(sale => new Date(sale.date + "T00:00:00") >= monthStart);
      }
      default:
        return sales;
    }
  };

  const filteredSales = getFilteredSales();
  const activeSales = filteredSales.filter(s => s.status !== "cancelled");

  const calculateTotal = (list: Sale[]) =>
    list.filter(s => s.status !== "cancelled").reduce((t, s) => t + s.amount, 0);

  const formatDate = (dateString: string) =>
    new Date(dateString + "T00:00:00").toLocaleDateString("pt-BR");

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case "cash": return "Dinheiro";
      case "credit": return "Cartão de Crédito";
      case "debit": return "Cartão de Débito";
      case "pix": return "PIX";
      default: return method;
    }
  };

  function openCancelDialog(sale: Sale) {
    setCancelDialog({ open: true, sale });
    setCancelReason("");
  }

  function openEditDialog(sale: Sale) {
    setEditData({
      clientName: sale.clientName,
      amount: sale.amount.toString(),
      date: sale.date,
      paymentMethod: sale.paymentMethod,
      serviceId: sale.serviceId.toString(),
      notes: sale.notes ?? "",
    });
    setEditDialog({ open: true, sale });
  }

  return (
    <div className="bg-gray-100 p-6 rounded-lg shadow-md h-full">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center mb-3">
          <i className="fas fa-history mr-3 text-blue-500"></i> Histórico de Vendas
        </h3>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {(["day", "week", "month", "all"] as FilterPeriod[]).map((period) => {
            const label = period === "day" ? "Hoje" : period === "week" ? "Semana" : period === "month" ? "Mês" : "Todos";
            return (
              <Button
                key={period}
                variant={filterPeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterPeriod(period)}
                className={`${filterPeriod === period ? "bg-blue-500 text-white" : "bg-white border border-gray-200 text-gray-700"} text-xs sm:text-sm px-2 sm:px-3`}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-4">Carregando...</div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-4 text-gray-500">Nenhuma venda encontrada no período selecionado.</div>
        ) : (
          <table className="min-w-full bg-white border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 px-4 text-left text-gray-700 font-medium">Data</th>
                <th className="py-3 px-4 text-left text-gray-700 font-medium">Cliente</th>
                <th className="py-3 px-4 text-left text-gray-700 font-medium">Serviço</th>
                <th className="py-3 px-4 text-left text-gray-700 font-medium">Valor</th>
                <th className="py-3 px-4 text-left text-gray-700 font-medium">Pagamento</th>
                <th className="py-3 px-4 text-left text-gray-700 font-medium">Obs.</th>
                <th className="py-3 px-4 text-left text-gray-700 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => {
                const cancelled = (sale.status ?? "active") === "cancelled";
                return (
                  <tr
                    key={sale.id}
                    className={`border-b border-gray-100 ${cancelled ? "opacity-50 bg-red-50" : "hover:bg-gray-50"}`}
                  >
                    <td className={`py-3 px-4 text-gray-700 ${cancelled ? "line-through" : ""}`}>{formatDate(sale.date)}</td>
                    <td className={`py-3 px-4 text-gray-700 ${cancelled ? "line-through" : ""}`}>{sale.clientName}</td>
                    <td className={`py-3 px-4 text-gray-700 ${cancelled ? "line-through" : ""}`}>{sale.serviceName}</td>
                    <td className={`py-3 px-4 font-medium ${cancelled ? "line-through text-gray-400" : "text-gray-700"}`}>
                      R${sale.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{getPaymentMethodName(sale.paymentMethod)}</td>
                    <td className="py-3 px-4 text-gray-500 text-sm max-w-[140px] truncate" title={sale.notes ?? ""}>
                      {sale.notes || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      {cancelled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                          <Ban size={12} /> Cancelada
                        </span>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditDialog(sale)}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-500 transition-colors"
                            title="Editar venda"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => openCancelDialog(sale)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors"
                            title="Cancelar venda"
                          >
                            <Ban size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h4 className="font-medium text-gray-700 mb-1">
            Total {filterPeriod === "day" ? "de Hoje" : filterPeriod === "week" ? "da Semana" : filterPeriod === "month" ? "do Mês" : ""}
          </h4>
          <p className="text-2xl font-bold text-gray-800">R${calculateTotal(filteredSales).toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h4 className="font-medium text-gray-700 mb-1">Vendas</h4>
          <p className="text-2xl font-bold text-gray-800">{activeSales.length}</p>
          {filteredSales.length !== activeSales.length && (
            <p className="text-xs text-red-400 mt-0.5">{filteredSales.length - activeSales.length} cancelada(s)</p>
          )}
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h4 className="font-medium text-gray-700 mb-1">Média por Venda</h4>
          <p className="text-2xl font-bold text-gray-800">
            R${activeSales.length ? (calculateTotal(filteredSales) / activeSales.length).toFixed(2) : "0.00"}
          </p>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, sale: open ? cancelDialog.sale : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={18} />
              Cancelar Venda
            </DialogTitle>
          </DialogHeader>
          {cancelDialog.sale && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <p>Você está cancelando a venda de <strong>{cancelDialog.sale.clientName}</strong> — {cancelDialog.sale.serviceName} (R${cancelDialog.sale.amount.toFixed(2)}).</p>
                <p className="mt-1">A venda não será excluída, mas ficará marcada como cancelada no histórico.</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cancelReason">Motivo do cancelamento <span className="text-gray-400 font-normal">(opcional)</span></Label>
                <Textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: cliente desistiu, serviço não realizado..."
                  className="resize-none"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog({ open: false, sale: null })}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelDialog.sale && cancelMutation.mutate({ id: cancelDialog.sale.id, reason: cancelReason })}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, sale: open ? editDialog.sale : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={16} />
              Editar Venda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Cliente</Label>
              <Input
                value={editData.clientName}
                onChange={(e) => setEditData(d => ({ ...d, clientName: e.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>
            <div className="space-y-1">
              <Label>Serviço</Label>
              <Select
                value={editData.serviceId}
                onValueChange={(val) => setEditData(d => ({ ...d, serviceId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editData.amount}
                onChange={(e) => setEditData(d => ({ ...d, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                type="date"
                value={editData.date}
                onChange={(e) => setEditData(d => ({ ...d, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Forma de Pagamento</Label>
              <Select
                value={editData.paymentMethod}
                onValueChange={(val) => setEditData(d => ({ ...d, paymentMethod: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar método" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Observações <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <Textarea
                value={editData.notes}
                onChange={(e) => setEditData(d => ({ ...d, notes: e.target.value }))}
                placeholder="Ex: desconto aplicado, serviço adicional..."
                className="resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, sale: null })}>
              Cancelar
            </Button>
            <Button
              onClick={() => editDialog.sale && editMutation.mutate({ id: editDialog.sale.id, data: editData })}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
