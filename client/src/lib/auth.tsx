import React, { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { apiRequest, queryClient } from "./queryClient";
import { useToast } from "../hooks/use-toast";

// Using type import to avoid module resolution issues
import type { User } from "@shared/schema";

interface RegisterData {
  username: string;
  password: string;
  name: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  isLoading: false,
});

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    async function checkAuth() {
      try {
        const res = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        
      } finally {
        setIsLoading(false);
      }
    }
    
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await apiRequest("POST", "/api/login", { username, password });
      const userData = await res.json();
      setUser(userData);
      
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo(a) de volta, ${userData.name || username}!`,
      });
      
      return userData;
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const res = await apiRequest("POST", "/api/register", data);
      const userData = await res.json();
      setUser(userData);
      
      toast({
        title: "Cadastro realizado com sucesso",
        description: `Bem-vindo(a), ${userData.name || data.username}!`,
      });
      
      return userData;
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Verifique seus dados e tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      setUser(null);
      
      // Invalidate all queries
      queryClient.invalidateQueries();
      
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message || "Ocorreu um erro ao tentar sair.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const contextValue: AuthContextType = { 
    user, 
    login, 
    register, 
    logout, 
    isLoading 
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}