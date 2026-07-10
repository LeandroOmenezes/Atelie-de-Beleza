import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthPage() {
  const [showRegister, setShowRegister] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Verificar parâmetros de URL para mensagens de erro
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    
    if (error) {
      let errorMsg = decodeURIComponent(error);
      
      // Personalizar mensagem para erro específico do Google OAuth
      if (error.includes('google') || error.includes('redirect_uri')) {
        errorMsg = "Problema com autenticação Google. Clique aqui para ver como resolver.";
      }
      
      setErrorMessage(errorMsg);
      // Limpar URL para não mostrar erro após refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  return (
    <div className="font-sans bg-gray-100 text-gray-800 min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section id="login" className="py-16 bg-gray-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Área do Cliente</h2>
              <p className="text-gray-700 max-w-2xl mx-auto">Acesse sua conta para gerenciar agendamentos e ver seu histórico de serviços.</p>
            </div>
            
            <div className="max-w-md mx-auto">
              {errorMessage && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>
                    {errorMessage}
                    {errorMessage.includes('Google') && (
                      <div className="mt-2">
                        <button
                          onClick={() => navigate('/oauth-diagnostics')}
                          className="text-blue-600 hover:text-blue-800 underline text-sm"
                        >
                          Ver instruções para corrigir Google OAuth
                        </button>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className={`${showRegister ? 'hidden' : 'block'}`}>
                <div className="bg-white p-8 rounded-lg shadow-md">
                  <LoginForm onToggleForm={() => setShowRegister(true)} />
                </div>
              </div>
              
              <div className={`${showRegister ? 'block' : 'hidden'}`}>
                <div className="bg-white p-8 rounded-lg shadow-md">
                  <RegisterForm onToggleForm={() => setShowRegister(false)} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
