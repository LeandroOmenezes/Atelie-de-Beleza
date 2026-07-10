import { Link } from "wouter";
import { MapPin, Phone, Clock, Mail, MessageCircle, Facebook, Instagram, Music, Youtube, ArrowUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Footer as FooterType } from "@shared/schema";
import { useSiteConfig } from "@/hooks/use-site-config";

export default function Footer() {
  const { data: footerData } = useQuery<FooterType>({
    queryKey: ['/api/footer'],
  });
  const { data: siteConfig } = useSiteConfig();

  // Fallback data in case footer config is not available
  const footer = footerData || {
    businessName: "Salão de Beleza Premium",
    address: "Rua das Flores, 123 - Centro, São Paulo - SP",
    phone: "(11) 3456-7890",
    email: "contato@salaopremium.com.br",
    whatsapp: "11964027914",
    workingHours: "Segunda a Sexta: 9h às 18h | Sábado: 8h às 17h",
    facebookUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
    youtubeUrl: "",
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent("Olá! Gostaria de agendar um horário.");
    window.open(`https://wa.me/55${footer.whatsapp}?text=${message}`, '_blank');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const socialLinks: Array<{ url: string; icon: any; label: string; color: string }> = [
    { url: footer.facebookUrl, icon: Facebook, label: "Facebook", color: "hover:text-blue-500" },
    { url: footer.instagramUrl, icon: Instagram, label: "Instagram", color: "hover:text-pink-500" },
    { url: footer.tiktokUrl, icon: Music, label: "TikTok", color: "hover:text-white" },
    { url: footer.youtubeUrl, icon: Youtube, label: "YouTube", color: "hover:text-red-500" },
  ].filter((link): link is { url: string; icon: any; label: string; color: string } => !!link.url);

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Business Information */}
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              {siteConfig?.logoUrl ? (
                <img 
                  src={siteConfig.logoUrl} 
                  alt={siteConfig.siteName} 
                  className="h-12 w-12 min-w-[48px] mr-3 object-contain"
                />
              ) : (
                <i className="fas fa-cut mr-3 text-blue-500 text-2xl"></i>
              )}
              {footer.businessName || siteConfig?.siteName}
            </h3>
            <p className="text-gray-400 mb-4">
              {siteConfig?.siteSlogan || "Transformando sua beleza com cuidado, estilo e profissionalismo."}
            </p>
            
            {/* Social Media Links */}
            {socialLinks.length > 0 && (
              <div className="flex space-x-4">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-gray-400 ${social.color} transition-colors duration-200`}
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            )}
          </div>
          
          {/* Navigation */}
          <div>
            <h3 className="text-lg font-bold mb-4">Navegação</h3>
            <ul className="space-y-2">
              <li><a href="#services" className="text-gray-400 hover:text-white transition-colors">Serviços</a></li>
              <li><a href="#prices" className="text-gray-400 hover:text-white transition-colors">Preços</a></li>
              <li><a href="#appointments" className="text-gray-400 hover:text-white transition-colors">Agendamentos</a></li>
              <li><a href="#reviews" className="text-gray-400 hover:text-white transition-colors">Avaliações</a></li>
            </ul>
          </div>
          
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Phone className="w-5 h-5 mr-2" />
              Contato
            </h3>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start">
                <MapPin className="w-4 h-4 mt-1 mr-2 flex-shrink-0 text-blue-500" />
                <span className="text-sm">{footer.address}</span>
              </li>
              <li className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-blue-500" />
                <a href={`tel:${footer.phone}`} className="text-sm hover:text-white transition-colors">
                  {footer.phone}
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-blue-500" />
                <a href={`mailto:${footer.email}`} className="text-sm hover:text-white transition-colors">
                  {footer.email}
                </a>
              </li>
              <li className="flex items-center">
                <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                <button
                  onClick={openWhatsApp}
                  className="text-sm hover:text-white transition-colors"
                >
                  WhatsApp
                </button>
              </li>
            </ul>
          </div>
          
          {/* Working Hours */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Horário de Funcionamento
            </h3>
            <div className="text-gray-400">
              <p className="text-sm leading-relaxed">{footer.workingHours}</p>
            </div>
          </div>
        </div>
        
        {/* Footer Bottom */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <p className="text-sm">
                Desenvolvido por{' '}
                <a
                  href="https://github.com/LeandroOmenezes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 font-medium hover:text-blue-300 transition-colors"
                >
                  Leandro Menezes
                </a>
              </p>
              <p className="text-xs text-gray-500">
                Desenvolvedor Full Stack | React • Node.js • TypeScript | © 2026 Todos os direitos reservados
              </p>
            </div>
            <button
              onClick={scrollToTop}
              className="text-gray-400 hover:text-white transition-colors duration-200 hover:scale-110 transform"
              aria-label="Voltar ao topo"
            >
              <ArrowUp className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}