import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import PriceManagement from "@/components/admin/price-management";

export default function PriceManagementPage() {
  const { user, isLoading } = useAuth();

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
      <div className="container mx-auto px-4 py-8">
        <PriceManagement />
      </div>
    </div>
  );
}