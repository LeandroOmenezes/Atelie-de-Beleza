import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PriceItem, Category, insertPriceItemSchema, type InsertPriceItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Save, X, Eye, ExternalLink, DollarSign } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

export default function PriceManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: priceItems, isLoading: pricesLoading } = useQuery<PriceItem[]>({
    queryKey: ['/api/prices'],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    refetchOnWindowFocus: true,
  });

  const form = useForm<InsertPriceItem>({
    resolver: zodResolver(insertPriceItemSchema),
    defaultValues: {
      name: "",
      minPrice: 0,
      maxPrice: 0,
      categoryId: 1,
    },
  });

  const addPriceMutation = useMutation({
    mutationFn: async (data: InsertPriceItem) => {
      const response = await apiRequest('POST', '/api/admin/prices', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Item de preço adicionado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/prices'] });
      setShowAddForm(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertPriceItem> }) => {
      const response = await apiRequest('PUT', `/api/admin/prices/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Item de preço atualizado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/prices'] });
      setEditingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePriceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/prices/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Item de preço removido com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/prices'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onAddSubmit = (data: InsertPriceItem) => {
    addPriceMutation.mutate(data);
  };

  const handleEdit = (item: PriceItem) => {
    setEditingId(item.id);
  };

  const handleSaveEdit = (item: PriceItem, updatedData: Partial<InsertPriceItem>) => {
    updatePriceMutation.mutate({ id: item.id, data: updatedData });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este item de preço?")) {
      deletePriceMutation.mutate(id);
    }
  };

  const getCategoryName = (categoryId: number) => {
    return categories?.find(cat => cat.id === categoryId)?.name || "Categoria não encontrada";
  };

  const formatPrice = (price: number) => {
    return `R$${price.toFixed(2)}`;
  };

  const getPricesByCategory = () => {
    if (!priceItems || !categories) return [];
    
    return categories.map(category => ({
      category,
      items: priceItems.filter(item => item.categoryId === category.id)
    })).filter(group => group.items.length > 0);
  };

  if (pricesLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando tabela de preços...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Gerenciamento de Preços</h2>
            <p className="text-gray-600">
              Gerencie a tabela de preços dos serviços do salão.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild className="flex items-center gap-2">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Eye className="w-4 h-4" />
                <span>Ver na Home</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Preço
            </Button>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Adicionar Novo Item de Preço
            </CardTitle>
            <CardDescription>
              Preencha os dados do novo serviço e preço
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Serviço</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Corte Feminino" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
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
                    name="minPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Mínimo (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="50.00"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? 0 : parseFloat(value) || 0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Máximo (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="80.00"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? 0 : parseFloat(value) || 0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={addPriceMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {addPriceMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Price Tables by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {getPricesByCategory().map(({ category, items }) => (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className={`${category.icon} text-blue-500`}></i>
                {category.name}
              </CardTitle>
              <CardDescription>
                {items.length} {items.length === 1 ? 'serviço' : 'serviços'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <PriceItemRow
                    key={item.id}
                    item={item}
                    isEditing={editingId === item.id}
                    categories={categories || []}
                    onEdit={handleEdit}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingId(null)}
                    onDelete={handleDelete}
                    updateMutation={updatePriceMutation}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!priceItems || priceItems.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nenhum item de preço encontrado.</p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Item
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PriceItemRow({ 
  item, 
  isEditing, 
  categories, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete,
  updateMutation 
}: {
  item: PriceItem;
  isEditing: boolean;
  categories: Category[];
  onEdit: (item: PriceItem) => void;
  onSave: (item: PriceItem, data: Partial<InsertPriceItem>) => void;
  onCancel: () => void;
  onDelete: (id: number) => void;
  updateMutation: any;
}) {
  const [editData, setEditData] = useState({
    name: item.name,
    minPrice: item.minPrice.toString(),
    maxPrice: item.maxPrice.toString(),
    categoryId: item.categoryId,
  });

  const handleSave = () => {
    const dataToSave = {
      name: editData.name,
      minPrice: parseFloat(editData.minPrice) || 0,
      maxPrice: parseFloat(editData.maxPrice) || 0,
      categoryId: editData.categoryId,
    };
    onSave(item, dataToSave);
  };

  const formatPrice = (price: number) => {
    return `R$${price.toFixed(2)}`;
  };

  const formatPriceRange = (min: number, max: number) => {
    return min === max ? formatPrice(min) : `${formatPrice(min)}-${formatPrice(max)}`;
  };

  if (isEditing) {
    return (
      <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
        <Input
          value={editData.name}
          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
          placeholder="Nome do serviço"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={editData.minPrice}
            onChange={(e) => setEditData({ ...editData, minPrice: e.target.value })}
            placeholder="Preço mín."
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            value={editData.maxPrice}
            onChange={(e) => setEditData({ ...editData, maxPrice: e.target.value })}
            placeholder="Preço máx."
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="w-3 h-3 mr-1" />
            Salvar
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="w-3 h-3 mr-1" />
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center border-b pb-2">
      <div>
        <span className="text-gray-700 font-medium">{item.name}</span>
        <div className="text-sm text-gray-500">
          {formatPriceRange(item.minPrice, item.maxPrice)}
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(item)}
        >
          <Edit className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(item.id)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}