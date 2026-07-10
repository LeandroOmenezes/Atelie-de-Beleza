import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Camera, Upload, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ProfileImageUploadProps {
  userId: number;
  currentImageUrl?: string;
  size?: "sm" | "md" | "lg";
  showUploadButton?: boolean;
}

export function ProfileImageUpload({ 
  userId, 
  currentImageUrl, 
  size = "md", 
  showUploadButton = true 
}: ProfileImageUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-16 w-16",
    lg: "h-24 w-24"
  };

  const parseApiError = async (res: Response) => {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const errorData = await res.json().catch(() => null);
      return errorData?.error || errorData?.message || `Erro ${res.status}: ${res.statusText}`;
    }

    const text = await res.text().catch(() => null);
    if (text) {
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        return "Resposta inválida do servidor. Tente novamente mais tarde.";
      }
      return text;
    }

    return `Erro ${res.status}: ${res.statusText}`;
  };

  const parseApiResponse = async <T,>(res: Response): Promise<T> => {
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text().catch(() => null);
      if (text && (text.includes("<!DOCTYPE") || text.includes("<html"))) {
        throw new Error("Resposta inválida do servidor. Tente novamente mais tarde.");
      }
      throw new Error(`Resposta inesperada do servidor: ${res.statusText}`);
    }
    return res.json();
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);

      const res = await fetch("/api/user/upload-profile-image", {
        method: "POST",
        body: formData,
        credentials: 'include',
      });

      const data = await parseApiResponse<any>(res);
      if (!res.ok) {
        const errorMessage = (data as any)?.error || (data as any)?.message || `Erro ${res.status}: ${res.statusText}`;
        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: (data) => {
      
      toast({
        title: "Sucesso!",
        description: "Imagem de perfil atualizada com sucesso",
      });
      
      // Update user data directly in cache
      if (data.user) {
        queryClient.setQueryData(["/api/user"], data.user);
      }
      
      // Clear image caches
      queryClient.invalidateQueries({ queryKey: ["/api/images/user"] });
      
      setImagePreview(null);
      
      // Force page refresh to ensure all components update
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível fazer upload da imagem. Tente novamente.",
        variant: "destructive",
      });
      setImagePreview(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user/profile-image", {
        method: "DELETE",
        credentials: 'include',
      });

      const data = await parseApiResponse<any>(res);
      if (!res.ok) {
        const errorMessage = (data as any)?.error || (data as any)?.message || `Erro ${res.status}: ${res.statusText}`;
        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso!",
        description: "Imagem de perfil removida com sucesso",
      });
      if (data.user) {
        queryClient.setQueryData(["/api/user"], data.user);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/images/user"] });
      setImagePreview(null);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover",
        description: error.message || "Não foi possível remover a imagem de perfil.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    

    // Validação do tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione apenas arquivos de imagem (JPG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validação do tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    // Preview da imagem
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload da imagem
    
    uploadMutation.mutate(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Check if user has a profile image
  const userHasImage = user?.profileImageBase64;
  const computedUserImageUrl = userHasImage
    ? user.profileImageBase64!.startsWith("http")
      ? user.profileImageBase64
      : `data:${user.profileImageMimeType || 'image/png'};base64,${user.profileImageBase64}`
    : undefined;
  const imageUrl = imagePreview || computedUserImageUrl || currentImageUrl;
  const canUpload = user && user.id === userId;

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Imagem de perfil */}
      <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Foto de perfil"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback para ícone de usuário se a imagem falhar
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        
        {!imageUrl && (
          <User className={`${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-8 w-8' : 'h-12 w-12'} text-gray-400`} />
        )}

        {/* Ícone de carregamento */}
        {uploadMutation.isPending && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          </div>
        )}

        {/* Botão de upload sobreposto (apenas para o próprio usuário) */}
        {canUpload && showUploadButton && size !== 'sm' && (
          <button
            onClick={handleButtonClick}
            disabled={uploadMutation.isPending}
            className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100"
          >
            <Camera className="h-4 w-4 text-white" />
          </button>
        )}
      </div>

      {/* Botão de upload (para o próprio usuário) */}
      {canUpload && showUploadButton && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleButtonClick}
            disabled={uploadMutation.isPending || deleteMutation.isPending}
            className="flex items-center space-x-1"
          >
            <Upload className="h-3 w-3" />
            <span>{imageUrl ? "Trocar foto" : "Adicionar foto"}</span>
          </Button>

          {imageUrl && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={uploadMutation.isPending || deleteMutation.isPending}
              className="flex items-center space-x-1"
            >
              <span>Excluir foto</span>
            </Button>
          )}
        </div>
      )}

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
