import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { type User, type InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
  forgotPasswordMutation: UseMutationResult<{ message: string; resetLink?: string; emailFailed?: boolean }, Error, { email: string }>;
  resetPasswordMutation: UseMutationResult<{ message: string }, Error, { token: string; password: string }>;
  verifyResetTokenMutation: UseMutationResult<{ valid: boolean }, Error, { token: string }>;
};

type LoginData = Pick<InsertUser, "username" | "password"> & { rememberMe?: boolean };

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo(a) de volta, ${user.name || user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: error.message || "Email ou senha inválidos",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registro realizado com sucesso",
        description: `Bem-vindo(a), ${user.name || user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no registro",
        description: error.message || "Não foi possível criar sua conta",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado da sua conta",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para solicitar a recuperação de senha
  const forgotPasswordMutation = useMutation<
    { message: string; resetLink?: string; emailFailed?: boolean },
    Error,
    { email: string }
  >({
    mutationFn: async ({ email }: { email: string }) => {
      const res = await apiRequest("POST", "/api/forgot-password", { email });
      const data = await res.json() as { resetLink?: string; message?: string };
      return {
        message: data.message || "Link de recuperação enviado",
        resetLink: data.resetLink,
      };
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar link",
        description: "Não foi possível gerar o link de recuperação. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutação para verificar se um token de recuperação é válido
  const verifyResetTokenMutation = useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      const res = await apiRequest("GET", `/api/reset-password/${token}`);
      return await res.json();
    },
    onError: () => {
      toast({
        title: "Token inválido",
        description: "O link de recuperação é inválido ou expirou",
        variant: "destructive",
      });
    },
  });

  // Mutação para redefinir a senha com um token válido
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const res = await apiRequest("POST", `/api/reset-password/${token}`, { password });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Senha redefinida com sucesso",
        description: "Sua senha foi alterada. Você já pode fazer login com a nova senha.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message || "Não foi possível redefinir sua senha",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        forgotPasswordMutation,
        resetPasswordMutation,
        verifyResetTokenMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}