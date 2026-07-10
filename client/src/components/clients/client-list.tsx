import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Phone, Mail, Trash, Edit, UserCheck, Calendar } from "lucide-react";
import { maskPhone } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export default function ClientList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{id: number, name: string} | null>(null);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [editingClient, setEditingClient] = useState<{id: number, name: string, phone: string, email: string}>({ id: 0, name: "", phone: "", email: "" });
  const { toast } = useToast();

  // Fetch clients data
  const { data: clients = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Falha ao carregar os clientes");
      return res.json();
    },
  });

  // Add client mutation
  const addClientMutation = useMutation({
    mutationFn: async (clientData: { name: string; phone: string; email: string }) => {
      const res = await apiRequest("POST", "/api/clients", clientData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente adicionado com sucesso",
        description: "O novo cliente foi registrado no sistema",
      });
      setIsAddClientOpen(false);
      setNewClient({ name: "", phone: "", email: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit client mutation
  const editClientMutation = useMutation({
    mutationFn: async (data: {id: number, client: { name: string; phone: string; email: string }}) => {
      const res = await apiRequest("PATCH", `/api/clients/${data.id}`, data.client);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente atualizado com sucesso",
        description: "As informações do cliente foram atualizadas",
      });
      setIsEditClientOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      await apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      toast({
        title: "Cliente removido com sucesso",
        description: "O cliente foi removido permanentemente do sistema",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setClientToDelete(null);
    },
    onError: (error) => {
      setClientToDelete(null);
      toast({
        title: "Erro ao remover cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddClient = () => {
    if (!newClient.name || !newClient.phone) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e telefone são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    
    addClientMutation.mutate(newClient);
  };

  const handleEditClient = () => {
    if (!editingClient.name || !editingClient.phone) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e telefone são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    
    const { id, ...clientData } = editingClient;
    editClientMutation.mutate({ id, client: clientData });
  };

  const openEditDialog = (client: User) => {
    setEditingClient({
      id: client.id,
      name: client.name || "",
      phone: client.phone || "",
      email: client.email || client.username || "",
    });
    setIsEditClientOpen(true);
  };

  const handleDeleteClient = (clientId: number, clientName: string) => {
    setClientToDelete({ id: clientId, name: clientName });
  };

  // Filter clients based on search term
  const filteredClients = clients.filter((client) => 
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">Clientes</CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
          onClick={() => setIsAddClientOpen(true)}
        >
          <UserPlus size={16} />
          <span>Novo Cliente</span>
        </Button>
      </CardHeader>

      <CardContent>
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar clientes..."
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            {searchTerm ? "Nenhum cliente encontrado com este termo" : "Ainda não há clientes cadastrados"}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => (
              <div 
                key={client.id} 
                className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2 md:mb-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <UserCheck size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{client.name}</h3>
                    
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                      {client.phone && (
                        <div className="flex items-center gap-1">
                          <Phone size={13} />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {(client.email || client.username) && (
                        <div className="flex items-center gap-1">
                          <Mail size={13} />
                          <span>{client.email || client.username}</span>
                        </div>
                      )}
                      {client.createdAt && (
                        <div className="flex items-center gap-1 text-gray-400">
                          <Calendar size={13} />
                          <span>Cadastrado em {new Date(client.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    onClick={() => openEditDialog(client)}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    onClick={() => handleDeleteClient(client.id, client.name || 'este cliente')}
                    disabled={deleteClientMutation.isPending}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Client Dialog */}
      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente para adicionar ao sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="grid w-full items-center gap-1.5">
              <label className="text-sm font-medium">Nome *</label>
              <Input
                value={newClient.name}
                onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                placeholder="Nome completo"
              />
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <label className="text-sm font-medium">Telefone *</label>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={15}
                value={newClient.phone}
                onChange={(e) => setNewClient({...newClient, phone: maskPhone(e.target.value)})}
                placeholder="(00) 00000-0000"
              />
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={newClient.email}
                onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                placeholder="email@exemplo.com"
                type="email"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddClientOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddClient}
              disabled={addClientMutation.isPending}
            >
              {addClientMutation.isPending ? "Adicionando..." : "Adicionar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Client Dialog */}
      <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize os dados do cliente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="grid w-full items-center gap-1.5">
              <label className="text-sm font-medium">Nome *</label>
              <Input
                value={editingClient.name}
                onChange={(e) => setEditingClient({...editingClient, name: e.target.value})}
                placeholder="Nome completo"
              />
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <label className="text-sm font-medium">Telefone *</label>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={15}
                value={editingClient.phone}
                onChange={(e) => setEditingClient({...editingClient, phone: maskPhone(e.target.value)})}
                placeholder="(00) 00000-0000"
              />
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={editingClient.email}
                onChange={(e) => setEditingClient({...editingClient, email: e.target.value})}
                placeholder="email@exemplo.com"
                type="email"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditClientOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEditClient}
              disabled={editClientMutation.isPending}
            >
              {editClientMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={clientToDelete !== null} onOpenChange={(open) => { if (!open) setClientToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{clientToDelete?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteClientMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteClientMutation.isPending}
              onClick={() => clientToDelete && deleteClientMutation.mutate(clientToDelete.id)}
            >
              {deleteClientMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}