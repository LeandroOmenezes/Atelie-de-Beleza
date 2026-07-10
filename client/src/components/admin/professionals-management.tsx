import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertProfessionalSchema, type Professional, type Category, type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Edit, Save, X, Camera, UserCheck, UserX, Users, Timer, Link2, UtensilsCrossed } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const INTERVAL_OPTIONS = [
  { value: 20,  label: "20 min" },
  { value: 30,  label: "30 min" },
  { value: 40,  label: "40 min" },
  { value: 45,  label: "45 min" },
  { value: 60,  label: "1 hora" },
  { value: 90,  label: "1h 30min" },
  { value: 120, label: "2 horas" },
];

const formSchema = insertProfessionalSchema.extend({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  categoryId: z.union([z.string(), z.number()]).transform(val => Number(val)),
  appointmentInterval: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  userId: z.union([z.string(), z.number()]).transform(val => val === "" || val === null || val === undefined ? null : Number(val)).nullable().optional(),
  lunchBreakStart: z.string().nullable().optional(),
  lunchBreakEnd: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProfessionalsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const { data: professionals = [], isLoading } = useQuery<Professional[]>({
    queryKey: ["/api/professionals"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", categoryId: 1, bio: "", active: true, appointmentInterval: 40, lunchBreakStart: null, lunchBreakEnd: null },
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", categoryId: 1, bio: "", active: true, appointmentInterval: 40, lunchBreakStart: null, lunchBreakEnd: null },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => apiRequest("POST", "/api/admin/professionals", data),
    onSuccess: () => {
      toast({ title: "Profissional cadastrado com sucesso!" });
      invalidate();
      setShowForm(false);
      form.reset();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormValues }) =>
      apiRequest("PUT", `/api/admin/professionals/${id}`, data),
    onSuccess: () => {
      toast({ title: "Profissional atualizado com sucesso!" });
      invalidate();
      setEditingId(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/professionals/${id}`),
    onSuccess: () => {
      toast({ title: "Profissional removido com sucesso!" });
      invalidate();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiRequest("PATCH", `/api/admin/professionals/${id}/active`, { active }),
    onSuccess: () => { invalidate(); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/professionals/${id}/upload-photo`, {
        method: "POST", body: formData,
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Erro no upload"); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Foto enviada com sucesso!" });
      invalidate();
      setUploadingId(null);
    },
    onError: (e: any) => {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
      setUploadingId(null);
    },
  });

  const handlePhotoUpload = (id: number, file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "Foto muito grande", description: "Máximo 3MB", variant: "destructive" });
      return;
    }
    setUploadingId(id);
    uploadPhotoMutation.mutate({ id, file });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este profissional?")) deleteMutation.mutate(id);
  };

  const handleEdit = (p: Professional) => {
    setEditingId(p.id);
    editForm.reset({ name: p.name, categoryId: p.categoryId, bio: p.bio ?? "", active: p.active, appointmentInterval: p.appointmentInterval ?? 40, userId: p.userId ?? null, lunchBreakStart: p.lunchBreakStart ?? null, lunchBreakEnd: p.lunchBreakEnd ?? null });
  };

  const getCategoryName = (id: number) => categories.find(c => c.id === id)?.name ?? "—";

  const filtered = (tab: string) =>
    tab === "all" ? professionals : professionals.filter(p => p.categoryId.toString() === tab);

  const ProfessionalCard = ({ p }: { p: Professional }) => (
    <Card className={`relative ${!p.active ? "opacity-60" : ""}`}>
      <CardContent className="pt-5">
        <div className="flex items-start gap-4">
          {/* Photo */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
              {p.photoBase64 ? (
                <img
                  src={p.photoBase64.startsWith('http') ? p.photoBase64 : `data:${p.photoMimeType};base64,${p.photoBase64}`}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-7 h-7 text-gray-400" />
              )}
            </div>
            <button
              onClick={() => editPhotoInputRefs.current[p.id]?.click()}
              className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1 shadow hover:bg-primary/90 transition"
              title="Alterar foto"
            >
              <Camera className="w-3 h-3" />
            </button>
            <input
              type="file" accept="image/*" className="hidden"
              ref={el => { editPhotoInputRefs.current[p.id] = el; }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(p.id, f); }}
            />
          </div>

          {/* Info or edit form */}
          {editingId === p.id ? (
            <div className="flex-1">
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(d => updateMutation.mutate({ id: p.id, data: d }))} className="space-y-3">
                  <FormField control={editForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormControl><Input placeholder="Nome do profissional" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="categoryId" render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={val => field.onChange(Number(val))} value={field.value?.toString()}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="bio" render={({ field }) => (
                    <FormItem>
                      <FormControl><Textarea placeholder="Especialidade / bio..." rows={2} {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="appointmentInterval" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-xs text-gray-600">
                        <Timer className="w-3 h-3" />Intervalo entre atendimentos
                      </FormLabel>
                      <Select onValueChange={val => field.onChange(Number(val))} value={field.value?.toString()}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {INTERVAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value.toString()}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="userId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-xs text-gray-600">
                        <Link2 className="w-3 h-3" />Login vinculado
                      </FormLabel>
                      <Select
                        onValueChange={val => field.onChange(val === "none" ? null : Number(val))}
                        value={field.value != null ? field.value.toString() : "none"}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">— Nenhum —</SelectItem>
                          {users.filter(u => !u.isAdmin).map(u => (
                            <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.username})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div>
                    <FormLabel className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                      <UtensilsCrossed className="w-3 h-3" />Horário de almoço (opcional)
                    </FormLabel>
                    <div className="flex items-center gap-2">
                      <FormField control={editForm.control} name="lunchBreakStart" render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input type="time" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value || null)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <span className="text-xs text-gray-400">até</span>
                      <FormField control={editForm.control} name="lunchBreakEnd" render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input type="time" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value || null)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <button type="button" className="text-xs text-gray-400 hover:text-red-500 transition" onClick={() => { editForm.setValue("lunchBreakStart", null); editForm.setValue("lunchBreakEnd", null); }}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                      <Save className="w-3 h-3 mr-1" />Salvar
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="w-3 h-3 mr-1" />Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">{p.name}</span>
                <Badge variant="secondary" className="text-xs">{getCategoryName(p.categoryId)}</Badge>
                <Badge variant="outline" className="text-xs flex items-center gap-1 text-blue-700 border-blue-200">
                  <Timer className="w-3 h-3" />
                  {INTERVAL_OPTIONS.find(o => o.value === (p.appointmentInterval ?? 40))?.label ?? `${p.appointmentInterval ?? 40} min`}
                </Badge>
                {!p.active && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
                {uploadingId === p.id && <span className="text-xs text-gray-400 animate-pulse">Enviando foto...</span>}
              </div>
              {p.bio && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.bio}</p>}
              {p.lunchBreakStart && p.lunchBreakEnd && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <UtensilsCrossed className="w-3 h-3" />Almoço: {p.lunchBreakStart}–{p.lunchBreakEnd}
                </p>
              )}
              <div className="flex gap-2 mt-3 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => handleEdit(p)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Edit className="w-3 h-3 mr-1" />Editar
                </Button>
                <Button size="sm" variant="outline"
                  onClick={() => toggleActiveMutation.mutate({ id: p.id, active: !p.active })}
                  className={p.active ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"}>
                  {p.active ? <><UserX className="w-3 h-3 mr-1" />Desativar</> : <><UserCheck className="w-3 h-3 mr-1" />Ativar</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(p.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-3 h-3 mr-1" />Remover
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Cadastre os profissionais por categoria. Os clientes poderão escolher seu profissional favorito ao agendar.
          </p>
        </div>
        <Button onClick={() => { setShowForm(v => !v); form.reset(); }} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancelar" : "Novo Profissional"}
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Cadastrar Novo Profissional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl><Input placeholder="Ex: Ana Paula" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria de Serviço</FormLabel>
                      <Select onValueChange={val => field.onChange(Number(val))} value={field.value?.toString()}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidade / Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Especialista em coloração e mechas..." rows={2} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="appointmentInterval" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Timer className="w-4 h-4" />Intervalo entre atendimentos
                    </FormLabel>
                    <Select onValueChange={val => field.onChange(Number(val))} value={field.value?.toString() ?? "40"}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {INTERVAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value.toString()}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Tempo reservado entre um atendimento e o próximo.</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="userId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Link2 className="w-4 h-4" />Login do profissional (opcional)
                    </FormLabel>
                    <Select
                      onValueChange={val => field.onChange(val === "none" ? null : Number(val))}
                      value={field.value != null ? field.value.toString() : "none"}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">— Nenhum —</SelectItem>
                        {users.filter(u => !u.isAdmin).map(u => (
                          <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.username})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Vincula uma conta de cliente para que o profissional veja seus agendamentos.</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <div>
                  <FormLabel className="flex items-center gap-1">
                    <UtensilsCrossed className="w-4 h-4" />Horário de almoço (opcional)
                  </FormLabel>
                  <div className="flex items-center gap-2 mt-1">
                    <FormField control={form.control} name="lunchBreakStart" render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input type="time" placeholder="12:00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <span className="text-sm text-gray-400">até</span>
                    <FormField control={form.control} name="lunchBreakEnd" render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input type="time" placeholder="13:00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Horários nesse intervalo não aparecem para agendamento.</p>
                </div>

                {/* Photo upload for new professional */}
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*" className="hidden" ref={photoInputRef}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const reader = new FileReader();
                      reader.onload = ev => {
                        const base64 = (ev.target?.result as string).split(",")[1];
                        form.setValue("photoBase64", base64);
                        form.setValue("photoMimeType", f.type);
                      };
                      reader.readAsDataURL(f);
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" />
                    {form.watch("photoBase64") ? "Foto selecionada ✓" : "Adicionar Foto"}
                  </Button>
                  {form.watch("photoBase64") && (
                    <span className="text-xs text-green-600">Foto pronta para upload</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {createMutation.isPending ? "Salvando..." : "Cadastrar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); form.reset(); }}>
                    <X className="w-4 h-4 mr-2" />Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Tabs por categoria */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setEditingId(null); }}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="all" className="rounded">
              Todos
              <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0 h-5">{professionals.length}</Badge>
            </TabsTrigger>
            {categories.map(cat => {
              const count = professionals.filter(p => p.categoryId === cat.id).length;
              return (
                <TabsTrigger key={cat.id} value={cat.id.toString()} className="rounded">
                  {cat.name}
                  <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0 h-5">{count}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {["all", ...categories.map(c => c.id.toString())].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-5">
              {filtered(tab).length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum profissional cadastrado{tab !== "all" ? " nesta categoria" : ""}.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filtered(tab).map(p => <ProfessionalCard key={p.id} p={p} />)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
