import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { SubscriptionPlan, InsertSubscriptionPlan } from "@shared/schema";
import { Trash2, Edit, Plus } from "lucide-react";

export function SubscriptionPlansManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<Partial<InsertSubscriptionPlan>>({
    name: "",
    description: "",
    price: 0,
    includedServiceIds: "[]",
    active: true,
  });
  const [priceItems, setPriceItems] = useState<Array<{ id: number; name?: string }>>([]);
  const [services, setServices] = useState<Array<{ id: number; name?: string }>>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { toast } = useToast();

  function parseIncludedServiceIds(value: string | null | undefined): number[] {
    if (!value) return [];
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

  useEffect(() => {
    fetchPlans();
    // Fetch price items for validation and display
    (async () => {
      try {
        const res = await fetch('/api/prices');
        if (res.ok) {
          const data = await res.json();
          setPriceItems(Array.isArray(data) ? data.map((s: any) => ({ id: s.id, name: s.name })) : []);
        }
      } catch (e) {
        // ignore
      }
    })();

    // Also fetch services (some existing plans may reference service IDs)
    (async () => {
      try {
        const res = await fetch('/api/services/all');
        if (res.ok) {
          const data = await res.json();
          setServices(Array.isArray(data) ? data.map((s: any) => ({ id: s.id, name: s.name })) : []);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/subscription-plans");
      if (!response.ok) throw new Error("Erro ao buscar planos");
      const data = await response.json();
      setPlans(data);
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

  const handleOpenDialog = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      const ids = parseIncludedServiceIds(plan.includedServiceIds as string | null | undefined);
      setSelectedIds(ids);
      setFormData({
        name: plan.name,
        description: plan.description,
        price: plan.price,
        includedServiceIds: plan.includedServiceIds || "[]",
        active: plan.active,
      });
    } else {
      setEditingPlan(null);
      setSelectedIds([]);
      setFormData({
        name: "",
        description: "",
        price: 0,
        includedServiceIds: "[]",
        active: true,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingPlan(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      includedServiceIds: "[]",
      active: true,
    });
  };

  const handleSave = async () => {
    try {
      // Validar campos obrigatórios
      if (!formData.name?.trim()) {
        toast({
          title: "Campo obrigatório",
          description: "Nome do plano é obrigatório",
          variant: "destructive",
        });
        return;
      }

      if (formData.name.trim().length < 3) {
        toast({
          title: "Nome muito curto",
          description: "Nome deve ter pelo menos 3 caracteres",
          variant: "destructive",
        });
        return;
      }

      if (!formData.description?.trim()) {
        toast({
          title: "Campo obrigatório",
          description: "Descrição é obrigatória",
          variant: "destructive",
        });
        return;
      }

      if (formData.description.trim().length < 10) {
        toast({
          title: "Descrição muito curta",
          description: "Descrição deve ter pelo menos 10 caracteres",
          variant: "destructive",
        });
        return;
      }

      if (!formData.price || formData.price <= 0) {
        toast({
          title: "Preço inválido",
          description: "Preço deve ser maior que 0",
          variant: "destructive",
        });
        return;
      }

      // Converter includedServiceIds de string para array
      let includedServiceIds: number[] = [];
      if (formData.includedServiceIds?.trim()) {
        try {
          // Tentar dois formatos: "1,2,3" ou "[1,2,3]"
          const input = formData.includedServiceIds.trim();
          if (input.startsWith("[") && input.endsWith("]")) {
            // Formato JSON
            includedServiceIds = JSON.parse(input);
          } else {
            // Formato separado por vírgula
            includedServiceIds = input
              .split(",")
              .map((id) => parseInt(id.trim()))
              .filter((id) => !isNaN(id));
          }
        } catch (e) {
          toast({
            title: "Erro",
            description: "IDs dos Serviços inválidos. Use: 1, 2, 3 ou [1, 2, 3]",
            variant: "destructive",
          });
          return;
        }
      }

      // Validar IDs existem na tabela de price items ou na tabela services
      if (includedServiceIds.length > 0) {
        const knownIds = new Set<number>([...priceItems.map((s) => s.id), ...services.map((s) => s.id)]);
        if (knownIds.size > 0) {
        const missing = includedServiceIds.filter((id) => !knownIds.has(id));
        if (missing.length > 0) {
          toast({
            title: "IDs inválidos",
            description: `Os seguintes IDs de serviços não existem: ${missing.join(', ')}`,
            variant: "destructive",
          });
          return;
        }
        }
      }

      const url = editingPlan
        ? `/api/admin/subscription-plans/${editingPlan.id}`
        : "/api/admin/subscription-plans";

      const method = editingPlan ? "PUT" : "POST";

      // Converter includedServiceIds para string JSON (sempre enviar um JSON array)
      const includedServiceIdsString = JSON.stringify(includedServiceIds);

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.price,
        includedServiceIds: includedServiceIdsString, // Enviar como string JSON (ex: "[]" ou "[1,2]")
        active: formData.active ?? true,
      };

      console.log("Saving subscription plan", payload, url, method);
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "Erro ao salvar plano";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (parseError) {
          const text = await response.text();
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Sucesso",
        description: editingPlan
          ? "Plano atualizado com sucesso"
          : "Plano criado com sucesso",
      });

      handleCloseDialog();
      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (planId: number) => {
    if (!confirm("Tem certeza que deseja deletar este plano?")) return;

    try {
      const response = await fetch(`/api/admin/subscription-plans/${planId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao deletar plano");

      toast({
        title: "Sucesso",
        description: "Plano deletado com sucesso",
      });

      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="p-4">Carregando planos...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Planos de Assinatura</h2>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      <div className="grid gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="p-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  {plan.active ? (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Ativo
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      Inativo
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-2">{plan.description}</p>
                <p className="text-sm text-gray-500">
                  Preço: <strong>R$ {plan.price.toFixed(2)}/mês</strong>
                </p>
                {(() => {
                  const includedIds = parseIncludedServiceIds(plan.includedServiceIds as string | null | undefined);
                  if (includedIds.length === 0) return null;
                  // Map ids to price item names when available
                  const idToName = new Map<number, string>();
                  priceItems.forEach((s) => {
                    if (s?.id != null && s?.name) idToName.set(s.id, s.name);
                  });

                  return (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Serviços Inclusos:</p>
                      <div className="flex flex-wrap gap-2">
                        {includedIds.map((serviceId) => {
                          const name = idToName.get(serviceId);
                          return (
                            <Badge key={serviceId} variant="secondary">
                              {name ? name : `Serviço #${serviceId}`}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDialog(plan)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(plan.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {plans.length === 0 && (
          <Card className="p-6 text-center text-gray-500">
            Nenhum plano criado ainda
          </Card>
        )}
      </div>

      {/* Dialog de Edição/Criação */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Editar Plano" : "Novo Plano"}
            </DialogTitle>
            <DialogDescription>
              Preencha os detalhes do plano de assinatura
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Plano Premium"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Ex: Acesso a todos os serviços"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Preço Mensal (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.price || ""}
                onChange={(e) =>
                  setFormData({ ...formData, price: parseFloat(e.target.value) })
                }
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Serviços Inclusos (opcional)</label>

              {/* Selected badges */}
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {(() => {
                  if (selectedIds.length === 0) return <span className="text-xs text-gray-500">Nenhum serviço selecionado</span>;
                  const idToName = new Map<number, string>();
                  priceItems.forEach((s) => {
                    if (s?.id != null && s?.name) idToName.set(s.id, s.name);
                  });
                  return selectedIds.map((id) => (
                    <Badge key={id} variant="secondary">{idToName.get(id) ?? `Serviço #${id}`}</Badge>
                  ));
                })()}
              </div>

              {/* Checkbox list */}
              <div className="max-h-40 overflow-auto border rounded p-2">
                {priceItems.length === 0 ? (
                  <div className="text-sm text-gray-500">Nenhum serviço disponível</div>
                ) : (
                  priceItems.map((s) => {
                    const checked = selectedIds.includes(s.id);
                    return (
                      <label key={s.id} className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            let next: number[];
                            if (e.target.checked) {
                              next = Array.from(new Set([...selectedIds, s.id]));
                            } else {
                              next = selectedIds.filter((id) => id !== s.id);
                            }
                            setSelectedIds(next);
                            setFormData({ ...formData, includedServiceIds: JSON.stringify(next) });
                          }}
                        />
                        <span className="text-sm">{s.name ?? `Serviço #${s.id}`}</span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Deixe nenhum selecionado se o plano não incluir serviços específicos</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.active || false}
                onChange={(e) =>
                  setFormData({ ...formData, active: e.target.checked })
                }
              />
              <label className="text-sm">Ativo</label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
