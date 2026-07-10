import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import ServiceCard from "@/components/services/service-card";
import AppointmentForm from "@/components/appointments/appointment-form";
import ReviewCard from "@/components/reviews/review-card";
import ReviewForm from "@/components/reviews/review-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Service, Review, Category, PriceItem, Banner, SiteConfig } from "@shared/schema";

function Hero() {
  const { data: banner } = useQuery<Banner>({
    queryKey: ['/api/banner'],
  });

  // Use banner data if available, otherwise fallback to defaults
  const title = banner?.title || "Beleza e bem-estar em um só lugar";
  const subtitle = banner?.subtitle || "Transforme sua aparência e eleve sua autoestima com nossos serviços profissionais de beleza.";
  const ctaText = banner?.ctaText || "Agendar Agora";
  const ctaLink = banner?.ctaLink || "#appointments";
  // Use base64 data if present; otherwise use a stored URL.
  const backgroundImage = banner?.backgroundImageDataBase64
    ? `data:${banner.backgroundImageMimeType || 'image/jpeg'};base64,${banner.backgroundImageDataBase64}`
    : banner?.backgroundImage || null;

  return (
    <section id="hero" className="relative h-[500px] md:h-[600px] overflow-hidden">
      {/* Background Image or Gradient */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={backgroundImage ? {
          backgroundImage: `url('${backgroundImage}')`,
          backgroundSize: 'cover'
        } : {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      />
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-40 z-10"></div>
      
      {/* Content */}
      <div className="container relative z-20 h-full mx-auto px-4 flex flex-col justify-center items-center text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-lg">
          {title}
        </h1>
        <p className="text-white text-lg md:text-xl mb-8 max-w-2xl mx-auto drop-shadow-md">
          {subtitle}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a 
            href={ctaLink} 
            className="bg-blue-500 text-white px-8 py-4 rounded-xl hover:bg-blue-600 transition-colors duration-200 font-medium text-lg shadow-lg hover:shadow-xl"
          >
            {ctaText}
          </a>
          <a 
            href="#services" 
            className="bg-white text-blue-500 border border-blue-500 px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors duration-200 font-medium text-lg shadow-lg hover:shadow-xl"
          >
            Nossos Serviços
          </a>
        </div>
      </div>
    </section>
  );
}

function Services() {
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ['/api/services/all'],
  });

  return (
    <section id="services" className="py-16 bg-gray-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Nossos Serviços</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">Oferecemos uma variedade de serviços para realçar sua beleza natural e proporcionar uma experiência relaxante.</p>
        </div>
        
        {isLoading ? (
          <div className="text-center">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services?.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
        
        <div className="mt-12 text-center">
          <a href="#prices" className="inline-flex items-center text-blue-500 hover:text-blue-700 font-medium">
            Ver todos os serviços e preços <i className="fas fa-chevron-down ml-2"></i>
          </a>
        </div>
      </div>
    </section>
  );
}

function PriceList() {
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: priceItems } = useQuery<PriceItem[]>({
    queryKey: ['/api/prices'],
  });

  const getCategoryIcon = (categoryId: number) => {
    const category = categories?.find(cat => cat.id === categoryId);
    return category?.icon || "fas fa-scissors";
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories?.find(cat => cat.id === categoryId);
    return category?.name || "";
  };

  const getPriceItemsByCategory = (categoryId: number) => {
    return priceItems?.filter(item => item.categoryId === categoryId) || [];
  };

  return (
    <section id="prices" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Tabela de Preços</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">Confira nossa lista completa de serviços e preços transparentes.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {categories?.map((category) => {
            const categoryPriceItems = getPriceItemsByCategory(category.id);
            
            return (
              <div key={category.id} className="bg-gray-100 rounded-lg p-6 shadow-md">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <i className={`${category.icon} mr-3 text-blue-500`}></i> {category.name}
                </h3>
                <ul className="space-y-4">
                  {categoryPriceItems.length > 0 ? (
                    categoryPriceItems.map((item) => (
                      <li key={item.id} className="flex justify-between items-center border-b pb-2">
                        <span className="text-gray-700">{item.name}</span>
                        <span className="font-medium">
                          {item.maxPrice > item.minPrice 
                            ? `R$${item.minPrice.toFixed(2)}-${item.maxPrice.toFixed(2)}`
                            : `R$${item.minPrice.toFixed(2)}`
                          }
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 italic">Nenhum preço cadastrado nesta categoria</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
        
        <div className="mt-10 text-center">
          <a href="#appointments" className="bg-blue-500 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition-colors duration-200 inline-block font-medium">
            Agendar um Serviço
          </a>
        </div>
      </div>
    </section>
  );
}

function Appointments() {
  const { user } = useAuth();
  const { data: config } = useQuery<SiteConfig>({
    queryKey: ['/api/site-config'],
  });

  const appointmentBgValue = config?.appointmentBackgroundImageBase64?.toString().trim();
  const appointmentBgMimeType = config?.appointmentBackgroundImageMimeType?.toString().trim() || 'image/png';

  const backgroundImageUrl = appointmentBgValue
    ? appointmentBgValue.startsWith('http')
      ? `url(${appointmentBgValue})`
      : `url(data:${appointmentBgMimeType};base64,${appointmentBgValue})`
    : "url('/images/client-area-bg.svg')";

  return (
    <section id="appointments" className="py-16 relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: backgroundImageUrl,
          backgroundSize: 'cover',
        }}
      />
      {/* Dark overlay to ensure text readability regardless of background image */}
      <div className="absolute inset-0 z-0 bg-black/55" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">Agende seu Horário</h2>
          <p className="text-white/90 max-w-2xl mx-auto drop-shadow-md">Escolha o serviço e horário de sua preferência e venha cuidar da sua beleza conosco.</p>
        </div>
        
        {user ? (
          <AppointmentForm />
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg mx-auto text-center">
            <div className="mb-6">
              <i className="fas fa-user-lock text-5xl text-blue-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Login Necessário</h3>
              <p className="text-gray-600">Para agendar um horário, você precisa estar logado em nossa plataforma.</p>
            </div>
            
            <div className="space-y-4">
              <Link href="/auth">
                <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 text-lg">
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Fazer Login para Agendar
                </Button>
              </Link>
              
              <p className="text-sm text-gray-500">
                Não tem conta? No login você também pode se cadastrar rapidamente!
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Reviews() {
  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: ['/api/reviews'],
  });
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Determine quais avaliações mostrar
  const displayedReviews = showAllReviews ? reviews : reviews?.slice(0, 3);

  return (
    <section id="reviews" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">O que Nossos Clientes Dizem</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">Confira as experiências e opiniões de quem já utilizou nossos serviços.</p>
        </div>
        
        {/* Formulário de Avaliação */}
        <div className="max-w-lg mx-auto mb-12">
          <ReviewForm />
        </div>
        
        {isLoading ? (
          <div className="text-center">Carregando...</div>
        ) : reviews && reviews.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {displayedReviews?.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
            
            {reviews.length > 3 && (
              <div className="mt-10 text-center">
                <Button 
                  variant="link" 
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="text-blue-500 hover:text-blue-700 font-medium"
                >
                  {showAllReviews ? "Mostrar menos" : "Ver mais avaliações"} 
                  <i className={`fas fa-chevron-${showAllReviews ? 'up' : 'right'} ml-2`}></i>
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Ainda não temos avaliações. Seja o primeiro a avaliar!
          </div>
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="font-sans bg-gray-100 text-gray-800 min-h-screen flex flex-col">
      <Header />
      <main>
        <Hero />
        <Services />
        <PriceList />
        <Appointments />
        <Reviews />
      </main>
      <Footer />
    </div>
  );
}
