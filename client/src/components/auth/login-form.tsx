import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useState, FormEvent } from "react";
import { FaGoogle } from "react-icons/fa";
import { Loader2, Eye, EyeOff, Lock } from "lucide-react";

const loginFormSchema = z.object({
  username: z.string().min(1, { message: "Email é obrigatório" }).email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginFormProps {
  onToggleForm: () => void;
}

export default function LoginForm({ onToggleForm }: LoginFormProps) {
  const { loginMutation, forgotPasswordMutation } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [showWhatsAppLogin, setShowWhatsAppLogin] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  function onSubmit(data: LoginFormValues) {
    loginMutation.mutate({
      username: data.username,
      password: data.password,
      rememberMe: data.rememberMe ?? false,
    });
  }
  
  function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    forgotPasswordMutation.mutate({ email: forgotPasswordEmail });
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-gray-700 font-medium mb-2">Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="seu.email@exemplo.com" 
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-gray-700 font-medium mb-2">Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      className="w-full pl-9 pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
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
          
          <div className="flex justify-between items-center">
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm text-gray-700 cursor-pointer">Lembrar-me</FormLabel>
                </FormItem>
              )}
            />
            <button 
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              Esqueci minha senha
            </button>
          </div>
          
          <Button
            type="submit"
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition-colors duration-200 font-medium"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Entrando..." : "Entrar"}
          </Button>
          
          {/* Botão de login com WhatsApp */}
          <Button
            type="button"
            className="w-full bg-green-500 text-white px-6 py-3 mt-3 rounded-full hover:bg-green-600 transition-colors duration-200 font-medium flex items-center justify-center"
            onClick={() => setShowWhatsAppLogin(true)}
            disabled={loginMutation.isPending}
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
            Entrar com WhatsApp
          </Button>
        </form>
      </Form>
      
      <div className="relative flex items-center justify-center">
        <hr className="w-full border-t border-gray-200"/>
        <span className="absolute bg-white px-3 text-gray-600 text-sm">ou</span>
      </div>
      
      {/* Botão de login com Google */}
      <Button
        type="button"
        variant="outline"
        className="w-full bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-full hover:bg-gray-50 transition-colors duration-200 font-medium flex justify-center items-center"
        onClick={() => {
          setIsGoogleLoading(true);
          
          
          // Redirecionar para a rota de autenticação do Google
          window.location.href = "/api/auth/google";
        }}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
            Redirecionando...
          </>
        ) : (
          <>
            <FaGoogle className="mr-2 text-red-500" /> 
            Entrar com Google
          </>
        )}
      </Button>
      
      <div className="text-center mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Novo cliente?</strong> Use o botão "Entrar com WhatsApp" para criar sua conta rapidamente. 
          Nossa equipe criará suas credenciais e você receberá acesso completo ao sistema.
        </p>
      </div>
      
      {/* Modal de login com WhatsApp */}
      {showWhatsAppLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Login com WhatsApp</h3>
            <p className="text-gray-600 mb-4">Digite seu telefone para fazer login via WhatsApp.</p>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Seu Telefone</label>
              <Input 
                type="tel" 
                placeholder="(11) 99999-9999" 
                value={whatsAppPhone}
                onChange={(e) => setWhatsAppPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWhatsAppLogin(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!whatsAppPhone) {
                    alert("Por favor, digite seu telefone");
                    return;
                  }
                  
                  // Limpar e formatar número
                  const cleanPhone = whatsAppPhone.replace(/\D/g, '');
                  const phoneNumber = "5511964027914"; // Número do salão
                  const message = `Olá! Gostaria de fazer login no sistema do salão de beleza. Meu telefone é: ${whatsAppPhone}`;
                  const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                  
                  window.open(whatsappURL, '_blank');
                  setShowWhatsAppLogin(false);
                  setWhatsAppPhone("");
                }}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Abrir WhatsApp
              </Button>
            </div>
            
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>Como funciona:</strong> Você será redirecionado para o WhatsApp do salão. 
                O atendente criará sua conta e fornecerá suas credenciais de acesso.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de recuperação de senha */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Recuperar Senha</h3>
            <p className="text-gray-600 mb-4">Digite seu email para receber um link de recuperação de senha.</p>
            
            <form onSubmit={handleForgotPassword}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Email</label>
                <Input 
                  type="email" 
                  placeholder="seu.email@exemplo.com" 
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending ? "Gerando..." : "Gerar Link"}
                </Button>
              </div>
              
              {forgotPasswordMutation.isSuccess && forgotPasswordMutation.data?.resetLink && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>🔗 Link de recuperação gerado:</strong>
                  </p>
                  <a
                    href={forgotPasswordMutation.data.resetLink}
                    className="block text-xs text-blue-700 underline break-all font-mono bg-white p-2 rounded border border-blue-200"
                  >
                    {forgotPasswordMutation.data.resetLink}
                  </a>
                  <p className="text-xs text-blue-600 mt-2">
                    Clique no link acima para redefinir a senha. Expira em 1 hora.
                  </p>
                </div>
              )}

              {forgotPasswordMutation.isSuccess && !forgotPasswordMutation.data?.resetLink && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Se o email estiver cadastrado, um link foi gerado.
                  </p>
                </div>
              )}
              
              {forgotPasswordMutation.isError && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    <strong>⚠️ Erro ao gerar o link</strong><br />
                    <span className="text-xs">Tente novamente mais tarde.</span>
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      
      <div className="text-center mt-4">
        <p className="text-gray-700">
          Ainda não tem uma conta? 
          <button
            type="button"
            onClick={onToggleForm}
            className="text-blue-500 hover:text-blue-700 font-medium ml-1"
          >
            Cadastre-se
          </button>
        </p>
      </div>
    </div>
  );
}
