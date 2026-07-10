import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import SalesForm from "@/components/sales/sales-form";
import SalesHistory from "@/components/sales/sales-history";
import FinancialReport from "@/components/sales/financial-report";
import AppointmentsManagement from "@/components/appointments/appointments-management";
import ScheduleBlocksManagement from "@/components/appointments/schedule-blocks-management";
import UsersManagement from "@/components/admin/users-management";
import ClientList from "@/components/clients/client-list";
import { SubscriptionPlansManagement } from "@/components/admin/subscription-plans-management";
import { useAuth } from "@/hooks/use-auth";
import { CalendarCheck, CalendarX, TrendingUp, Users, LayoutDashboard, UserCheck, UserRound, BarChart2, Zap } from "lucide-react";
import ProfessionalsManagement from "@/components/admin/professionals-management";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "agendamentos",
    label: "Agendamentos",
    icon: CalendarCheck,
    description: "Visualize e gerencie todos os agendamentos dos clientes.",
  },
  {
    id: "profissionais",
    label: "Profissionais",
    icon: UserCheck,
    description: "Cadastre profissionais por categoria para que os clientes possam escolher seu favorito.",
  },
  {
    id: "bloqueios",
    label: "Bloqueios de Agenda",
    icon: CalendarX,
    description: "Bloqueie períodos para férias, atestados médicos e feriados.",
  },
  {
    id: "vendas",
    label: "Gestão de Vendas",
    icon: TrendingUp,
    description: "Registre vendas e acompanhe o desempenho financeiro.",
  },
  {
    id: "relatorio",
    label: "Relatório Financeiro",
    icon: BarChart2,
    description: "Visualize receitas por período, forma de pagamento e serviço. Exporte ou imprima o relatório.",
  },
  {
    id: "planos",
    label: "Planos de Assinatura",
    icon: Zap,
    description: "Crie e gerencie planos de assinatura recorrente para seus clientes.",
  },
  {
    id: "clientes",
    label: "Clientes",
    icon: UserRound,
    description: "Visualize e gerencie os clientes cadastrados no sistema.",
  },
  {
    id: "usuarios",
    label: "Usuários do Sistema",
    icon: Users,
    description: "Gerencie usuários administradores e suas permissões de acesso.",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const visibleTabs = TABS.filter(t => t.id !== "usuarios" || user?.isMaster || user?.isAdmin);

  const [activeTab, setActiveTab] = useState(() => {
    const urlTab = new URLSearchParams(window.location.search).get("tab");
    if (urlTab && TABS.find(t => t.id === urlTab)) return urlTab;
    return sessionStorage.getItem("dashboard_tab") || "agendamentos";
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    sessionStorage.setItem("dashboard_tab", tab);
  };

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  if (!user) return null;

  const current = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="font-sans bg-gray-100 text-gray-800 min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <div className="bg-white border-b shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-7 h-7 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
                <p className="text-sm text-gray-500">Gerencie agendamentos, vendas e configurações do negócio.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Sidebar Navigation */}
            <aside className="lg:w-56 shrink-0">
              <nav className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-left transition-colors border-l-4",
                        isActive
                          ? "border-l-primary bg-primary/5 text-primary"
                          : "border-l-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-gray-400")} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl border shadow-sm p-6">
                {/* Section Header */}
                <div className="mb-6 pb-5 border-b">
                  <div className="flex items-center gap-2 mb-1">
                    {(() => { const Icon = current.icon; return <Icon className="w-5 h-5 text-primary" />; })()}
                    <h2 className="text-xl font-bold text-gray-900">{current.label}</h2>
                  </div>
                  <p className="text-sm text-gray-500">{current.description}</p>
                </div>

                {/* Tab Content */}
                {activeTab === "agendamentos" && <AppointmentsManagement />}

                {activeTab === "profissionais" && <ProfessionalsManagement />}

                {activeTab === "bloqueios" && <ScheduleBlocksManagement />}

                {activeTab === "vendas" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      <div className="bg-gray-50 rounded-lg border p-5">
                        <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <i className="fas fa-cash-register text-blue-500"></i>
                          Registrar Venda
                        </h3>
                        <SalesForm />
                      </div>
                    </div>
                    <div className="lg:col-span-2">
                      <SalesHistory />
                    </div>
                  </div>
                )}

                {activeTab === "relatorio" && <FinancialReport />}

                {activeTab === "planos" && <SubscriptionPlansManagement />}

                {activeTab === "clientes" && <ClientList />}

                {activeTab === "usuarios" && <UsersManagement />}
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
