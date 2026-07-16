import { pgTable, text, serial, integer, boolean, timestamp, real, date, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === Users ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  isAdmin: boolean("is_admin").default(false),
  isMaster: boolean("is_master").default(false),
  profileImageBase64: text("profile_image_base64"),
  profileImageMimeType: text("profile_image_mime_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3),
  password: z.string().min(4),
  name: z.string().min(3).optional(),
  phone: z.string().min(8).optional(),
  email: z.string().email().optional(),
  isAdmin: z.boolean().optional(),
  isMaster: z.boolean().optional(),
  profileImageBase64: z.string().optional(),
  profileImageMimeType: z.string().optional(),
}).omit({ id: true, createdAt: true });

// === Categories ===
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories, {
  name: z.string().min(3),
  icon: z.string().min(1),
}).omit({ id: true });

// === Services ===
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  minPrice: real("min_price").notNull(),
  maxPrice: real("max_price").notNull(),
  categoryId: integer("category_id").notNull(),
  icon: text("icon").notNull(),
  imageUrl: text("image_url"),
  imageDataBase64: text("image_data_base64"),
  imageMimeType: text("image_mime_type"),
  featured: boolean("featured").default(false),
});

export const insertServiceSchema = createInsertSchema(services, {
  name: z.string().min(3),
  description: z.string().min(10),
  minPrice: z.number().min(0),
  maxPrice: z.number().min(0),
  categoryId: z.number().int(),
  icon: z.string().min(1),
  imageUrl: z.string().url().optional(),
  featured: z.boolean().optional(),
}).omit({ id: true });

// === Price Items ===
export const priceItems = pgTable("price_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  minPrice: real("min_price").notNull(),
  maxPrice: real("max_price").notNull(),
  categoryId: integer("category_id").notNull(),
});

export const insertPriceItemSchema = createInsertSchema(priceItems, {
  name: z.string().min(3),
  minPrice: z.number().min(0),
  maxPrice: z.number().min(0),
  categoryId: z.number().int(),
}).omit({ id: true });

// === Appointments ===
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  serviceId: integer("service_id").notNull(),
  categoryId: integer("category_id").notNull(),
  professionalId: integer("professional_id"),
  date: date("date").notNull(),
  time: text("time").notNull(),
  notes: text("notes"),
  status: text("status").default("pending"),
  seenByAdmin: boolean("seen_by_admin").default(false).notNull(),
  seenByProfessional: boolean("seen_by_professional").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  // Payment fields
  requiresPayment: boolean("requires_payment").default(false),
  paymentStatus: text("payment_status").default("not_required"), // not_required | pending | paid | failed | expired
  paymentAmount: real("payment_amount"),
  mpPaymentId: text("mp_payment_id"),
  holdExpiresAt: timestamp("hold_expires_at"),
  userSubscriptionId: integer("user_subscription_id"),
});

export const insertAppointmentSchema = createInsertSchema(appointments, {
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(10),
  serviceId: z.union([z.string(), z.number()]).transform(val => Number(val)),
  categoryId: z.union([z.string(), z.number()]).transform(val => Number(val)),
  professionalId: z.union([z.string(), z.number()]).transform(val => val === "" || val === null || val === undefined ? null : Number(val)).nullable().optional(),
  date: z.string(),
  time: z.string(),
  notes: z.string().optional(),
  requiresPayment: z.boolean().optional(),
  paymentStatus: z.enum(["not_required", "pending", "paid", "failed", "expired"]).optional(),
  paymentAmount: z.number().optional(),
  mpPaymentId: z.string().optional(),
  holdExpiresAt: z.date().optional(),
  userSubscriptionId: z.number().int().optional(),
}).omit({ id: true, status: true, seenByAdmin: true, seenByProfessional: true, createdAt: true });

// === Reviews ===
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // Opcional para permitir reviews de usuários não cadastrados
  clientName: text("client_name").notNull(),
  rating: real("rating").notNull(),
  comment: text("comment").notNull(),
  likes: integer("likes").notNull().default(0),
  thumbsLikes: integer("thumbs_likes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews, {
  clientName: z.string().min(3),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10),
  likes: z.number().default(0),
}).omit({ id: true, createdAt: true });

// === Review Comments (Threads) ===
export const reviewComments = pgTable("review_comments", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull(),
  userId: integer("user_id").notNull(),
  userName: text("user_name").notNull(),
  comment: text("comment").notNull(),
  heartLikes: integer("heart_likes").notNull().default(0),
  thumbsLikes: integer("thumbs_likes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewCommentSchema = createInsertSchema(reviewComments, {
  reviewId: z.number().int(),
  comment: z.string().min(1),
}).omit({ id: true, userId: true, userName: true, heartLikes: true, thumbsLikes: true, createdAt: true });

// === Comment Likes ===
export const commentLikes = pgTable("comment_likes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull(),
  userId: integer("user_id").notNull(),
  likeType: text("like_type").notNull(), // 'heart' ou 'thumbs'
  createdAt: timestamp("created_at").defaultNow(),
});

// === Review Likes ===
export const reviewLikes = pgTable("review_likes", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull(),
  userId: integer("user_id").notNull(),
  likeType: text("like_type").notNull(), // 'heart' ou 'thumbs'
  createdAt: timestamp("created_at").defaultNow(),
});

// === Sales ===
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").unique(),
  clientName: text("client_name").notNull(),
  serviceId: integer("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  categoryId: integer("category_id"),
  categoryName: text("category_name"),
  professionalId: integer("professional_id"),
  professionalName: text("professional_name"),
  amount: real("amount").notNull(),
  date: date("date").notNull(),
  paymentMethod: text("payment_method").notNull(),
  notes: text("notes"),
  status: text("status").default("active").notNull(),
  cancelledReason: text("cancelled_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSaleSchema = createInsertSchema(sales, {
  appointmentId: z.number().int().optional(),
  clientName: z.string().min(3),
  serviceId: z.string(),
  serviceName: z.string().min(3),
  amount: z.number().min(0),
  date: z.string(),
  paymentMethod: z.string().min(1),
  notes: z.string().optional(),
  professionalId: z.string().optional(),
}).omit({ id: true, createdAt: true, serviceName: true, status: true, cancelledReason: true, categoryId: true, categoryName: true, professionalName: true });

// === Banner ===
export const banner = pgTable("banner", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  ctaText: text("cta_text").notNull(),
  ctaLink: text("cta_link").notNull(),
  backgroundImage: text("background_image"),
  backgroundImageDataBase64: text("background_image_data_base64"),
  backgroundImageMimeType: text("background_image_mime_type"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBannerSchema = createInsertSchema(banner, {
  title: z.string().min(1, "Título é obrigatório"),
  subtitle: z.string().min(1, "Subtítulo é obrigatório"),
  ctaText: z.string().min(1, "Texto do botão é obrigatório"),
  ctaLink: z.string().min(1, "Link do botão é obrigatório"),
}).omit({ id: true, createdAt: true, updatedAt: true });

// === Footer Configuration ===
export const footer = pgTable("footer", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  cnpj: text("cnpj"),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  whatsapp: text("whatsapp").notNull(),
  workingHours: text("working_hours").notNull(),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  tiktokUrl: text("tiktok_url"),
  youtubeUrl: text("youtube_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFooterSchema = createInsertSchema(footer, {
  businessName: z.string().min(1, "Nome do negócio é obrigatório"),
  cnpj: z.string().regex(/^(\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/, "CNPJ inválido").optional().or(z.literal("")),
  address: z.string().min(1, "Endereço é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido"),
  whatsapp: z.string().min(1, "WhatsApp é obrigatório"),
  workingHours: z.string().min(1, "Horário de funcionamento é obrigatório"),
  facebookUrl: z.string().url("URL do Facebook inválida").optional().or(z.literal("")),
  instagramUrl: z.string().url("URL do Instagram inválida").optional().or(z.literal("")),
  tiktokUrl: z.string().url("URL do TikTok inválida").optional().or(z.literal("")),
  youtubeUrl: z.string().url("URL do YouTube inválida").optional().or(z.literal("")),
}).omit({ id: true, createdAt: true, updatedAt: true });

// === Site Configuration ===
export const siteConfig = pgTable("site_config", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").notNull(),
  siteSlogan: text("site_slogan"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#3b82f6"),
  appointmentBackgroundImageBase64: text("appointment_background_image_base64"),
  appointmentBackgroundImageMimeType: text("appointment_background_image_mime_type"),
  pixKey: text("pix_key"),
  pixBeneficiaryName: text("pix_beneficiary_name"),
  pixCity: text("pix_city"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSiteConfigSchema = createInsertSchema(siteConfig, {
  siteName: z.string().min(1, "Nome do site é obrigatório"),
  siteSlogan: z.string().default(""),
  logoUrl: z.string().nullable().default(null),
  primaryColor: z.string()
    .refine(
      (val) => val === "" || /^#[0-9A-Fa-f]{6}$/.test(val),
      "Cor deve estar no formato #RRGGBB"
    )
    .default("#3b82f6"),
  appointmentBackgroundImageBase64: z.string().nullable().default(null),
  appointmentBackgroundImageMimeType: z.string().nullable().default(null),
  pixKey: z.string().default(""),
  pixBeneficiaryName: z.string().default(""),
  pixCity: z.string().default(""),
}).omit({ id: true, createdAt: true, updatedAt: true });

// === Subscription Plans ===
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  includedServiceIds: text("included_service_ids"), // JSON array stored as text
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans, {
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  price: z.number().min(0.01, "Preço deve ser maior que 0"),
  includedServiceIds: z.string().optional(), // JSON array as string
  active: z.boolean().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

// === User Subscriptions ===
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planId: integer("plan_id").notNull(),
  mpPreapprovalId: text("mp_preapproval_id"),
  status: text("status").default("pending"), // pending | authorized | paused | cancelled
  startDate: timestamp("start_date").defaultNow().notNull(),
  nextBillingDate: timestamp("next_billing_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions, {
  userId: z.number().int(),
  planId: z.number().int(),
  mpPreapprovalId: z.string().optional(),
  status: z.enum(["pending", "authorized", "paused", "cancelled"]).optional(),
  nextBillingDate: z.date(),
}).omit({ id: true, startDate: true, createdAt: true, updatedAt: true });

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type PriceItem = typeof priceItems.$inferSelect;
export type InsertPriceItem = z.infer<typeof insertPriceItemSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Review = typeof reviews.$inferSelect & {
  userProfileImageBase64?: string | null;
};
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type ReviewComment = typeof reviewComments.$inferSelect & {
  userProfileImageBase64?: string | null;
};
export type InsertReviewComment = z.infer<typeof insertReviewCommentSchema>;

export type CommentLike = typeof commentLikes.$inferSelect;

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

export type Banner = typeof banner.$inferSelect;
export type InsertBanner = z.infer<typeof insertBannerSchema>;

export type Footer = typeof footer.$inferSelect;
export type InsertFooter = z.infer<typeof insertFooterSchema>;

export type SiteConfig = typeof siteConfig.$inferSelect;
export type InsertSiteConfig = z.infer<typeof insertSiteConfigSchema>;

// === Schedule Blocks ===
export const scheduleBlocks = pgTable("schedule_blocks", {
  id: serial("id").primaryKey(),
  professionalId: integer("professional_id"),
  title: text("title"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  reason: text("reason").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduleBlockSchema = createInsertSchema(scheduleBlocks, {
  professionalId: z.number().int().nullable().optional(),
  title: z.string().nullable().optional(),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().min(1, "Data de fim é obrigatória"),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  reason: z.string().min(1, "Motivo é obrigatório"),
  description: z.string().optional(),
}).omit({ id: true, createdAt: true });

export type ScheduleBlock = typeof scheduleBlocks.$inferSelect;
export type InsertScheduleBlock = z.infer<typeof insertScheduleBlockSchema>;

// === Password Reset Tokens ===
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens, {
  token: z.string().min(1),
  userId: z.number().int(),
  expiresAt: z.date(),
}).omit({ id: true, createdAt: true });

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// === Professionals ===
export const professionals = pgTable("professionals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull(),
  bio: text("bio"),
  photoBase64: text("photo_base64"),
  photoMimeType: text("photo_mime_type"),
  active: boolean("active").default(true).notNull(),
  appointmentInterval: integer("appointment_interval").default(40).notNull(),
  userId: integer("user_id"),
  lunchBreakStart: text("lunch_break_start"),
  lunchBreakEnd: text("lunch_break_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProfessionalSchema = createInsertSchema(professionals, {
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  categoryId: z.number().int(),
  bio: z.string().optional(),
  photoBase64: z.string().optional(),
  photoMimeType: z.string().optional(),
  active: z.boolean().optional(),
  appointmentInterval: z.number().int().min(10).max(480).optional(),
  userId: z.number().int().nullable().optional(),
  lunchBreakStart: z.string().nullable().optional(),
  lunchBreakEnd: z.string().nullable().optional(),
}).omit({ id: true, createdAt: true });

export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;

// === Sessions (for express-session + connect-pg-simple) ===
export const sessions = pgTable("session", {
  sid: varchar("sid").notNull().primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

export type Session = typeof sessions.$inferSelect;

// Additional types for frontend select options
export interface ServiceOption {
  id: string;
  name: string;
  minPrice: number;
}
