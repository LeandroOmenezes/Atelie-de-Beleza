import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import SiteConfigManagement from "@/components/admin/site-config-management";

export default function SiteConfigPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!user || !user.isAdmin) {
    return <Redirect to="/auth" />;
  }

  return <SiteConfigManagement />;
}