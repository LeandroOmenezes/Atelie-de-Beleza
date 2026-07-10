import { useState, useEffect, FormEvent, useCallback } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";

const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: "A senha deve ter no mínimo 6 caracteres" }),
  confirmPassword: z.string().min(6, { message: "A senha deve ter no mínimo 6 caracteres" })
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"]
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { verifyResetTokenMutation, resetPasswordMutation } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/reset-password/:token");
  const token = params?.token || "";
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });

  const verifyToken = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`/api/reset-password/${token}`);
      const data = await response.json();
      setIsTokenValid(data.valid);
      
      if (!data.valid) {
        setTimeout(() => {
          navigate("/auth");
        }, 3000);
      }
    } catch (error) {
      setIsTokenValid(false);
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    }
  }, [token, navigate]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  function onSubmit(data: ResetPasswordValues) {
    resetPasswordMutation.mutate({ 
      token, 
      password: data.password 
    }, {
      onSuccess: () => {
        setTimeout(() => {
          navigate("/auth");
        }, 3000);
      }
    });
  }

  if (isTokenValid === null) {
    return (
      <div className="font-sans bg-gray-100 text-gray-800 min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Verificando token de recuperação...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isTokenValid === false) {
    return (
      <div className="font-sans bg-gray-100 text-gray-800 min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-md">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Link inválido ou expirado</h1>
            <p className="text-gray-600 mb-6">O link de recuperação de senha que você usou é inválido ou expirou.</p>
            <p className="text-gray-600 mb-6">Você será redirecionado para a página de login em alguns segundos.</p>
            <Link href="/auth" className="text-blue-500 hover:text-blue-600 underline">
              Voltar para o login
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="font-sans bg-gray-100 text-gray-800 min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Redefinir Senha</h1>
            
            {resetPasswordMutation.isSuccess ? (
              <div className="text-center">
                <div className="text-green-500 text-5xl mb-4">✓</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Senha redefinida com sucesso!</h2>
                <p className="text-gray-600 mb-6">Sua senha foi alterada. Você será redirecionado para a página de login em alguns segundos.</p>
                <Link href="/auth" className="text-blue-500 hover:text-blue-600 underline">
                  Voltar para o login
                </Link>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-gray-700 font-medium mb-2">Nova Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                              {...field} 
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-gray-700 font-medium mb-2">Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showConfirmPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                              {...field} 
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full bg-blue-500 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition-colors duration-200 font-medium"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? "Processando..." : "Redefinir Senha"}
                  </Button>
                </form>
              </Form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}