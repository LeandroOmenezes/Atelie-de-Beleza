import { 
  users, categories, services, priceItems, appointments, reviews, sales,
  banner, footer, siteConfig, reviewComments, commentLikes, reviewLikes,
  passwordResetTokens, scheduleBlocks, professionals, subscriptionPlans, userSubscriptions,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Service, type InsertService,
  type PriceItem, type InsertPriceItem,
  type Appointment, type InsertAppointment,
  type Review, type InsertReview,
  type ReviewComment, type InsertReviewComment,
  type CommentLike,
  type Sale, type InsertSale,
  type Banner, type InsertBanner,
  type Footer, type InsertFooter,
  type SiteConfig, type InsertSiteConfig,
  type PasswordResetToken, type InsertPasswordResetToken,
  type ScheduleBlock, type InsertScheduleBlock,
  type Professional, type InsertProfessional,
  type SubscriptionPlan, type InsertSubscriptionPlan,
  type UserSubscription, type InsertUserSubscription
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { pool } from "./db";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  updateUserPassword(id: number, password: string): Promise<User | undefined>;
  updateUserProfileImage(id: number, imageUrl: string | null, mimeType: string | null): Promise<User | undefined>;
  deleteUserProfileImage(id: number): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Clients
  getClients(): Promise<User[]>;
  getClientById(id: number): Promise<User | undefined>;
  createClient(client: {
    name: string;
    phone: string;
    email: string;
  }): Promise<User>;
  updateClient(
    id: number,
    client: { name?: string; phone?: string; email?: string },
  ): Promise<User | undefined>;
  deleteClient(id: number): Promise<boolean>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(
    id: number,
    category: Partial<InsertCategory>,
  ): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Services
  getServices(): Promise<Service[]>;
  getFeaturedServices(): Promise<Service[]>;
  getServiceById(id: number): Promise<Service | undefined>;
  getServicesByCategory(categoryId: number): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateServiceImage(
    id: number,
    imageUrl: string,
  ): Promise<Service | undefined>;
  updateServiceImageData(
    id: number,
    imageDataBase64: string,
    mimeType: string,
  ): Promise<Service | undefined>;
  updateServiceFeatured(
    id: number,
    featured: boolean,
  ): Promise<Service | undefined>;
  updateService(
    id: number,
    service: InsertService,
  ): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;

  // Price Items
  getPriceItems(): Promise<PriceItem[]>;
  getPriceItemsByCategory(categoryId: number): Promise<PriceItem[]>;
  getPriceItemById(id: number): Promise<PriceItem | undefined>;
  createPriceItem(priceItem: InsertPriceItem): Promise<PriceItem>;
  updatePriceItem(
    id: number,
    priceItem: Partial<InsertPriceItem>,
  ): Promise<PriceItem | undefined>;
  deletePriceItem(id: number): Promise<boolean>;

  // Appointments
  getAppointments(): Promise<Appointment[]>;
  getAppointmentById(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(
    id: number,
    status: string,
  ): Promise<Appointment | undefined>;
  updateAppointmentPayment(
    id: number,
    data: { paymentStatus?: string; paymentAmount?: number; mpPaymentId?: string; holdExpiresAt?: Date; userSubscriptionId?: number }
  ): Promise<Appointment | undefined>;
  expireStaleAppointmentHolds(): Promise<void>;

  // Subscription Plans
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlanById(id: number): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: number, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: number): Promise<boolean>;

  // User Subscriptions
  createUserSubscription(subscription: InsertUserSubscription & { userId: number }): Promise<UserSubscription>;
  updateUserSubscription(id: number, data: Partial<UserSubscription>): Promise<UserSubscription | undefined>;
  getUserSubscriptionById(id: number): Promise<UserSubscription | undefined>;
  getActiveSubscriptionForUser(userId: number): Promise<UserSubscription | undefined>;
  getUserSubscriptionByPreapprovalId(preapprovalId: string): Promise<UserSubscription | undefined>;
  cancelUserSubscription(id: number): Promise<UserSubscription | undefined>;

  // Reviews
  getReviews(): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  toggleLikeReview(
    reviewId: number,
    userId: number,
    likeType: 'heart' | 'thumbs',
  ): Promise<{ review: Review; userLiked: boolean } | undefined>;
  getUserLikes(userId: number): Promise<{heartLikes: number[], thumbsLikes: number[]}>;

  // Review Comments
  getReviewComments(reviewId: number): Promise<ReviewComment[]>;
  createReviewComment(comment: InsertReviewComment & { userId: number; userName: string }): Promise<ReviewComment>;
  toggleLikeComment(
    commentId: number,
    userId: number,
    likeType: 'heart' | 'thumbs',
  ): Promise<{ comment: ReviewComment; userLiked: boolean } | undefined>;
  getUserCommentLikes(userId: number): Promise<{heartLikes: number[]; thumbsLikes: number[]}>;

  // Sales
  getSales(): Promise<Sale[]>;
  getSalesByDate(startDate: Date, endDate: Date): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  updateSale(id: number, data: Partial<InsertSale>): Promise<Sale | undefined>;
  cancelSale(id: number, reason?: string): Promise<Sale | undefined>;

  // Banner
  getBanner(): Promise<Banner | undefined>;
  updateBanner(banner: InsertBanner): Promise<Banner>;
  updateBannerImage(backgroundImage: string): Promise<Banner | undefined>;
  updateBannerImageData(imageDataBase64: string, mimeType: string): Promise<Banner | undefined>;

  // Footer
  getFooter(): Promise<Footer | undefined>;
  updateFooter(footer: InsertFooter): Promise<Footer>;

  // Site Configuration
  getSiteConfig(): Promise<SiteConfig | undefined>;
  updateSiteConfig(config: InsertSiteConfig): Promise<SiteConfig>;
  updateSiteLogo(logoUrl: string): Promise<SiteConfig | undefined>;

  // Password Reset Tokens
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(token: string): Promise<boolean>;
  cleanupExpiredTokens(): Promise<void>;

  // Schedule Blocks
  getScheduleBlocks(): Promise<ScheduleBlock[]>;
  createScheduleBlock(block: InsertScheduleBlock): Promise<ScheduleBlock>;
  deleteScheduleBlock(id: number): Promise<boolean>;
  isDateBlocked(date: string, professionalId?: number | null): Promise<{ blocked: boolean; reason?: string; description?: string }>;

  // Professionals
  getProfessionals(): Promise<Professional[]>;
  getProfessionalsByCategory(categoryId: number): Promise<Professional[]>;
  getProfessionalById(id: number): Promise<Professional | undefined>;
  getProfessionalByUserId(userId: number): Promise<Professional | undefined>;
  createProfessional(data: InsertProfessional): Promise<Professional>;
  updateProfessional(id: number, data: Partial<InsertProfessional>): Promise<Professional | undefined>;
  deleteProfessional(id: number): Promise<boolean>;
  uploadProfessionalPhoto(id: number, photoUrl: string, photoMimeType: string): Promise<Professional | undefined>;
  getAppointmentsByProfessionalId(professionalId: number): Promise<Appointment[]>;
  getUnseenCountForAdmin(): Promise<number>;
  markAppointmentsSeenByAdmin(): Promise<void>;
  getUnseenCountForProfessional(professionalId: number): Promise<number>;
  markAppointmentsSeenByProfessional(professionalId: number): Promise<void>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  sessionStore: session.Store;
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private services: Map<number, Service>;
  private priceItems: Map<number, PriceItem>;
  private appointments: Map<number, Appointment>;
  private reviews: Map<number, Review>;
  private sales: Map<number, Sale>;
  private userLikes: Map<number, Set<number>>; // userId -> Set of reviewIds they liked
  private bannerConfig: Banner | null = null;
  private footerConfig: Footer | null = null;
  private siteConfig: SiteConfig | null = null;

  private currentUserId: number;
  private currentCategoryId: number;
  private currentServiceId: number;
  private currentPriceItemId: number;
  private currentAppointmentId: number;
  private currentReviewId: number;
  private currentSaleId: number;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    this.users = new Map();
    this.categories = new Map();
    this.services = new Map();
    this.priceItems = new Map();
    this.appointments = new Map();
    this.reviews = new Map();
    this.sales = new Map();
    this.userLikes = new Map();

    this.currentUserId = 1;
    this.currentCategoryId = 1;
    this.currentServiceId = 1;
    this.currentPriceItemId = 1;
    this.currentAppointmentId = 1;
    this.currentReviewId = 1;
    this.currentSaleId = 1;

    // Seed initial data
    this.seedInitialData();
    
    // Ensure master user has isMaster flag (fix for existing users)
    this.ensureMasterFlag();
  }

  private async ensureMasterFlag() {
    try {
      const adminUser = await this.getUserByUsername("lleandro.m32@gmail.com");
      if (adminUser && !adminUser.isMaster) {
        await this.updateUser(adminUser.id, { isMaster: true });
      }
    } catch (error) {
      console.warn("⚠️ Erro ao verificar/corrigir isMaster:", error);
    }
  }

  private async seedInitialData() {
    // Seed admin user (if not exists)
    try {
      // Import the hashPassword function
      const { hashPassword } = await import("./auth");

      // Check if admin user already exists
      const existingAdmin = await this.getUserByUsername(
        "lleandro.m32@gmail.com",
      );

      if (!existingAdmin) {
        // Create admin user
        await this.createUser({
          username: "lleandro.m32@gmail.com",
          password: await hashPassword("admin"),
          name: "Leandro Menezes",
          phone: "11900000000",
          email: "lleandro.m32@gmail.com",
          isAdmin: true,
          isMaster: true,
        });
        
      }
    } catch (error) {
      
    }

    // Seed categories
    const categories: InsertCategory[] = [
      { name: "Serviços de Cabelo", icon: "fas fa-cut" },
      { name: "Serviços de Unhas", icon: "fas fa-hand-sparkles" },
      { name: "Tratamentos de Pele", icon: "fas fa-spa" },
      { name: "Outros Serviços", icon: "fas fa-magic" },
    ];

    categories.forEach((category) => this.createCategory(category));

    // Seed services
    const services: InsertService[] = [
      {
        name: "Corte de Cabelo",
        description:
          "Cortes modernos e clássicos para todos os estilos e tipos de cabelo, feitos por profissionais experientes.",
        minPrice: 50,
        maxPrice: 80,
        categoryId: 1,
        icon: "fas fa-cut",
        featured: true,
      },
      {
        name: "Manicure",
        description:
          "Cuidados completos para suas unhas, com uma grande variedade de cores e designs para escolher.",
        minPrice: 30,
        maxPrice: 50,
        categoryId: 2,
        icon: "fas fa-hand-sparkles",
        featured: true,
      },
      {
        name: "Tratamento de Pele",
        description:
          "Tratamentos especializados para uma pele saudável e radiante, adaptados às suas necessidades.",
        minPrice: 80,
        maxPrice: 130,
        categoryId: 3,
        icon: "fas fa-spa",
        featured: true,
      },
    ];

    services.forEach((service) => this.createService(service));

    // Seed price items
    const priceItems: InsertPriceItem[] = [
      { name: "Corte Feminino", minPrice: 50, maxPrice: 80, categoryId: 1 },
      { name: "Corte Masculino", minPrice: 35, maxPrice: 60, categoryId: 1 },
      { name: "Coloração", minPrice: 90, maxPrice: 150, categoryId: 1 },
      { name: "Mechas/Luzes", minPrice: 120, maxPrice: 200, categoryId: 1 },
      {
        name: "Tratamento Capilar",
        minPrice: 70,
        maxPrice: 120,
        categoryId: 1,
      },

      { name: "Manicure Simples", minPrice: 30, maxPrice: 30, categoryId: 2 },
      { name: "Pedicure Simples", minPrice: 40, maxPrice: 40, categoryId: 2 },
      {
        name: "Manicure e Pedicure",
        minPrice: 65,
        maxPrice: 65,
        categoryId: 2,
      },
      { name: "Esmaltação em Gel", minPrice: 50, maxPrice: 50, categoryId: 2 },
      {
        name: "Unhas em Gel/Acrílico",
        minPrice: 90,
        maxPrice: 120,
        categoryId: 2,
      },

      { name: "Limpeza de Pele", minPrice: 80, maxPrice: 80, categoryId: 3 },
      { name: "Hidratação Facial", minPrice: 70, maxPrice: 70, categoryId: 3 },
      { name: "Peeling", minPrice: 90, maxPrice: 130, categoryId: 3 },
      { name: "Microagulhamento", minPrice: 150, maxPrice: 150, categoryId: 3 },
      { name: "Massagem Facial", minPrice: 60, maxPrice: 60, categoryId: 3 },

      {
        name: "Depilação (pequenas áreas)",
        minPrice: 25,
        maxPrice: 40,
        categoryId: 4,
      },
      {
        name: "Depilação (grandes áreas)",
        minPrice: 50,
        maxPrice: 80,
        categoryId: 4,
      },
      {
        name: "Design de Sobrancelhas",
        minPrice: 35,
        maxPrice: 35,
        categoryId: 4,
      },
      { name: "Maquiagem Social", minPrice: 90, maxPrice: 90, categoryId: 4 },
      {
        name: "Maquiagem para Eventos",
        minPrice: 120,
        maxPrice: 150,
        categoryId: 4,
      },
    ];

    priceItems.forEach((priceItem) => this.createPriceItem(priceItem));

    // Seed default banner
    this.bannerConfig = {
      id: 1,
      title: "Bem-vindo ao Nosso Salão de Beleza",
      subtitle:
        "Transformamos sua beleza com cuidado, estilo e profissionalismo. Venha descobrir o que há de melhor em tratamentos personalizados.",
      ctaText: "Agendar Horário",
      ctaLink: "#appointments",
      backgroundImage: null,
      backgroundImageDataBase64: null,
      backgroundImageMimeType: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Seed default footer
    this.footerConfig = {
      id: 1,
      businessName: "Salão de Beleza Premium",
      cnpj: "12.345.678/0001-90",
      address: "Rua das Flores, 123 - Centro, São Paulo - SP, 01234-567",
      phone: "(11) 3456-7890",
      email: "contato@salaopremium.com.br",
      whatsapp: "11900000000",
      workingHours: "Segunda a Sexta: 9h às 18h | Sábado: 8h às 17h",
      facebookUrl: "https://facebook.com/salaopremium",
      instagramUrl: "https://instagram.com/salaopremium",
      tiktokUrl: null,
      youtubeUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Seed default site configuration
    this.siteConfig = {
      id: 1,
      siteName: "Salão de Beleza Premium",
      siteSlogan: "Transformando sua beleza com carinho e qualidade",
      logoUrl: null,
      primaryColor: "#3b82f6",
      appointmentBackgroundImageBase64: null,
      appointmentBackgroundImageMimeType: null,
      pixKey: null,
      pixBeneficiaryName: null,
      pixCity: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Seed reviews
    const reviews: InsertReview[] = [
      {
        clientName: "Maria Silva",
        rating: 4.5,
        comment:
          "O ambiente é super acolhedor e os profissionais são muito atenciosos. Meu corte ficou exatamente como eu queria! Voltarei com certeza.",
        likes: 1,
      },
      {
        clientName: "João Pereira",
        rating: 5,
        comment:
          "Sempre fui muito exigente com meu cabelo, mas aqui encontrei profissionais que realmente entendem o que eu quero. Recomendo a todos!",
        likes: 1,
      },
      {
        clientName: "Ana Costa",
        rating: 4.5,
        comment:
          "A manicure é excelente! Minhas unhas nunca ficaram tão bonitas e a esmaltação em gel durou muito mais do que em outros lugares. Super recomendo!",
        likes: 1,
      },
    ];

    reviews.forEach((review) => this.createReview(review));

    // Seed appointments
    const appointments: InsertAppointment[] = [
      {
        name: "Leandro Oliveira",
        email: "lleandro.m32@gmail.com",
        phone: "11964027914",
        serviceId: 1,
        categoryId: 1,
        date: "2025-04-10",
        time: "14:00",
        notes: "Corte masculino",
      },
      {
        name: "Maria Silva",
        email: "maria@example.com",
        phone: "11987654321",
        serviceId: 3,
        categoryId: 3,
        date: "2025-04-15",
        time: "10:30",
        notes: "Tratamento de pele para evento",
      },
    ];

    appointments.forEach((appointment) => this.createAppointment(appointment));
    
  }

  // === Users ===
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      name: insertUser.name ?? null,
      phone: insertUser.phone ?? null,
      email: insertUser.email ?? null,
      isAdmin: insertUser.isAdmin ?? false,
      isMaster: insertUser.isMaster ?? false,
      profileImageBase64: insertUser.profileImageBase64 ?? null,
      profileImageMimeType: insertUser.profileImageMimeType ?? null,
      createdAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, ...data };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async updateUserPassword(
    id: number,
    password: string,
  ): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, password };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async updateUserProfileImage(
    id: number,
    imageUrl: string | null,
    mimeType: string | null,
  ): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, profileImageBase64: imageUrl, profileImageMimeType: mimeType };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async deleteUserProfileImage(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, profileImageBase64: null, profileImageMimeType: null };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // === Clients ===
  async getClients(): Promise<User[]> {
    return Array.from(this.users.values()).filter((user) => !user.isAdmin);
  }

  async getClientById(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    return user && !user.isAdmin ? user : undefined;
  }

  async createClient(client: {
    name: string;
    phone: string;
    email: string;
  }): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    // Gera um username aleatório baseado no nome (para clientes que não fazem login)
    const username = `${client.name.toLowerCase().replace(/\s+/g, ".")}.${Date.now()}@client.local`;
    // Senha aleatória (já que esses clientes não fazem login)
    const password = Math.random().toString(36).substring(2, 15);

    const user: User = {
      id,
      username,
      password,
      name: client.name,
      phone: client.phone,
      email: client.email ?? null,
      isAdmin: false,
      isMaster: false,
      profileImageBase64: null,
      profileImageMimeType: null,
      createdAt: now,
    };

    this.users.set(id, user);
    return user;
  }

  async updateClient(
    id: number,
    client: { name?: string; phone?: string; email?: string },
  ): Promise<User | undefined> {
    const existingUser = this.users.get(id);

    if (existingUser && !existingUser.isAdmin) {
      const updatedUser = {
        ...existingUser,
        ...client,
      };

      this.users.set(id, updatedUser);
      return updatedUser;
    }

    return undefined;
  }

  async deleteClient(id: number): Promise<boolean> {
    const user = this.users.get(id);

    if (user && !user.isAdmin) {
      return this.users.delete(id);
    }

    return false;
  }

  // === Categories ===
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values()).sort((a, b) => a.id - b.id);
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(
    id: number,
    updates: Partial<InsertCategory>,
  ): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (category) {
      const updatedCategory = { ...category, ...updates };
      this.categories.set(id, updatedCategory);
      return updatedCategory;
    }
    return undefined;
  }

  async deleteCategory(id: number): Promise<boolean> {
    // Remove all services in this category first
    const servicesToDelete = Array.from(this.services.values()).filter(
      (service) => service.categoryId === id,
    );
    servicesToDelete.forEach((service) => this.services.delete(service.id));

    // Remove all price items in this category
    const priceItemsToDelete = Array.from(this.priceItems.values()).filter(
      (item) => item.categoryId === id,
    );
    priceItemsToDelete.forEach((item) => this.priceItems.delete(item.id));

    // Remove the category
    return this.categories.delete(id);
  }

  // === Services ===
  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values()).sort((a, b) => a.categoryId - b.categoryId || a.id - b.id);
  }

  async getFeaturedServices(): Promise<Service[]> {
    return Array.from(this.services.values())
      .filter((service) => service.featured)
      .sort((a, b) => a.categoryId - b.categoryId || a.id - b.id);
  }

  async getServiceById(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async getServicesByCategory(categoryId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.categoryId === categoryId,
    );
  }

  async createService(insertService: InsertService): Promise<Service> {
    const id = this.currentServiceId++;
    const service: Service = {
      id,
      name: insertService.name,
      description: insertService.description,
      minPrice: insertService.minPrice,
      maxPrice: insertService.maxPrice,
      categoryId: insertService.categoryId,
      icon: insertService.icon,
      imageUrl: insertService.imageUrl ?? null,
      imageDataBase64: null,
      imageMimeType: null,
      featured: insertService.featured ?? false,
    };
    this.services.set(id, service);
    return service;
  }

  async updateServiceImage(
    id: number,
    imageUrl: string,
  ): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (service) {
      const updatedService = { ...service, imageUrl };
      this.services.set(id, updatedService);
      return updatedService;
    }
    return undefined;
  }

  async updateServiceImageData(
    id: number,
    imageDataBase64: string,
    mimeType: string,
  ): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (service) {
      const updatedService = { 
        ...service, 
        imageDataBase64,
        imageMimeType: mimeType,
        imageUrl: `/api/images/service/${id}`
      };
      this.services.set(id, updatedService);
      return updatedService;
    }
    return undefined;
  }

  async updateServiceFeatured(
    id: number,
    featured: boolean,
  ): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (service) {
      const updatedService = { ...service, featured };
      this.services.set(id, updatedService);
      return updatedService;
    }
    return undefined;
  }

  async updateService(
    id: number,
    serviceData: InsertService,
  ): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (service) {
      const updatedService = { ...service, ...serviceData, id };
      this.services.set(id, updatedService);
      return updatedService;
    }
    return undefined;
  }

  async deleteService(id: number): Promise<boolean> {
    return this.services.delete(id);
  }

  // === Price Items ===
  async getPriceItems(): Promise<PriceItem[]> {
    return Array.from(this.priceItems.values());
  }

  async getPriceItemsByCategory(categoryId: number): Promise<PriceItem[]> {
    return Array.from(this.priceItems.values()).filter(
      (item) => item.categoryId === categoryId,
    );
  }

  async getPriceItemById(id: number): Promise<PriceItem | undefined> {
    return this.priceItems.get(id);
  }

  async createPriceItem(insertPriceItem: InsertPriceItem): Promise<PriceItem> {
    const id = this.currentPriceItemId++;
    const priceItem: PriceItem = { ...insertPriceItem, id };
    this.priceItems.set(id, priceItem);
    return priceItem;
  }

  async updatePriceItem(
    id: number,
    updates: Partial<InsertPriceItem>,
  ): Promise<PriceItem | undefined> {
    const existingPriceItem = this.priceItems.get(id);
    if (existingPriceItem) {
      const updatedPriceItem = { ...existingPriceItem, ...updates };
      this.priceItems.set(id, updatedPriceItem);
      return updatedPriceItem;
    }
    return undefined;
  }

  async deletePriceItem(id: number): Promise<boolean> {
    return this.priceItems.delete(id);
  }

  // === Appointments ===
  async getAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }

  async getAppointmentById(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async createAppointment(
    insertAppointment: InsertAppointment,
  ): Promise<Appointment> {
    const id = this.currentAppointmentId++;
    const now = new Date();
    const appointment: Appointment = {
      id,
      name: insertAppointment.name,
      email: insertAppointment.email,
      phone: insertAppointment.phone,
      serviceId: insertAppointment.serviceId,
      categoryId: insertAppointment.categoryId,
      professionalId: insertAppointment.professionalId ?? null,
      date: insertAppointment.date,
      time: insertAppointment.time,
      notes: insertAppointment.notes ?? null,
      status: "pending",
      seenByAdmin: false,
      seenByProfessional: false,
      createdAt: now,
      // Payment defaults
      requiresPayment: insertAppointment.requiresPayment ?? false,
      paymentStatus: insertAppointment.paymentStatus ?? "not_required",
      paymentAmount: insertAppointment.paymentAmount ?? null,
      mpPaymentId: insertAppointment.mpPaymentId ?? null,
      holdExpiresAt: (insertAppointment.holdExpiresAt as any) ?? null,
      userSubscriptionId: insertAppointment.userSubscriptionId ?? null,
    };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async updateAppointmentStatus(
    id: number,
    status: string,
  ): Promise<Appointment | undefined> {
    const appointment = this.appointments.get(id);
    if (appointment) {
      const updatedAppointment = { ...appointment, status };
      this.appointments.set(id, updatedAppointment);
      return updatedAppointment;
    }
    return undefined;
  }

  // === Reviews ===
  async getReviews(): Promise<Review[]> {
    return Array.from(this.reviews.values());
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.currentReviewId++;
    const now = new Date();
    const review: Review = {
      id,
      userId: insertReview.userId ?? null,
      clientName: insertReview.clientName,
      rating: insertReview.rating,
      comment: insertReview.comment,
      likes: insertReview.likes ?? 0,
      thumbsLikes: insertReview.thumbsLikes ?? 0,
      createdAt: now,
    };
    this.reviews.set(id, review);
    return review;
  }

  async toggleLikeReview(
    reviewId: number,
    userId: number,
  ): Promise<{ review: Review; userLiked: boolean } | undefined> {
    const review = this.reviews.get(reviewId);
    if (!review) return undefined;

    // Get user's current likes
    if (!this.userLikes.has(userId)) {
      this.userLikes.set(userId, new Set());
    }

    const userLikeSet = this.userLikes.get(userId)!;
    const userAlreadyLiked = userLikeSet.has(reviewId);

    let updatedReview: Review;

    if (userAlreadyLiked) {
      // Remove like
      userLikeSet.delete(reviewId);
      updatedReview = { ...review, likes: Math.max(0, review.likes - 1) };
    } else {
      // Add like
      userLikeSet.add(reviewId);
      updatedReview = { ...review, likes: review.likes + 1 };
    }

    this.reviews.set(reviewId, updatedReview);
    return { review: updatedReview, userLiked: !userAlreadyLiked };
  }

  async getUserLikes(userId: number): Promise<{heartLikes: number[]; thumbsLikes: number[]}> {
    const userLikeSet = this.userLikes.get(userId);
    const likes = userLikeSet ? Array.from(userLikeSet) : [];
    return { heartLikes: likes, thumbsLikes: [] };
  }

  // === Sales ===
  async getSales(): Promise<Sale[]> {
    return Array.from(this.sales.values());
  }

  async getSalesByDate(startDate: Date, endDate: Date): Promise<Sale[]> {
    return Array.from(this.sales.values()).filter((sale) => {
      const saleDate = new Date(sale.date);
      return saleDate >= startDate && saleDate <= endDate;
    });
  }

  async createSale(insertSale: InsertSale): Promise<Sale> {
    const appointmentId = insertSale.appointmentId ? Number(insertSale.appointmentId) : null;
    if (appointmentId !== null) {
      const existingSale = Array.from(this.sales.values()).find((sale) => sale.appointmentId === appointmentId);
      if (existingSale) {
        return existingSale;
      }
    }

    const id = this.currentSaleId++;
    const service = await this.getServiceById(parseInt(insertSale.serviceId));
    const now = new Date();

    const serviceId = parseInt(insertSale.serviceId);
    const profId = insertSale.professionalId ? parseInt(insertSale.professionalId) : null;
    const professional = profId ? await this.getProfessionalById(profId) : null;

    const sale: Sale = {
      ...insertSale,
      id,
      appointmentId,
      serviceName: service ? service.name : "Unknown Service",
      serviceId,
      categoryId: service?.categoryId ?? null,
      categoryName: null,
      professionalId: profId,
      professionalName: professional ? professional.name : null,
      status: "active",
      notes: insertSale.notes ?? null,
      cancelledReason: null,
      createdAt: now,
    };

    this.sales.set(id, sale);
    return sale;
  }

  async updateSale(id: number, data: Partial<InsertSale>): Promise<Sale | undefined> {
    const sale = this.sales.get(id);
    if (!sale) return undefined;
    const profId = data.professionalId ? parseInt(data.professionalId) : null;
    const professional = profId ? await this.getProfessionalById(profId) : null;
    const updated: Sale = {
      ...sale,
      ...data,
      appointmentId: data.appointmentId !== undefined ? data.appointmentId : sale.appointmentId,
      serviceId: data.serviceId ? parseInt(data.serviceId) : sale.serviceId,
      professionalId: profId !== undefined ? profId : sale.professionalId,
      professionalName: profId !== undefined ? (professional?.name ?? null) : sale.professionalName,
    };
    this.sales.set(id, updated);
    return updated;
  }

  async cancelSale(id: number, reason?: string): Promise<Sale | undefined> {
    const sale = this.sales.get(id);
    if (!sale) return undefined;
    const updated: Sale = { ...sale, status: "cancelled", cancelledReason: reason ?? null };
    this.sales.set(id, updated);
    return updated;
  }

  // === Banner ===
  async getBanner(): Promise<Banner | undefined> {
    return this.bannerConfig || undefined;
  }

  async updateBanner(banner: InsertBanner): Promise<Banner> {
    const now = new Date();
    const updatedBanner: Banner = {
      id: 1,
      title: banner.title,
      subtitle: banner.subtitle,
      ctaText: banner.ctaText,
      ctaLink: banner.ctaLink,
      backgroundImage: (banner.backgroundImage as string | null) || null,
      backgroundImageDataBase64: (banner.backgroundImageDataBase64 as string | null) || null,
      backgroundImageMimeType: (banner.backgroundImageMimeType as string | null) || null,
      isActive: true,
      createdAt: this.bannerConfig?.createdAt || now,
      updatedAt: now,
    };
    this.bannerConfig = updatedBanner;
    return updatedBanner;
  }

  async updateBannerImage(
    backgroundImage: string,
  ): Promise<Banner | undefined> {
    if (this.bannerConfig) {
      this.bannerConfig = {
        ...this.bannerConfig,
        backgroundImage,
        updatedAt: new Date(),
      };
      return this.bannerConfig;
    }
    return undefined;
  }

  async updateBannerImageData(
    imageDataBase64: string,
    mimeType: string,
  ): Promise<Banner | undefined> {
    if (this.bannerConfig) {
      this.bannerConfig = {
        ...this.bannerConfig,
        backgroundImageDataBase64: imageDataBase64,
        backgroundImageMimeType: mimeType,
        backgroundImage: `/api/images/banner?t=${Date.now()}`,
        updatedAt: new Date(),
      };
      return this.bannerConfig;
    }
    return undefined;
  }

  // === Footer ===
  async getFooter(): Promise<Footer | undefined> {
    return this.footerConfig || undefined;
  }

  async updateFooter(footer: InsertFooter): Promise<Footer> {
    const now = new Date();
    this.footerConfig = {
      id: 1,
      ...footer,
      cnpj: footer.cnpj || null,
      facebookUrl: footer.facebookUrl ?? null,
      instagramUrl: footer.instagramUrl ?? null,
      tiktokUrl: footer.tiktokUrl ?? null,
      youtubeUrl: footer.youtubeUrl ?? null,
      isActive: true,
      createdAt: this.footerConfig?.createdAt || now,
      updatedAt: now,
    };
    return this.footerConfig;
  }

  // === Site Configuration ===
  async getSiteConfig(): Promise<SiteConfig | undefined> {
    return this.siteConfig || undefined;
  }

  async updateSiteConfig(config: InsertSiteConfig): Promise<SiteConfig> {
    const now = new Date();
    this.siteConfig = {
      id: 1,
      ...config,
      createdAt: this.siteConfig?.createdAt || now,
      updatedAt: now,
    };
    return this.siteConfig;
  }

  async updateSiteLogo(logoUrl: string): Promise<SiteConfig | undefined> {
    if (this.siteConfig) {
      this.siteConfig = {
        ...this.siteConfig,
        logoUrl,
        updatedAt: new Date(),
      };
      return this.siteConfig;
    }
    return undefined;
  }

  // Password Reset Tokens (stub implementation for MemStorage)
  async createPasswordResetToken(insertToken: InsertPasswordResetToken): Promise<PasswordResetToken> {
    throw new Error("Password reset tokens not supported in MemStorage");
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    return undefined;
  }

  async deletePasswordResetToken(token: string): Promise<boolean> {
    return false;
  }

  async cleanupExpiredTokens(): Promise<void> {
    // No-op for MemStorage
  }

  async getScheduleBlocks(): Promise<ScheduleBlock[]> {
    return [];
  }

  async createScheduleBlock(block: InsertScheduleBlock): Promise<ScheduleBlock> {
    const id = Date.now();
    const newBlock: ScheduleBlock = {
      id,
      title: block.title ?? null,
      description: block.description ?? null,
      professionalId: block.professionalId ?? null,
      startTime: block.startTime ?? null,
      endTime: block.endTime ?? null,
      startDate: block.startDate,
      endDate: block.endDate,
      reason: block.reason,
      createdAt: new Date(),
    };
    return newBlock;
  }

  async deleteScheduleBlock(id: number): Promise<boolean> {
    return false;
  }

  async isDateBlocked(date: string, professionalId?: number | null): Promise<{ blocked: boolean; reason?: string; description?: string }> {
    return { blocked: false };
  }

  async getProfessionals(): Promise<Professional[]> { return []; }
  async getProfessionalsByCategory(categoryId: number): Promise<Professional[]> { return []; }
  async getProfessionalById(id: number): Promise<Professional | undefined> { return undefined; }
  async getProfessionalByUserId(userId: number): Promise<Professional | undefined> { return undefined; }
  async createProfessional(data: InsertProfessional): Promise<Professional> {
    return {
      id: Date.now(),
      name: data.name,
      categoryId: data.categoryId,
      bio: data.bio ?? null,
      photoBase64: data.photoBase64 ?? null,
      photoMimeType: data.photoMimeType ?? null,
      active: data.active ?? true,
      appointmentInterval: data.appointmentInterval ?? 40,
      userId: data.userId ?? null,
      lunchBreakStart: data.lunchBreakStart ?? null,
      lunchBreakEnd: data.lunchBreakEnd ?? null,
      createdAt: new Date(),
    };
  }
  async updateProfessional(id: number, data: Partial<InsertProfessional>): Promise<Professional | undefined> { return undefined; }
  async deleteProfessional(id: number): Promise<boolean> { return false; }
  async uploadProfessionalPhoto(id: number, photoUrl: string, photoMimeType: string): Promise<Professional | undefined> { return undefined; }
  async getAppointmentsByProfessionalId(professionalId: number): Promise<Appointment[]> { return []; }
  async getUnseenCountForAdmin(): Promise<number> { return 0; }
  async markAppointmentsSeenByAdmin(): Promise<void> {}
  async getUnseenCountForProfessional(professionalId: number): Promise<number> { return 0; }
  async markAppointmentsSeenByProfessional(professionalId: number): Promise<void> {}

  // Review Comments
  async getReviewComments(reviewId: number): Promise<ReviewComment[]> { return []; }
  async createReviewComment(comment: InsertReviewComment & { userId: number; userName: string }): Promise<ReviewComment> {
    const id = Date.now();
    return {
      id: Number(id),
      reviewId: comment.reviewId,
      userId: comment.userId,
      userName: comment.userName,
      comment: comment.comment,
      heartLikes: 0,
      thumbsLikes: 0,
      createdAt: new Date(),
    };
  }
  async toggleLikeComment(commentId: number, userId: number, likeType: 'heart' | 'thumbs'): Promise<{ comment: ReviewComment; userLiked: boolean } | undefined> {
    return undefined;
  }
  async getUserCommentLikes(userId: number): Promise<{ heartLikes: number[]; thumbsLikes: number[] }> {
    return { heartLikes: [], thumbsLikes: [] };
  }

  // ===== Payments & Subscriptions (Mock for MemStorage) =====
  async updateAppointmentPayment(): Promise<Appointment | undefined> {
    return undefined;
  }
  async expireStaleAppointmentHolds(): Promise<void> {}
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return [];
  }
  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return [];
  }
  async getSubscriptionPlanById(): Promise<SubscriptionPlan | undefined> {
    return undefined;
  }
  async createSubscriptionPlan(): Promise<SubscriptionPlan> {
    return {} as SubscriptionPlan;
  }
  async updateSubscriptionPlan(): Promise<SubscriptionPlan | undefined> {
    return undefined;
  }
  async deleteSubscriptionPlan(): Promise<boolean> {
    return false;
  }
  async createUserSubscription(): Promise<UserSubscription> {
    return {} as UserSubscription;
  }
  async updateUserSubscription(): Promise<UserSubscription | undefined> {
    return undefined;
  }
  async getUserSubscriptionById(): Promise<UserSubscription | undefined> {
    return undefined;
  }
  async getActiveSubscriptionForUser(): Promise<UserSubscription | undefined> {
    return undefined;
  }
  async getUserSubscriptionByPreapprovalId(): Promise<UserSubscription | undefined> {
    return undefined;
  }
  async cancelUserSubscription(): Promise<UserSubscription | undefined> {
    return undefined;
  }
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserPassword(id: number, password: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ password })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserProfileImage(id: number, imageUrl: string | null, mimeType: string | null): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ profileImageBase64: imageUrl, profileImageMimeType: mimeType })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUserProfileImage(id: number): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ profileImageBase64: null, profileImageMimeType: null })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Clients
  async getClients(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isAdmin, false));
  }

  async getClientById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(and(eq(users.id, id), eq(users.isAdmin, false)));
    return user || undefined;
  }

  async createClient(client: { name: string; phone: string; email?: string }): Promise<User> {
    const username = client.email && client.email.trim()
      ? client.email.trim()
      : `cliente.${client.phone.replace(/\D/g, '')}.${Date.now()}`;
    const [user] = await db.insert(users).values({
      username,
      password: '',
      name: client.name,
      phone: client.phone,
      email: client.email || null,
      isAdmin: false
    }).returning();
    return user;
  }

  async updateClient(id: number, client: { name?: string; phone?: string; email?: string }): Promise<User | undefined> {
    const updateData: Record<string, any> = { ...client };
    if (client.email) updateData.username = client.email;
    const [user] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.id);
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const [category] = await db.update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return category || undefined;
  }

  async deleteCategory(id: number): Promise<boolean> {
    // Delete related services and price items first
    await db.delete(services).where(eq(services.categoryId, id));
    await db.delete(priceItems).where(eq(priceItems.categoryId, id));
    
    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Services
  async getServices(): Promise<Service[]> {
    return await db.select().from(services).orderBy(services.categoryId, services.id);
  }

  async getFeaturedServices(): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.featured, true)).orderBy(services.categoryId, services.id);
  }

  async getServiceById(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getServicesByCategory(categoryId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.categoryId, categoryId));
  }

  async createService(insertService: InsertService): Promise<Service> {
    const [service] = await db.insert(services).values(insertService).returning();
    return service;
  }

  async updateServiceImage(id: number, imageUrl: string): Promise<Service | undefined> {
    const [service] = await db.update(services)
      .set({ imageUrl })
      .where(eq(services.id, id))
      .returning();
    return service || undefined;
  }

  async updateServiceImageData(id: number, imageDataBase64: string, mimeType: string): Promise<Service | undefined> {
    try {
      const [service] = await db
        .update(services)
        .set({ 
          imageDataBase64,
          imageMimeType: mimeType,
          imageUrl: `/api/images/service/${id}` // Update URL to point to our API
        })
        .where(eq(services.id, id))
        .returning();
      return service || undefined;
    } catch (error) {
      
      return undefined;
    }
  }

  async updateServiceFeatured(id: number, featured: boolean): Promise<Service | undefined> {
    const [service] = await db.update(services)
      .set({ featured })
      .where(eq(services.id, id))
      .returning();
    return service || undefined;
  }

  async updateService(id: number, serviceData: InsertService): Promise<Service | undefined> {
    const [service] = await db.update(services)
      .set(serviceData)
      .where(eq(services.id, id))
      .returning();
    return service || undefined;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Price Items
  async getPriceItems(): Promise<PriceItem[]> {
    return await db.select().from(priceItems);
  }

  async getPriceItemsByCategory(categoryId: number): Promise<PriceItem[]> {
    return await db.select().from(priceItems).where(eq(priceItems.categoryId, categoryId));
  }

  async getPriceItemById(id: number): Promise<PriceItem | undefined> {
    const [priceItem] = await db.select().from(priceItems).where(eq(priceItems.id, id));
    return priceItem || undefined;
  }

  async createPriceItem(insertPriceItem: InsertPriceItem): Promise<PriceItem> {
    const [priceItem] = await db.insert(priceItems).values(insertPriceItem).returning();
    return priceItem;
  }

  async updatePriceItem(id: number, updates: Partial<InsertPriceItem>): Promise<PriceItem | undefined> {
    const [priceItem] = await db.update(priceItems)
      .set(updates)
      .where(eq(priceItems.id, id))
      .returning();
    return priceItem || undefined;
  }

  async deletePriceItem(id: number): Promise<boolean> {
    const result = await db.delete(priceItems).where(eq(priceItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(desc(appointments.createdAt));
  }

  async getAppointmentById(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db.insert(appointments).values(insertAppointment).returning();
    return appointment;
  }

  async updateAppointmentStatus(id: number, status: string): Promise<Appointment | undefined> {
    const [appointment] = await db.update(appointments)
      .set({ status })
      .where(eq(appointments.id, id))
      .returning();
    return appointment || undefined;
  }

  // Reviews
  async getReviews(): Promise<Review[]> {
    const reviewsWithUsers = await db.select({
      id: reviews.id,
      userId: reviews.userId,
      clientName: reviews.clientName,
      rating: reviews.rating,
      comment: reviews.comment,
      likes: reviews.likes,
      thumbsLikes: reviews.thumbsLikes,
      createdAt: reviews.createdAt,
      // Include user profile image data
      userProfileImageBase64: users.profileImageBase64
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.userId, users.id))
    .orderBy(desc(reviews.createdAt));

    return reviewsWithUsers as Review[];
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(insertReview).returning();
    return review;
  }

  async toggleLikeReview(reviewId: number, userId: number, likeType: 'heart' | 'thumbs'): Promise<{ review: Review; userLiked: boolean } | undefined> {
    const existingLike = await db.select().from(reviewLikes)
      .where(and(
        eq(reviewLikes.reviewId, reviewId),
        eq(reviewLikes.userId, userId),
        eq(reviewLikes.likeType, likeType)
      ));

    let userLiked: boolean;

    if (existingLike.length > 0) {
      await db.delete(reviewLikes)
        .where(and(
          eq(reviewLikes.reviewId, reviewId),
          eq(reviewLikes.userId, userId),
          eq(reviewLikes.likeType, likeType)
        ));
      
      // Decrease appropriate likes count
      if (likeType === 'heart') {
        await db.update(reviews)
          .set({ likes: sql`${reviews.likes} - 1` })
          .where(eq(reviews.id, reviewId));
      } else {
        await db.update(reviews)
          .set({ thumbsLikes: sql`${reviews.thumbsLikes} - 1` })
          .where(eq(reviews.id, reviewId));
      }
      
      userLiked = false;
    } else {
      await db.insert(reviewLikes).values({
        reviewId,
        userId,
        likeType,
      });
      
      // Increase appropriate likes count
      if (likeType === 'heart') {
        await db.update(reviews)
          .set({ likes: sql`${reviews.likes} + 1` })
          .where(eq(reviews.id, reviewId));
      } else {
        await db.update(reviews)
          .set({ thumbsLikes: sql`${reviews.thumbsLikes} + 1` })
          .where(eq(reviews.id, reviewId));
      }
      
      userLiked = true;
    }

    const [review] = await db.select().from(reviews)
      .where(eq(reviews.id, reviewId));

    if (!review) return undefined;

    return { review, userLiked };
  }

  async getUserLikes(userId: number): Promise<{heartLikes: number[], thumbsLikes: number[]}> {
    const likes = await db.select({ reviewId: reviewLikes.reviewId, likeType: reviewLikes.likeType })
      .from(reviewLikes)
      .where(eq(reviewLikes.userId, userId));
    
    const heartLikes = likes.filter(like => like.likeType === 'heart').map(like => like.reviewId);
    const thumbsLikes = likes.filter(like => like.likeType === 'thumbs').map(like => like.reviewId);
    
    return { heartLikes, thumbsLikes };
  }

  // Review Comments
  async getReviewComments(reviewId: number): Promise<ReviewComment[]> {
    const comments = await db.select({
      id: reviewComments.id,
      reviewId: reviewComments.reviewId,
      userId: reviewComments.userId,
      userName: reviewComments.userName,
      comment: reviewComments.comment,
      createdAt: reviewComments.createdAt,
      heartLikes: reviewComments.heartLikes,
      thumbsLikes: reviewComments.thumbsLikes,
      // Include user profile image data
      userProfileImageBase64: users.profileImageBase64
    })
    .from(reviewComments)
    .leftJoin(users, eq(reviewComments.userId, users.id))
    .where(eq(reviewComments.reviewId, reviewId))
    .orderBy(desc(reviewComments.createdAt));


    return comments as ReviewComment[];
  }

  async createReviewComment(comment: InsertReviewComment & { userId: number; userName: string }): Promise<ReviewComment> {
    const [newComment] = await db.insert(reviewComments).values(comment).returning();
    return newComment;
  }

  async toggleLikeComment(commentId: number, userId: number, likeType: 'heart' | 'thumbs'): Promise<{ comment: ReviewComment; userLiked: boolean } | undefined> {
    const existingLike = await db.select().from(commentLikes)
      .where(and(
        eq(commentLikes.commentId, commentId),
        eq(commentLikes.userId, userId),
        eq(commentLikes.likeType, likeType)
      ));

    let userLiked: boolean;

    if (existingLike.length > 0) {
      await db.delete(commentLikes)
        .where(and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.userId, userId),
          eq(commentLikes.likeType, likeType)
        ));
      
      if (likeType === 'heart') {
        await db.update(reviewComments)
          .set({ heartLikes: sql`${reviewComments.heartLikes} - 1` })
          .where(eq(reviewComments.id, commentId));
      }
      
      userLiked = false;
    } else {
      await db.insert(commentLikes).values({
        commentId,
        userId,
        likeType,
      });
      
      if (likeType === 'heart') {
        await db.update(reviewComments)
          .set({ heartLikes: sql`${reviewComments.heartLikes} + 1` })
          .where(eq(reviewComments.id, commentId));
      }
      
      userLiked = true;
    }

    const [comment] = await db.select().from(reviewComments)
      .where(eq(reviewComments.id, commentId));

    if (!comment) return undefined;

    return { comment, userLiked };
  }

  async getUserCommentLikes(userId: number): Promise<{heartLikes: number[]; thumbsLikes: number[]}> {
    const allLikes = await db.select({ 
      commentId: commentLikes.commentId, 
      likeType: commentLikes.likeType 
    })
      .from(commentLikes)
      .where(eq(commentLikes.userId, userId));
    
    const heartLikes = allLikes
      .filter(like => like.likeType === 'heart')
      .map(like => like.commentId);
    
    const thumbsLikes = allLikes
      .filter(like => like.likeType === 'thumbs')
      .map(like => like.commentId);
    
    return { heartLikes, thumbsLikes };
  }

  // Sales
  async getSales(): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.createdAt));
  }

  async getSalesByDate(startDate: Date, endDate: Date): Promise<Sale[]> {
    return await db.select().from(sales)
      .where(and(
        gte(sales.createdAt, startDate),
        lte(sales.createdAt, endDate)
      ))
      .orderBy(desc(sales.createdAt));
  }

  async createSale(insertSale: InsertSale): Promise<Sale> {
    const appointmentId = insertSale.appointmentId ? Number(insertSale.appointmentId) : null;
    if (appointmentId !== null) {
      const [existingSale] = await db.select().from(sales).where(eq(sales.appointmentId, appointmentId)).limit(1);
      if (existingSale) {
        return existingSale;
      }
    }

    const serviceId = Number(insertSale.serviceId);
    const service = await this.getServiceById(serviceId);
    const serviceName = service ? service.name : "Serviço";
    const category = service ? await this.getCategoryById(service.categoryId) : null;
    const profId = insertSale.professionalId ? Number(insertSale.professionalId) : null;
    const professional = profId ? await this.getProfessionalById(profId) : null;
    const [sale] = await db.insert(sales).values({
      ...insertSale,
      appointmentId,
      serviceId,
      serviceName,
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      professionalId: profId,
      professionalName: professional?.name ?? null,
      status: "active",
    }).returning();
    return sale;
  }

  async updateSale(id: number, data: Partial<InsertSale>): Promise<Sale | undefined> {
    const updateData: Record<string, unknown> = {};
    if (data.appointmentId !== undefined) updateData.appointmentId = data.appointmentId;
    if (data.clientName !== undefined) updateData.clientName = data.clientName;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.serviceId !== undefined) {
      const serviceId = Number(data.serviceId);
      updateData.serviceId = serviceId;
      const service = await this.getServiceById(serviceId);
      updateData.serviceName = service ? service.name : "Serviço";
      const category = service ? await this.getCategoryById(service.categoryId) : null;
      updateData.categoryId = category?.id ?? null;
      updateData.categoryName = category?.name ?? null;
    }
    if (data.professionalId !== undefined) {
      const profId = data.professionalId ? Number(data.professionalId) : null;
      const professional = profId ? await this.getProfessionalById(profId) : null;
      updateData.professionalId = profId;
      updateData.professionalName = professional?.name ?? null;
    }
    const [updated] = await db.update(sales).set(updateData).where(eq(sales.id, id)).returning();
    return updated;
  }

  async cancelSale(id: number, reason?: string): Promise<Sale | undefined> {
    const [updated] = await db.update(sales)
      .set({ status: "cancelled", cancelledReason: reason ?? null })
      .where(eq(sales.id, id))
      .returning();
    return updated;
  }

  // Banner
  async getBanner(): Promise<Banner | undefined> {
    const [bannerData] = await db.select().from(banner).limit(1);
    return bannerData || undefined;
  }

  async updateBanner(insertBanner: InsertBanner): Promise<Banner> {
    // Try to update first, if no rows affected, insert
    const [updated] = await db.update(banner)
      .set(insertBanner)
      .returning();
    
    if (updated) {
      return updated;
    }
    
    const [created] = await db.insert(banner).values(insertBanner).returning();
    return created;
  }

  async updateBannerImage(backgroundImage: string): Promise<Banner | undefined> {
    const [updated] = await db.update(banner)
      .set({ backgroundImage })
      .returning();
    return updated || undefined;
  }

  async updateBannerImageData(imageDataBase64: string, mimeType: string): Promise<Banner | undefined> {
    try {
      const [updated] = await db
        .update(banner)
        .set({ 
          backgroundImageDataBase64: imageDataBase64,
          backgroundImageMimeType: mimeType,
          backgroundImage: `/api/images/banner?t=${Date.now()}`, // cache-busting timestamp
          updatedAt: new Date()
        })
        .returning();
      return updated || undefined;
    } catch (error) {
      
      return undefined;
    }
  }

  // Footer
  async getFooter(): Promise<Footer | undefined> {
    const [footerData] = await db.select().from(footer).limit(1);
    return footerData || undefined;
  }

  async updateFooter(insertFooter: InsertFooter): Promise<Footer> {
    const [existing] = await db.select().from(footer).limit(1);

    if (existing) {
      const [updated] = await db.update(footer)
        .set({ ...insertFooter, updatedAt: new Date() })
        .where(eq(footer.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(footer).values({
      ...insertFooter,
      isActive: true,
    }).returning();
    return created;
  }

  // Site Configuration
  async getSiteConfig(): Promise<SiteConfig | undefined> {
    const [config] = await db.select().from(siteConfig).limit(1);
    return config || undefined;
  }

  async updateSiteConfig(insertConfig: InsertSiteConfig): Promise<SiteConfig> {
    const [existing] = await db.select().from(siteConfig).limit(1);

    if (existing) {
      const [updated] = await db.update(siteConfig)
        .set({ ...insertConfig, updatedAt: new Date() })
        .where(eq(siteConfig.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(siteConfig).values(insertConfig).returning();
    return created;
  }

  async updateSiteLogo(logoUrl: string): Promise<SiteConfig | undefined> {
    const [updated] = await db.update(siteConfig)
      .set({ logoUrl })
      .returning();
    return updated || undefined;
  }

  // Password Reset Tokens
  async createPasswordResetToken(insertToken: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db.insert(passwordResetTokens).values(insertToken).returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [tokenData] = await db.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        gte(passwordResetTokens.expiresAt, new Date())
      ));
    return tokenData || undefined;
  }

  async deletePasswordResetToken(token: string): Promise<boolean> {
    const result = await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return (result.rowCount || 0) > 0;
  }

  async cleanupExpiredTokens(): Promise<void> {
    await db.delete(passwordResetTokens)
      .where(sql`expires_at < NOW()`);
  }

  async getScheduleBlocks(): Promise<ScheduleBlock[]> {
    return db.select().from(scheduleBlocks).orderBy(desc(scheduleBlocks.createdAt));
  }

  async createScheduleBlock(block: InsertScheduleBlock): Promise<ScheduleBlock> {
    const [created] = await db.insert(scheduleBlocks).values(block).returning();
    return created;
  }

  async deleteScheduleBlock(id: number): Promise<boolean> {
    const result = await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getBlocksForDate(date: string, professionalId?: number | null): Promise<ScheduleBlock[]> {
    const blocks = await db.select().from(scheduleBlocks);
    return blocks.filter(b =>
      date >= b.startDate && date <= b.endDate &&
      (b.professionalId === null || (professionalId != null && b.professionalId === professionalId))
    );
  }

  async isDateBlocked(date: string, professionalId?: number | null, time?: string): Promise<{ blocked: boolean; reason?: string; description?: string }> {
    const dateBlocks = await this.getBlocksForDate(date, professionalId);
    const matched = dateBlocks.find(b => {
      // Full-day block (no time range)
      if (!b.startTime || !b.endTime) return true;
      // Partial-day block — only blocked if a specific time falls within range
      if (time) return time >= b.startTime && time < b.endTime;
      // No time provided → the day has at least one block (partial counts)
      return true;
    });
    if (matched) {
      return { blocked: true, reason: matched.reason, description: matched.description ?? undefined };
    }
    return { blocked: false };
  }

  async getProfessionals(): Promise<Professional[]> {
    return db.select().from(professionals).orderBy(professionals.name);
  }

  async getProfessionalById(id: number): Promise<Professional | undefined> {
    const [p] = await db.select().from(professionals).where(eq(professionals.id, id));
    return p;
  }

  async getProfessionalsByCategory(categoryId: number): Promise<Professional[]> {
    return db.select().from(professionals)
      .where(and(eq(professionals.categoryId, categoryId), eq(professionals.active, true)))
      .orderBy(professionals.name);
  }

  async createProfessional(data: InsertProfessional): Promise<Professional> {
    const [created] = await db.insert(professionals).values(data).returning();
    return created;
  }

  async updateProfessional(id: number, data: Partial<InsertProfessional>): Promise<Professional | undefined> {
    const [updated] = await db.update(professionals).set(data).where(eq(professionals.id, id)).returning();
    return updated;
  }

  async deleteProfessional(id: number): Promise<boolean> {
    const result = await db.delete(professionals).where(eq(professionals.id, id));
    return (result.rowCount || 0) > 0;
  }

  async uploadProfessionalPhoto(id: number, photoUrl: string, photoMimeType: string): Promise<Professional | undefined> {
    const [updated] = await db.update(professionals)
      .set({ photoBase64: photoUrl, photoMimeType })
      .where(eq(professionals.id, id))
      .returning();
    return updated;
  }

  async getProfessionalByUserId(userId: number): Promise<Professional | undefined> {
    const [p] = await db.select().from(professionals).where(eq(professionals.userId, userId));
    return p;
  }

  async getAppointmentsByProfessionalId(professionalId: number): Promise<Appointment[]> {
    return db.select().from(appointments)
      .where(eq(appointments.professionalId, professionalId))
      .orderBy(desc(appointments.createdAt));
  }

  async getUnseenCountForAdmin(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(eq(appointments.seenByAdmin, false));
    return Number(result[0]?.count ?? 0);
  }

  async markAppointmentsSeenByAdmin(): Promise<void> {
    await db.update(appointments)
      .set({ seenByAdmin: true })
      .where(eq(appointments.seenByAdmin, false));
  }

  async getUnseenCountForProfessional(professionalId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(and(eq(appointments.professionalId, professionalId), eq(appointments.seenByProfessional, false)));
    return Number(result[0]?.count ?? 0);
  }

  async markAppointmentsSeenByProfessional(professionalId: number): Promise<void> {
    await db.update(appointments)
      .set({ seenByProfessional: true })
      .where(and(eq(appointments.professionalId, professionalId), eq(appointments.seenByProfessional, false)));
  }

  // ===== Payments & Subscriptions =====

  async updateAppointmentPayment(
    id: number,
    data: { paymentStatus?: string; paymentAmount?: number; mpPaymentId?: string; holdExpiresAt?: Date; userSubscriptionId?: number }
  ): Promise<Appointment | undefined> {
    const updateData: any = {};
    if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
    if (data.paymentAmount !== undefined) updateData.paymentAmount = data.paymentAmount;
    if (data.mpPaymentId !== undefined) updateData.mpPaymentId = data.mpPaymentId;
    if (data.holdExpiresAt !== undefined) updateData.holdExpiresAt = data.holdExpiresAt;
    if (data.userSubscriptionId !== undefined) updateData.userSubscriptionId = data.userSubscriptionId;

    const [appointment] = await db.update(appointments)
      .set(updateData)
      .where(eq(appointments.id, id))
      .returning();
    return appointment || undefined;
  }

  async expireStaleAppointmentHolds(): Promise<void> {
    const now = new Date();
    await db.update(appointments)
      .set({ paymentStatus: "expired", status: "cancelled" })
      .where(
        and(
          eq(appointments.paymentStatus, "pending"),
          sql`${appointments.holdExpiresAt} <= ${now}`
        )
      );
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).orderBy(desc(subscriptionPlans.createdAt));
  }

  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.active, true))
      .orderBy(desc(subscriptionPlans.createdAt));
  }

  async getSubscriptionPlanById(id: number): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan || undefined;
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [created] = await db.insert(subscriptionPlans).values(plan).returning();
    return created;
  }

  async updateSubscriptionPlan(id: number, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    const [updated] = await db.update(subscriptionPlans)
      .set(plan)
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSubscriptionPlan(id: number): Promise<boolean> {
    const result = await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async createUserSubscription(subscription: InsertUserSubscription & { userId: number }): Promise<UserSubscription> {
    const [created] = await db.insert(userSubscriptions).values(subscription).returning();
    return created;
  }

  async updateUserSubscription(id: number, data: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
    const [updated] = await db.update(userSubscriptions)
      .set(data)
      .where(eq(userSubscriptions.id, id))
      .returning();
    return updated || undefined;
  }

  async getUserSubscriptionById(id: number): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.id, id));
    return subscription || undefined;
  }

  async getActiveSubscriptionForUser(userId: number): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, "authorized")
      ))
      .orderBy(desc(userSubscriptions.createdAt));
    return subscription || undefined;
  }

  async getUserSubscriptionByPreapprovalId(preapprovalId: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.mpPreapprovalId, preapprovalId));
    return subscription || undefined;
  }

  async cancelUserSubscription(id: number): Promise<UserSubscription | undefined> {
    const [cancelled] = await db.update(userSubscriptions)
      .set({ status: "cancelled" })
      .where(eq(userSubscriptions.id, id))
      .returning();
    return cancelled || undefined;
  }
}

export const storage = new DatabaseStorage();
