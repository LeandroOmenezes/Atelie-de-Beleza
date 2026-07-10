import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banner, insertBannerSchema, type InsertBanner } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
import { Camera, Upload, X, Save, Image as ImageIcon, ExternalLink, Eye } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function BannerManagement() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: banner, isLoading } = useQuery<Banner>({
    queryKey: ['/api/banner'],
  });

  const form = useForm<InsertBanner>({
    resolver: zodResolver(insertBannerSchema),
    defaultValues: {
      title: banner?.title || "",
      subtitle: banner?.subtitle || "",
      ctaText: banner?.ctaText || "",
      ctaLink: banner?.ctaLink || "",
    },
  });

  // Update form when banner data is loaded
  useEffect(() => {
    if (banner) {
      form.reset({
        title: banner.title,
        subtitle: banner.subtitle,
        ctaText: banner.ctaText,
        ctaLink: banner.ctaLink,
      });
    }
  }, [banner, form]);

  const updateBannerMutation = useMutation({
    mutationFn: async (data: InsertBanner) => {
      const response = await fetch('/api/banner', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar banner');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Configurações do banner atualizadas com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/banner'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na atualização",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/banner/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao fazer upload da imagem');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso!",
        description: "Imagem de fundo atualizada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/banner'] });
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (publicUrl: string) => {
      const res = await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Erro ao deletar imagem');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Imagem removida', description: 'Imagem do banner removida com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['/api/banner'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione apenas arquivos de imagem",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleImageUpload = () => {
    if (selectedFile) {
      uploadImageMutation.mutate(selectedFile);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const onSubmit = (data: InsertBanner) => {
    updateBannerMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando configurações do banner...</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuração do Banner</h2>
            <p className="text-gray-600">
              Personalize o banner principal da página inicial com textos e imagem de fundo.
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

      {/* Current Banner Preview */}
      {banner && (
        <div className="bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Preview Atual
          </h3>
          <div 
            className="relative min-h-48 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white overflow-hidden"
            style={(() => {
              const img = banner.backgroundImageDataBase64
                ? `data:${banner.backgroundImageMimeType || 'image/jpeg'};base64,${banner.backgroundImageDataBase64}`
                : banner.backgroundImage;
              return img ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {};
            })()}
          >
            <div className="text-center z-10">
              <h1 className="text-2xl md:text-4xl font-bold mb-4">{banner.title}</h1>
              <p className="text-lg md:text-xl mb-6 max-w-2xl">{banner.subtitle}</p>
              <button className="bg-white text-blue-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors">
                {banner.ctaText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Text Configuration Form */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Configuração de Textos</h3>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título Principal</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Bem-vindo ao Nosso Salão de Beleza" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subtitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtítulo</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva o que torna seu salão especial..."
                      rows={3}
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
                name="ctaText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto do Botão</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Agendar Horário" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ctaLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link do Botão</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: #appointments" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                type="submit" 
                disabled={updateBannerMutation.isPending}
                className="flex-1 sm:flex-none"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateBannerMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
              
              <Button asChild className="flex items-center justify-center gap-2 flex-1 sm:flex-none">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Visualizar</span>
                </a>
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Background Image Upload */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Imagem de Fundo
        </h3>

        {/* Current Background Image */}
        {banner?.backgroundImage && !previewUrl && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Imagem atual:</p>
            <img
              src={banner.backgroundImage}
              alt="Banner background"
              className="w-full max-w-md h-32 object-cover rounded-md border"
            />
          </div>
        )}

        {/* Preview */}
        {previewUrl && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Nova imagem:</p>
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full max-w-md h-32 object-cover rounded-md border"
            />
          </div>
        )}

        {/* File Input */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                className="cursor-pointer"
                asChild
              >
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Escolher Imagem de Fundo
                </span>
              </Button>
            </label>
            {banner?.backgroundImage && banner.backgroundImage.startsWith('http') && (
              <Button
                variant="destructive"
                onClick={() => setBannerToDelete(banner.backgroundImage as string)}
                disabled={deleteImageMutation.isPending}
              >
                Excluir Imagem do Banner
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          {selectedFile && (
            <div className="flex gap-2">
              <Button
                onClick={handleImageUpload}
                disabled={uploadImageMutation.isPending}
              >
                {uploadImageMutation.isPending ? "Enviando..." : "Enviar"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={uploadImageMutation.isPending}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Formatos aceitos: JPEG, PNG, WebP. Tamanho máximo: 5MB. 
            Recomendamos imagens com pelo menos 1200x400 pixels.
          </p>
        </div>
      </div>

      {/* Delete Confirmation Dialog for Banner Image */}
      <AlertDialog open={bannerToDelete !== null} onOpenChange={(open) => { if (!open) setBannerToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir imagem do banner</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a imagem do banner? Esta ação remove o arquivo do bucket e limpa a referência no banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteImageMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteImageMutation.isPending}
              onClick={() => {
                if (!bannerToDelete) return;
                deleteImageMutation.mutate(bannerToDelete);
                setBannerToDelete(null);
              }}
            >
              {deleteImageMutation.isPending ? "Removendo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}