import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import FooterManagement from "@/components/admin/footer-management";
import AdminMenu from "@/components/ui/admin-menu";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function FooterManagementPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar ao Dashboard</span>
            </Button>
            <div className="h-5 w-px bg-gray-300" />
            <span className="text-sm font-medium text-gray-700">Configuração do Rodapé</span>
          </div>
          <AdminMenu />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <FooterManagement />
      </div>
    </div>
  );
}
