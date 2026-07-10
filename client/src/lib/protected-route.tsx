import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

// Rota protegida para qualquer usuário autenticado
export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element | null;
}) {
  const { user, isLoading } = useAuth();

  // Estamos usando uma função de componente personalizada
  const ProtectedComponent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      );
    }

    if (!user) {
      return <Redirect to="/auth" />;
    }

    return <Component />;
  };

  return <Route path={path} component={ProtectedComponent} />;
}

// Rota protegida apenas para usuários administradores
export function AdminProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element | null;
}) {
  const { user, isLoading } = useAuth();

  const AdminProtectedComponent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      );
    }

    if (!user) {
      return <Redirect to="/auth" />;
    }

    if (!user.isAdmin) {
      return <Redirect to="/" />;
    }

    return <Component />;
  };

  return <Route path={path} component={AdminProtectedComponent} />;
}