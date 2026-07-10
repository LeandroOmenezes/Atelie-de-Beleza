import { Service } from "@shared/schema";

interface ServiceCardProps {
  service: Service;
}

// SVG Icons para cada tipo de serviço
const ServiceIcons = {
  haircut: (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id="hairGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="#F8FAFC" />
      {/* Scissors */}
      <g transform="translate(100,100)">
        <ellipse cx="-30" cy="-20" rx="15" ry="8" fill="url(#hairGradient1)" transform="rotate(-25)" />
        <ellipse cx="30" cy="-20" rx="15" ry="8" fill="url(#hairGradient1)" transform="rotate(25)" />
        <rect x="-2" y="-10" width="4" height="20" fill="url(#hairGradient1)" />
        <circle cx="-25" cy="-15" r="8" fill="none" stroke="url(#hairGradient1)" strokeWidth="2" />
        <circle cx="25" cy="-15" r="8" fill="none" stroke="url(#hairGradient1)" strokeWidth="2" />
        {/* Hair strands */}
        <path d="M-40,-40 Q-35,-50 -30,-40" stroke="#94A3B8" strokeWidth="2" fill="none" />
        <path d="M40,-40 Q45,-50 40,-40" stroke="#94A3B8" strokeWidth="2" fill="none" />
        <path d="M0,-45 Q5,-55 10,-45" stroke="#94A3B8" strokeWidth="2" fill="none" />
      </g>
    </svg>
  ),
  manicure: (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id="nailGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#BE185D" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="#FDF2F8" />
      {/* Hand silhouette */}
      <g transform="translate(100,100)">
        {/* Palm */}
        <ellipse cx="0" cy="10" rx="25" ry="35" fill="url(#nailGradient2)" opacity="0.8" />
        {/* Fingers */}
        <ellipse cx="-20" cy="-15" rx="8" ry="20" fill="url(#nailGradient2)" opacity="0.8" />
        <ellipse cx="-7" cy="-25" rx="8" ry="25" fill="url(#nailGradient2)" opacity="0.8" />
        <ellipse cx="7" cy="-25" rx="8" ry="25" fill="url(#nailGradient2)" opacity="0.8" />
        <ellipse cx="20" cy="-15" rx="8" ry="20" fill="url(#nailGradient2)" opacity="0.8" />
        {/* Nail polish highlights */}
        <circle cx="-20" cy="-30" r="4" fill="#F472B6" />
        <circle cx="-7" cy="-45" r="4" fill="#F472B6" />
        <circle cx="7" cy="-45" r="4" fill="#F472B6" />
        <circle cx="20" cy="-30" r="4" fill="#F472B6" />
        {/* Sparkles */}
        <circle cx="-35" cy="-20" r="2" fill="#FDE047" opacity="0.8" />
        <circle cx="35" cy="-10" r="2" fill="#FDE047" opacity="0.8" />
        <circle cx="0" cy="-60" r="2" fill="#FDE047" opacity="0.8" />
      </g>
    </svg>
  ),
  skincare: (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id="skinGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="#F0FDF4" />
      {/* Face silhouette */}
      <g transform="translate(100,100)">
        <ellipse cx="0" cy="0" rx="35" ry="45" fill="url(#skinGradient3)" opacity="0.8" />
        {/* Leaf decorations */}
        <path d="M-50,-30 Q-45,-40 -40,-35 Q-45,-30 -50,-30" fill="#34D399" />
        <path d="M50,-30 Q45,-40 40,-35 Q45,-30 50,-30" fill="#34D399" />
        <path d="M0,-70 Q5,-80 10,-75 Q5,-70 0,-70" fill="#34D399" />
        {/* Spa stones */}
        <ellipse cx="-30" cy="40" rx="8" ry="6" fill="#94A3B8" opacity="0.7" />
        <ellipse cx="30" cy="40" rx="8" ry="6" fill="#94A3B8" opacity="0.7" />
        <ellipse cx="0" cy="50" rx="10" ry="7" fill="#94A3B8" opacity="0.7" />
        {/* Glow effect */}
        <circle cx="0" cy="0" r="50" fill="none" stroke="#6EE7B7" strokeWidth="2" opacity="0.4" />
      </g>
    </svg>
  )
};

function getServiceIcon(serviceName: string) {
  const name = serviceName.toLowerCase();
  if (name.includes('corte') || name.includes('cabelo')) {
    return ServiceIcons.haircut;
  } else if (name.includes('manicure') || name.includes('unhas')) {
    return ServiceIcons.manicure;
  } else if (name.includes('tratamento') || name.includes('pele')) {
    return ServiceIcons.skincare;
  }
  return ServiceIcons.haircut; // Default fallback
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const featuredClass = service.featured 
    ? "bg-white rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:shadow-xl hover:-translate-y-1 ring-2 ring-yellow-400 ring-opacity-50" 
    : "bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1";

  return (
    <div className={featuredClass}>
      {service.featured && (
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs font-bold px-3 py-1 text-center">
          ⭐ SERVIÇO EM DESTAQUE
        </div>
      )}
      <div className="w-full h-56 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
        {service.imageUrl ? (
          <img 
            src={service.imageUrl} 
            alt={service.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-32 h-32">
            {getServiceIcon(service.name)}
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{service.name}</h3>
        <p className="text-gray-700 mb-4 text-sm leading-relaxed">{service.description}</p>
        <div className="flex justify-between items-center">
          <span className="text-blue-500 font-medium">A partir de R${service.minPrice.toFixed(2)}</span>
          <a href="#appointments" className="text-blue-500 hover:text-blue-700 font-medium flex items-center transition-colors">
            Agendar 
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
