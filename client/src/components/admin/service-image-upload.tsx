import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, X, Eye, ExternalLink } from "lucide-react";

interface ServiceImageUploadProps {
  service: Service;
}

export default function ServiceImageUpload({ service }: ServiceImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`/api/services/${service.id}/upload-image`, {
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
        description: "Imagem do serviço atualizada com sucesso",
      });
      // Invalidate queries to refetch services
      queryClient.invalidateQueries({ queryKey: ['/api/services/featured'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/all'] });
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

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center gap-2">
        <Camera className="w-5 h-5 text-blue-500" />
        <h3 className="font-medium text-gray-900">{service.name}</h3>
      </div>

      {/* Current Image */}
      {service.imageUrl && !previewUrl && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Imagem atual:</p>
          <img
            src={service.imageUrl}
            alt={service.name}
            className="w-32 h-20 object-cover rounded-md border"
          />
        </div>
      )}

      {/* Preview */}
      {previewUrl && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Nova imagem:</p>
          <img
            src={previewUrl}
            alt="Preview"
            className="w-32 h-20 object-cover rounded-md border"
          />
        </div>
      )}

      {/* File Input */}
      <div className="space-y-3">
        <label className="block">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full cursor-pointer"
            asChild
          >
            <span>
              <Upload className="w-4 h-4 mr-2" />
              Escolher Imagem
            </span>
          </Button>
        </label>

        {/* Action Buttons */}
        {selectedFile && (
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="flex-1"
            >
              {uploadMutation.isPending ? "Enviando..." : "Enviar"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={uploadMutation.isPending}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Formatos aceitos: JPEG, PNG, WebP. Tamanho máximo: 5MB
      </p>
    </div>
  );
}