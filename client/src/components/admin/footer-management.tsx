import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Footer, insertFooterSchema, type InsertFooter } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, ExternalLink, MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import { maskPhone } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function FooterManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: footer, isLoading } = useQuery<Footer>({
    queryKey: ['/api/footer'],
  });

  const form = useForm<InsertFooter>({
    resolver: zodResolver(insertFooterSchema),
    defaultValues: {
      businessName: "",
      address: "",
      phone: "",
      email: "",
      whatsapp: "",
      workingHours: "",
      facebookUrl: "",
      instagramUrl: "",
      tiktokUrl: "",
      youtubeUrl: "",
    },
  });

  // Update form when footer data is loaded
  useEffect(() => {
    if (footer) {
      form.reset({
        businessName: footer.businessName,
        address: footer.address,
        phone: footer.phone,
        email: footer.email,
        whatsapp: footer.whatsapp,
        workingHours: footer.workingHours,
        facebookUrl: footer.facebookUrl || "",
        instagramUrl: footer.instagramUrl || "",
        tiktokUrl: footer.tiktokUrl || "",
        youtubeUrl: footer.youtubeUrl || "",
      });
    }
  }, [footer, form]);

  const updateFooterMutation = useMutation({
    mutationFn: async (data: InsertFooter) => {
      const response = await apiRequest('PUT', '/api/footer', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Configurações do rodapé atualizadas com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/footer'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na atualização",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertFooter) => {
    updateFooterMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando configurações do rodapé...</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuração do Rodapé</h2>
            <p className="text-gray-600">
              Personalize as informações de contato, endereço, horários e redes sociais do rodapé.
            </p>
          </div>
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
        </div>
      </div>

      {/* Current Footer Preview */}
      {footer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview do Rodapé
            </CardTitle>
            <CardDescription>Como o rodapé aparecerá na página</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-white p-6 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Business Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">{footer.businessName}</h3>
                  <div className="space-y-2 text-gray-300">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                      <span className="text-sm">{footer.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{footer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{footer.email}</span>
                    </div>
                  </div>
                </div>

                {/* Working Hours */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Horário de Funcionamento
                  </h3>
                  <p className="text-gray-300 text-sm">{footer.workingHours}</p>
                </div>

                {/* Social Media */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Redes Sociais</h3>
                  <div className="flex gap-3">
                    {footer.facebookUrl && (
                      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-xs font-bold">f</span>
                      </div>
                    )}
                    {footer.instagramUrl && (
                      <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded flex items-center justify-center">
                        <span className="text-xs font-bold">@</span>
                      </div>
                    )}
                    {footer.tiktokUrl && (
                      <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                        <span className="text-xs font-bold">T</span>
                      </div>
                    )}
                    {footer.youtubeUrl && (
                      <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                        <span className="text-xs font-bold">Y</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Rodapé</CardTitle>
          <CardDescription>
            Atualize as informações que aparecerão no rodapé do site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Business Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Informações do Negócio</h3>
                
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Negócio</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Salão de Beleza Premium" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço Completo</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Rua, número, bairro, cidade, estado, CEP"
                          rows={2}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="(11) 3456-7890" 
                            {...field}
                            onChange={(e) => field.onChange(maskPhone(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email de Contato</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="contato@salao.com.br" 
                            type="email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp (apenas números)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="11964027914" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workingHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horário de Funcionamento</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Seg-Sex: 9h-18h | Sáb: 8h-17h" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Social Media */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Redes Sociais</h3>
                <p className="text-sm text-gray-600">Deixe em branco os campos das redes sociais que não deseja exibir</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="facebookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook (URL completa)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://facebook.com/seusalao" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instagramUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram (URL completa)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://instagram.com/seusalao" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tiktokUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TikTok (URL completa)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://tiktok.com/@seusalao" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="youtubeUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>YouTube (URL completa)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://youtube.com/@seusalao" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button 
                  type="submit" 
                  disabled={updateFooterMutation.isPending}
                  className="flex-1 sm:flex-none"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateFooterMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
                
                <Button asChild className="flex-1 sm:flex-none">
                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Visualizar</span>
                  </a>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}