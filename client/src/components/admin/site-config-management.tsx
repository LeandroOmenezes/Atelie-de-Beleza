import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Eye, Settings, Palette, FileText, Image, QrCode } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insertSiteConfigSchema, type SiteConfig } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const siteConfigFormSchema = insertSiteConfigSchema.extend({
  siteName: z.string().min(1, "Nome do site é obrigatório"),
  siteSlogan: z.string().default(""),
  primaryColor: z.string()
    .refine(
      (val) => val === "" || /^#[0-9A-Fa-f]{6}$/.test(val),
      "Cor deve estar no formato #RRGGBB"
    )
    .default("#3b82f6"),
  logoUrl: z.string().nullable().default(null)
});

export default function SiteConfigManagement() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Buscar configuração atual do site
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["/api/site-config"],
    queryFn: async () => {
      const response = await fetch("/api/site-config");
      if (!response.ok) throw new Error("Erro ao buscar configuração do site");
      return response.json() as Promise<SiteConfig>;
    }
  });

  const form = useForm<z.infer<typeof siteConfigFormSchema>>({
    resolver: zodResolver(siteConfigFormSchema),
    defaultValues: {
      siteName: config?.siteName || "",
      siteSlogan: config?.siteSlogan || "",
      primaryColor: config?.primaryColor || "#3b82f6",
      logoUrl: config?.logoUrl || ""
    }
  });

  // Atualizar valores padrão quando os dados chegarem
  React.useEffect(() => {
    if (config) {
      form.reset({
        siteName: config.siteName || "",
        siteSlogan: config.siteSlogan || "",
        primaryColor: config.primaryColor || "#3b82f6",
        logoUrl: config.logoUrl || "",
        pixKey: config.pixKey || "",
        pixBeneficiaryName: config.pixBeneficiaryName || "",
        pixCity: config.pixCity || "",
      });
    }
  }, [config, form]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: z.infer<typeof siteConfigFormSchema>) => {
      const response = await apiRequest("PUT", "/api/site-config", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config"] });
      toast({
        title: "Configuração atualizada",
        description: "As configurações do site foram atualizadas com sucesso!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar configuração",
        description: error.message || "Ocorreu um erro ao atualizar as configurações do site",
        variant: "destructive"
      });
    }
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("logo", file);
      
      const response = await fetch("/api/site-config/upload-logo", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao fazer upload da logo");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setUploadedLogoUrl(data.logoUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/site-config"] });
      toast({
        title: "Logo atualizada",
        description: "A logo do site foi atualizada com sucesso!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no upload",
        description: error.message || "Erro ao fazer upload da logo",
        variant: "destructive"
      });
    }
  });

  const uploadAppointmentBgMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      
      const response = await fetch("/api/site-config/upload-appointment-background", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao fazer upload da imagem de fundo");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config"] });
      toast({
        title: "Imagem de fundo atualizada",
        description: "A imagem de fundo da seção de agendamento foi atualizada!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no upload",
        description: error.message || "Erro ao fazer upload da imagem",
        variant: "destructive"
      });
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (publicUrl: string) => {
      const res = await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Erro ao deletar arquivo');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/site-config'] });
      toast({ title: 'Removido', description: 'Arquivo removido com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message || 'Erro ao deletar arquivo', variant: 'destructive' });
    }
  });

  const [logoToDelete, setLogoToDelete] = useState<string | null>(null);
  const [appointmentBgToDelete, setAppointmentBgToDelete] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A logo deve ter no máximo 5MB",
          variant: "destructive"
        });
        return;
      }
      
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Apenas imagens são permitidas",
          variant: "destructive"
        });
        return;
      }
      
      setIsUploading(true);
      uploadLogoMutation.mutate(file);
    }
  };

  const onSubmit = (data: z.infer<typeof siteConfigFormSchema>) => {
    const safeData = {
      ...data,
      logoUrl: config?.logoUrl ?? null,
      appointmentBackgroundImageBase64: config?.appointmentBackgroundImageBase64 ?? null,
      appointmentBackgroundImageMimeType: config?.appointmentBackgroundImageMimeType ?? null,
    };
    updateConfigMutation.mutate(safeData);
  };

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Configurações do Site</h1>
          <p className="text-muted-foreground">
            Personalize o nome, logo e cores do seu site
          </p>
        </div>
        {/* Delete Confirmation Dialog for Logo */}
        <AlertDialog open={logoToDelete !== null} onOpenChange={(open) => { if (!open) setLogoToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir logo do site</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a logo do site? Esta ação remove o arquivo do bucket e limpará a referência no banco de dados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteFileMutation.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteFileMutation.isPending}
                onClick={() => {
                  if (!logoToDelete) return;
                  deleteFileMutation.mutate(logoToDelete);
                  setLogoToDelete(null);
                }}
              >
                {deleteFileMutation.isPending ? 'Removendo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog for Appointment Background */}
        <AlertDialog open={appointmentBgToDelete !== null} onOpenChange={(open) => { if (!open) setAppointmentBgToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir imagem de agendamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a imagem de fundo da seção de agendamento? Esta ação remove o arquivo do bucket e limpará a referência no banco de dados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteFileMutation.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteFileMutation.isPending}
                onClick={() => {
                  if (!appointmentBgToDelete) return;
                  deleteFileMutation.mutate(appointmentBgToDelete);
                  setAppointmentBgToDelete(null);
                }}
              >
                {deleteFileMutation.isPending ? 'Removendo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="grid gap-6">
          {/* Configuração Geral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração Geral
              </CardTitle>
              <CardDescription>
                Configure o nome e slogan do seu site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="siteName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Site</FormLabel>
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
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cor Principal</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input 
                                type="color"
                                className="w-20 h-10"
                                {...field}
                              />
                              <Input 
                                placeholder="#3b82f6"
                                className="flex-1"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="siteSlogan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slogan do Site</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Ex: Transformando sua beleza com carinho e qualidade"
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4">
                    <Button 
                      type="submit" 
                      disabled={updateConfigMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {updateConfigMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Settings className="h-4 w-4" />
                      )}
                      Salvar Configurações
                    </Button>
                    
                    <Link href="/">
                      <Button variant="outline" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Ver na Home
                      </Button>
                    </Link>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Upload de Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Logo do Site
              </CardTitle>
              <CardDescription>
                Faça upload da logo do seu site (máximo 5MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Logo atual */}
                {(config?.logoUrl || uploadedLogoUrl) && (
                  <div className="space-y-2">
                    <Label>Logo Atual</Label>
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <img 
                        src={uploadedLogoUrl || config?.logoUrl || ""} 
                        alt="Logo atual"
                        className="w-16 h-16 object-contain"
                      />
                      <div>
                        <p className="text-sm font-medium">Logo personalizada</p>
                        <p className="text-xs text-muted-foreground">
                          Última atualização: {new Date(config?.updatedAt || "").toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload de nova logo */}
                <div className="space-y-2">
                  <Label>Fazer Upload de Nova Logo</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || uploadLogoMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {isUploading || uploadLogoMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Escolher Arquivo
                    </Button>
                    { (config?.logoUrl || uploadedLogoUrl) && ( (uploadedLogoUrl || config?.logoUrl || '').startsWith('http') ) && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          const url = uploadedLogoUrl || config?.logoUrl || '';
                          if (!url) return;
                          setLogoToDelete(url);
                        }}
                        disabled={deleteFileMutation.isPending}
                      >Excluir</Button>
                    )}
                    <span className="text-sm text-muted-foreground">
                      PNG, JPG, WebP até 5MB
                    </span>
                  </div>
                </div>

                {/* Upload de imagem de fundo da seção de agendamento */}
                <div className="space-y-2 border-t pt-4">
                  <Label>Imagem de Fundo - Seção "Agende seu Horário"</Label>
                  <p className="text-xs text-muted-foreground">Personalize a seção de agendamento com uma imagem de fundo bonita!</p>
                  {config?.appointmentBackgroundImageBase64 && (
                    <div className="mt-3 space-y-2">
                      <div className="rounded-lg overflow-hidden border">
                        <img 
                          src={config.appointmentBackgroundImageBase64.startsWith('http')
                            ? config.appointmentBackgroundImageBase64
                            : `data:${config.appointmentBackgroundImageMimeType || 'image/png'};base64,${config.appointmentBackgroundImageBase64}`}
                          alt="Imagem de fundo de agendamento"
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <input
                      type="file"
                      id="appointmentBgInput"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast({
                              title: "Arquivo muito grande",
                              description: "Máximo 5MB. Tente um arquivo menor.",
                              variant: "destructive"
                            });
                            return;
                          }
                          uploadAppointmentBgMutation.mutate(file);
                        }
                      }}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      onClick={() => document.getElementById('appointmentBgInput')?.click()}
                      disabled={uploadAppointmentBgMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {uploadAppointmentBgMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Image className="h-4 w-4" />
                      )}
                      Escolher Imagem
                    </Button>
                    {config && config.appointmentBackgroundImageBase64 && config.appointmentBackgroundImageBase64.startsWith('http') && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setAppointmentBgToDelete(config.appointmentBackgroundImageBase64 as string);
                        }}
                        disabled={deleteFileMutation.isPending}
                      >Excluir</Button>
                    )}
                    <span className="text-sm text-muted-foreground">
                      PNG, JPG, WebP até 5MB
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuração PIX */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Configuração PIX
              </CardTitle>
              <CardDescription>
                Configure sua chave PIX para receber pagamentos. O QR Code será gerado automaticamente no registro de vendas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="pixKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chave PIX</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Ex: 11999887766 ou email@dominio.com</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="pixBeneficiaryName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Beneficiário</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Ana Paula Silva"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Até 25 caracteres (aparece no QR Code)</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pixCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: São Paulo"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={updateConfigMutation.isPending} className="flex items-center gap-2">
                    {updateConfigMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    Salvar Dados PIX
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Preview das Configurações */}
          {config && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview das Configurações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4 mb-2">
                      {config.logoUrl && (
                        <img 
                          src={config.logoUrl} 
                          alt="Logo"
                          className="w-10 h-10 object-contain"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold" style={{ color: config.primaryColor || '#3b82f6' }}>
                          {config.siteName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {config.siteSlogan}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      Nome: {config.siteName}
                    </Badge>
                    <Badge variant="secondary">
                      Cor: {config.primaryColor}
                    </Badge>
                    {config.logoUrl && (
                      <Badge variant="secondary">
                        Logo: Personalizada
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}