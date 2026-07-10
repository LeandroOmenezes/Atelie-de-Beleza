import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Category, Service, PriceItem, insertCategorySchema, type InsertCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Eye, 
  ExternalLink, 
  Layers, 
  Edit, 
  AlertTriangle,
  FileText,
  Wrench
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

export default function CategoryManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ['/api/services/all'],
  });

  const { data: priceItems, isLoading: priceItemsLoading } = useQuery<PriceItem[]>({
    queryKey: ['/api/prices'],
  });

  const form = useForm<InsertCategory>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      icon: "fas fa-spa",
    },
  });

  const editForm = useForm<InsertCategory>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      icon: "fas fa-spa",
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (data: InsertCategory) => {
      const response = await apiRequest('POST', '/api/admin/categories', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Categoria adicionada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/featured'] });
      queryClient.invalidateQueries({ queryKey: ['/api/prices'] });
      // Força refetch imediato em todas as queries de categorias
      queryClient.refetchQueries({ queryKey: ['/api/categories'] });
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

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCategory> }) => {
      const response = await apiRequest('PUT', `/api/admin/categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Categoria atualizada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/featured'] });
      queryClient.invalidateQueries({ queryKey: ['/api/prices'] });
      // Força refetch imediato em todas as queries de categorias
      queryClient.refetchQueries({ queryKey: ['/api/categories'] });
      setEditingId(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/categories/${id}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/featured'] });
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

  const onAddSubmit = (data: InsertCategory) => {
    addCategoryMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertCategory) => {
    if (editingId) {
      updateCategoryMutation.mutate({ id: editingId, data });
    }
  };

  const handleDeleteCategory = (category: Category) => {
    const relatedServices = services?.filter(s => s.categoryId === category.id) || [];
    const relatedPrices = priceItems?.filter(p => p.categoryId === category.id) || [];
    const totalItems = relatedServices.length + relatedPrices.length;

    const confirmMessage = totalItems > 0 
      ? `Tem certeza que deseja remover a categoria "${category.name}"?\n\nIsto também removerá:\n• ${relatedServices.length} serviços\n• ${relatedPrices.length} itens de preço\n\nEsta ação não pode ser desfeita.`
      : `Tem certeza que deseja remover a categoria "${category.name}"? Esta ação não pode ser desfeita.`;

    if (confirm(confirmMessage)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    editForm.reset({
      name: category.name,
      icon: category.icon,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    editForm.reset();
  };

  const getRelatedCounts = (categoryId: number) => {
    const serviceCount = services?.filter(s => s.categoryId === categoryId).length || 0;
    const priceCount = priceItems?.filter(p => p.categoryId === categoryId).length || 0;
    return { serviceCount, priceCount };
  };

  if (categoriesLoading || servicesLoading || priceItemsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando categorias...</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Gerenciamento de Categorias</h2>
            <p className="text-gray-600">
              Gerencie as categorias de serviços do salão. Adicione novas categorias, edite existentes ou remova categorias inteiras quando não oferecer mais esse tipo de serviço.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild className="flex items-center gap-2">
              <a href="/" target="_blank" rel="noopener noreferrer">
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
              Adicionar Categoria
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
              Adicionar Nova Categoria
            </CardTitle>
            <CardDescription>
              Crie uma nova categoria para organizar os serviços do salão
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
                        <FormLabel>Nome da Categoria</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Tratamentos Faciais" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ícone (FontAwesome)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="fas fa-spa"
                            {...field} 
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
                    disabled={addCategoryMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {addCategoryMutation.isPending ? "Salvando..." : "Salvar"}
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

      {/* Categories List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories?.map((category) => {
          const { serviceCount, priceCount } = getRelatedCounts(category.id);
          const isEditing = editingId === category.id;

          return (
            <Card key={category.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <i className={`${category.icon} text-2xl text-blue-500`}></i>
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {serviceCount + priceCount} itens relacionados
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {isEditing ? (
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                      <FormField
                        control={editForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
                        name="icon"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ícone</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2">
                        <Button 
                          type="submit" 
                          size="sm"
                          disabled={updateCategoryMutation.isPending}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Salvar
                        </Button>
                        <Button 
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={cancelEdit}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-gray-500" />
                        <Badge variant="secondary" className="text-xs">
                          {serviceCount} serviços
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <Badge variant="secondary" className="text-xs">
                          {priceCount} preços
                        </Badge>
                      </div>
                    </div>

                    {(serviceCount > 0 || priceCount > 0) && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-xs text-amber-800">
                          Remover esta categoria também remove todos os itens relacionados
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(category)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCategory(category)}
                        disabled={deleteCategoryMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!categories || categories.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nenhuma categoria encontrada.</p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeira Categoria
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}