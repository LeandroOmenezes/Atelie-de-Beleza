import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Settings, 
  BarChart3, 
  Upload, 
  Menu,
  X,
  ChevronRight,
  Layout,
  FileText,
  DollarSign,
  Layers,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const DASHBOARD_ITEMS = [
  {
    href: "/dashboard",
    icon: BarChart3,
    label: "Dashboard",
    description: "Agendamentos, vendas e relatórios"
  },
];

const MASTER_ITEMS = [
  {
    href: "/admin/services",
    icon: Upload,
    label: "Gerenciar Serviços",
    description: "Criar, editar e remover serviços"
  },
  {
    href: "/admin/banner",
    icon: Layout,
    label: "Banner Principal",
    description: "Personalizar página inicial"
  },
  {
    href: "/admin/footer",
    icon: FileText,
    label: "Rodapé",
    description: "Configurar informações de contato"
  },
  {
    href: "/admin/prices",
    icon: DollarSign,
    label: "Tabela de Preços",
    description: "Gerenciar preços dos serviços"
  },
  {
    href: "/admin/categories",
    icon: Layers,
    label: "Categorias",
    description: "Gerenciar categorias de serviços"
  },
  {
    href: "/admin/site-config",
    icon: Palette,
    label: "Configuração do Site",
    description: "Personalizar nome, logo e cores"
  },
];

export default function AdminMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  const menuItems = user?.isMaster
    ? [...DASHBOARD_ITEMS, ...MASTER_ITEMS]
    : DASHBOARD_ITEMS;

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div className="relative">
      {/* Menu Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleMenu}
        className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
      >
        {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        <span className="hidden sm:inline">Admin</span>
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu Panel */}
      <div className={`
        fixed top-0 right-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex-shrink-0 bg-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Painel Admin</h2>
              <p className="text-blue-100 text-xs">
                {user?.isMaster ? "Acesso Master — controle total" : "Acesso Admin — dashboard operacional"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Menu Items - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Dashboard section */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">Operacional</p>
          {DASHBOARD_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  block p-3 rounded-lg border transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'hover:bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                </div>
              </Link>
            );
          })}

          {/* Master-only section */}
          {user?.isMaster && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mt-4 mb-1">Configurações Master</p>
              {MASTER_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      block p-3 rounded-lg border transition-all duration-200
                      ${isActive 
                        ? 'bg-purple-50 border-purple-200 text-purple-700' 
                        : 'hover:bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${isActive ? 'bg-purple-100' : 'bg-gray-100'}`}>
                        <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.label}</div>
                        <div className="text-xs text-gray-500">{item.description}</div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t bg-gray-50">
          <div className="text-center text-xs text-gray-500">
            <Settings className="w-3 h-3 inline mr-1" />
            {user?.isMaster ? "Painel Master" : "Painel de Administração"}
          </div>
        </div>
      </div>
    </div>
  );
}
