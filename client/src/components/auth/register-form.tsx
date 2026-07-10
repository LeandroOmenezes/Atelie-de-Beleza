import { z } from "zod";
import { useForm } from "react-hook-form";
import { maskPhone } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

const registerFormSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  username: z.string().min(1, { message: "Email é obrigatório" }).email({ message: "Email inválido" }),
  phone: z.string().min(10, { message: "Telefone inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
  confirmPassword: z.string().min(1, { message: "Confirmação de senha é obrigatória" }),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "As senhas não coincidem",
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

interface RegisterFormProps {
  onToggleForm: () => void;
}

export default function RegisterForm({ onToggleForm }: RegisterFormProps) {
  const { registerMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      username: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(data: RegisterFormValues) {
    registerMutation.mutate({
      username: data.username,
      password: data.password,
      name: data.name,
      phone: data.phone,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-gray-700 font-medium mb-2">Nome Completo</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Seu nome completo" 
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
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-gray-700 font-medium mb-2">Telefone (WhatsApp)</FormLabel>
              <FormControl>
                <Input 
                  type="tel" 
                  placeholder="(11) 99999-9999" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  {...field}
                  onChange={(e) => field.onChange(maskPhone(e.target.value))}
                  maxLength={15}
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
        
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-gray-700 font-medium mb-2">Confirmar Senha</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <Input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="w-full pl-9 pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
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
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? "Cadastrando..." : "Cadastrar"}
        </Button>
        
        <div className="text-center mt-4">
          <p className="text-gray-700">
            Já tem uma conta? 
            <button
              type="button"
              onClick={onToggleForm}
              className="text-blue-500 hover:text-blue-700 font-medium ml-1"
            >
              Fazer login
            </button>
          </p>
        </div>
      </form>
    </Form>
  );
}
