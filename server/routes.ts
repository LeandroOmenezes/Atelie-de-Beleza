import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, generatePasswordResetToken, verifyPasswordResetToken, removePasswordResetToken } from "./auth";
import * as mercadoPago from "./mercadopago";

import { insertAppointmentSchema, insertSaleSchema, insertReviewSchema, insertBannerSchema, insertFooterSchema, insertPriceItemSchema, insertServiceSchema, insertCategorySchema, insertSiteConfigSchema, insertProfessionalSchema, insertSubscriptionPlanSchema, insertUserSubscriptionSchema } from "@shared/schema";
import { ZodError } from "zod";
import multer from "multer";
import path from "path";
import express from "express";
import { uploadFileToSupabase, deleteFileFromSupabase } from "./supabase";
import { db } from "./db";
import { users, services, banner, siteConfig, professionals } from "@shared/schema";
import { eq } from "drizzle-orm";

const BUSINESS_TIMEZONE = "America/Sao_Paulo";

function getBusinessNow() {
  // Avoid parsing locale-formatted strings (which the Date constructor
  // interprets as MM/DD in some environments). Instead compute Brasilia
  // time from UTC. Brasilia is UTC-3 (no DST currently).
  const now = new Date();
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60000;
  const brasiliaOffsetHours = -3; // UTC-3
  return new Date(utcMillis + brasiliaOffsetHours * 60 * 60 * 1000);
}

function buildBusinessDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const isoString = `${date}T${time}:00-03:00`;
  const dateTime = new Date(isoString);
  if (!Number.isNaN(dateTime.getTime())) {
    return dateTime;
  }
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute));
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Apenas imagens JPEG, PNG e WebP são permitidas'));
      }
    }
  });

  // SSE clients list for realtime appointment updates
  const sseClients: Array<{ id: number; res: Response }> = [];
  let sseClientId = 0;

  function broadcastEvent(eventName: string, data: unknown) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    for (const client of sseClients) {
      try {
        client.res.write(`event: ${eventName}\n`);
        client.res.write(`data: ${payload}\n\n`);
      } catch (err) {
        // ignore write errors; client removal handled on close
      }
    }
  }

  // SSE endpoint: clients subscribe to receive 'time' and 'refresh' events
  app.get('/api/appointments/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const id = ++sseClientId;
    sseClients.push({ id, res });

    // send initial time event
    const now = getBusinessNow();
    res.write(`event: time\n`);
    res.write(`data: ${JSON.stringify({ now: now.toISOString() })}\n\n`);

    req.on('close', () => {
      const idx = sseClients.findIndex(c => c.id === id);
      if (idx >= 0) sseClients.splice(idx, 1);
    });
  });

  // periodic time broadcasts to keep clients in sync (every 15s)
  setInterval(() => {
    const now = getBusinessNow();
    broadcastEvent('time', { now: now.toISOString() });
  }, 15_000);
  app.get("/api/clients", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });
  
  // Delete file from Supabase bucket and clear DB references
  app.post("/api/storage/delete", express.json(), async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode deletar arquivos." });
      }

      const { publicUrl, path: filePath } = req.body as { publicUrl?: string; path?: string };
      if (!publicUrl && !filePath) {
        return res.status(400).json({ message: "É necessário informar 'publicUrl' ou 'path'" });
      }

      let targetPath = filePath;
      if (!targetPath && publicUrl) {
        try {
          const url = new URL(publicUrl);
          // Try to extract path after '/object/public/<bucket>/'
          const marker = `/object/public/${process.env.SUPABASE_BUCKET}/`;
          const idx = url.pathname.indexOf(marker);
          if (idx >= 0) {
            targetPath = url.pathname.substring(idx + marker.length);
          } else {
            // fallback: find bucket segment and take what follows
            const parts = url.pathname.split('/').filter(Boolean);
            const bucketIndex = parts.indexOf(process.env.SUPABASE_BUCKET || "");
            if (bucketIndex >= 0) {
              targetPath = parts.slice(bucketIndex + 1).join('/');
            } else {
              // as last resort, take everything after the last '/'
              targetPath = url.pathname.split('/').pop() || undefined;
            }
          }
        } catch (err) {
          return res.status(400).json({ message: "URL inválida" });
        }
      }

      if (!targetPath) return res.status(400).json({ message: "Não foi possível determinar o caminho do arquivo" });

      // Remove from Supabase
      await deleteFileFromSupabase(targetPath);

      // Clear DB references where the exact publicUrl is stored
      if (publicUrl) {
        await db.update(users).set({ profileImageBase64: null, profileImageMimeType: null }).where(eq(users.profileImageBase64, publicUrl));
        await db.update(services).set({ imageUrl: null, imageDataBase64: null, imageMimeType: null }).where(eq(services.imageUrl, publicUrl));
        await db.update(banner).set({ backgroundImage: null, backgroundImageDataBase64: null, backgroundImageMimeType: null }).where(eq(banner.backgroundImage, publicUrl));
        await db.update(siteConfig).set({ logoUrl: null }).where(eq(siteConfig.logoUrl, publicUrl));
        await db.update(siteConfig).set({ appointmentBackgroundImageBase64: null, appointmentBackgroundImageMimeType: null }).where(eq(siteConfig.appointmentBackgroundImageBase64, publicUrl));
        await db.update(professionals).set({ photoBase64: null, photoMimeType: null }).where(eq(professionals.photoBase64, publicUrl));
      }

      res.json({ message: "Arquivo removido do bucket e referências limpas" });
    } catch (error) {
      console.error("Erro ao deletar arquivo do bucket:", error);
      res.status(500).json({ message: "Erro ao deletar arquivo", error: error instanceof Error ? error.message : String(error) });
    }
  });
  
  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      // Only allow authenticated users
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de cliente inválido" });
      }
      
      const client = await storage.getClientById(id);
      
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar cliente" });
    }
  });
  
  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      // Only allow authenticated users
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const { name, phone, email } = req.body;
      
      if (!name || !phone) {
        return res.status(400).json({ message: "Nome e telefone são obrigatórios" });
      }
      
      const client = await storage.createClient({ name, phone, email });
      res.status(201).json(client);
    } catch (error: any) {
      console.error("[CREATE CLIENT ERROR]", error?.message || error);
      const msg = error?.message || "";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return res.status(400).json({ message: "Já existe um cliente com este e-mail" });
      }
      res.status(500).json({ message: "Erro ao criar cliente: " + (error?.message || "desconhecido") });
    }
  });
  
  app.patch("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      // Only allow authenticated users
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de cliente inválido" });
      }
      
      const { name, phone, email } = req.body;
      const client = await storage.updateClient(id, { name, phone, email });
      
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar cliente" });
    }
  });
  
  app.delete("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      // Only allow authenticated users
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de cliente inválido" });
      }
      
      const success = await storage.deleteClient(id);
      
      if (!success) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir cliente" });
    }
  });
  
  // === Categories ===
  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar categorias" });
    }
  });
  
  // === Services ===
  app.get("/api/services/all", async (req: Request, res: Response) => {
    try {
      const services = await storage.getServices();
      // Normalize to array just in case storage returns an unexpected shape
      if (Array.isArray(services)) return res.json(services);
      if (services && typeof services === 'object') return res.json(Object.values(services));
      return res.json([]);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar serviços" });
    }
  });
  
  app.get("/api/services/featured", async (req: Request, res: Response) => {
    try {
      const services = await storage.getFeaturedServices();
      if (Array.isArray(services)) return res.json(services);
      if (services && typeof services === 'object') return res.json(Object.values(services));
      return res.json([]);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar serviços em destaque" });
    }
  });
  
  app.get("/api/services/:categoryId", async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "ID de categoria inválido" });
      }
      
      const services = await storage.getServicesByCategory(categoryId);
      if (Array.isArray(services)) return res.json(services);
      if (services && typeof services === 'object') return res.json(Object.values(services));
      return res.json([]);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar serviços por categoria" });
    }
  });

  // Upload image for service
  app.post("/api/services/:id/upload-image", upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode fazer upload de imagens." });
      }

      const serviceId = parseInt(req.params.id);
      if (isNaN(serviceId)) {
        return res.status(400).json({ message: "ID de serviço inválido" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nenhuma imagem foi enviada" });
      }

      const imageBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;
      const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
      const uploadPath = `services/service-${serviceId}-${Date.now()}${ext}`;
      const publicUrl = await uploadFileToSupabase(uploadPath, imageBuffer, mimeType);

      const updatedService = await storage.updateServiceImage(serviceId, publicUrl);
      
      if (!updatedService) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      res.json({
        message: "Imagem salva com sucesso no banco de dados",
        service: updatedService,
        imageUrl: updatedService.imageUrl || publicUrl
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao fazer upload da imagem" });
    }
  });

  // === Service Management (Admin Only) ===
  app.post("/api/admin/services", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode criar serviços." });
      }

      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(serviceData);
      
      res.status(201).json({
        message: "Serviço criado com sucesso",
        service
      });
    } catch (error) {
      
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados do serviço inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar serviço" });
      }
    }
  });

  app.delete("/api/admin/services/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode remover serviços." });
      }

      const id = parseInt(req.params.id);
      const deleted = await storage.deleteService(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      res.json({ message: "Serviço removido com sucesso" });
    } catch (error) {
      
      res.status(500).json({ message: "Erro ao remover serviço" });
    }
  });

  app.patch("/api/admin/services/:id/featured", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode alterar destaque de serviços." });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de serviço inválido" });
      }

      const { featured } = req.body;
      if (typeof featured !== 'boolean') {
        return res.status(400).json({ message: "O campo featured deve ser um valor booleano" });
      }

      const updated = await storage.updateServiceFeatured(id, featured);
      
      if (!updated) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      res.json({ message: "Status de destaque atualizado com sucesso" });
    } catch (error) {
      
      res.status(500).json({ message: "Erro ao atualizar status de destaque" });
    }
  });

  app.put("/api/admin/services/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode editar serviços." });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de serviço inválido" });
      }

      const validatedData = insertServiceSchema.parse(req.body);
      const updated = await storage.updateService(id, validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      res.json({ message: "Serviço atualizado com sucesso", service: updated });
    } catch (error) {
      
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados do serviço inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar serviço" });
      }
    }
  });

  // === Category Management (Admin Only) ===
  app.post("/api/admin/categories", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode criar categorias." });
      }

      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      
      res.status(201).json({
        message: "Categoria criada com sucesso",
        category
      });
    } catch (error) {
      
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados da categoria inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar categoria" });
      }
    }
  });

  app.put("/api/admin/categories/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode editar categorias." });
      }

      const id = parseInt(req.params.id);
      const categoryData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, categoryData);
      
      if (!category) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }

      res.json({
        message: "Categoria atualizada com sucesso",
        category
      });
    } catch (error) {
      
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados da categoria inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar categoria" });
      }
    }
  });

  app.delete("/api/admin/categories/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode remover categorias." });
      }

      const id = parseInt(req.params.id);
      
      // Check if there are services or price items in this category
      const services = await storage.getServicesByCategory(id);
      const priceItems = await storage.getPriceItemsByCategory(id);
      
      const deleted = await storage.deleteCategory(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }

      const deletedCount = services.length + priceItems.length;
      res.json({ 
        message: `Categoria removida com sucesso. ${deletedCount} itens relacionados também foram removidos.`,
        deletedServices: services.length,
        deletedPriceItems: priceItems.length
      });
    } catch (error) {
      
      res.status(500).json({ message: "Erro ao remover categoria" });
    }
  });
  
  // === Price Items ===
  app.get("/api/prices", async (req: Request, res: Response) => {
    try {
      const priceItems = await storage.getPriceItems();
      res.json(priceItems);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar itens de preço" });
    }
  });
  
  app.get("/api/prices/:categoryId", async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "ID de categoria inválido" });
      }
      
      const priceItems = await storage.getPriceItemsByCategory(categoryId);
      res.json(priceItems);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar itens de preço por categoria" });
    }
  });

  // === Price Management (Admin Only) ===
  app.post("/api/admin/prices", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode criar preços." });
      }

      const priceData = insertPriceItemSchema.parse(req.body);
      const priceItem = await storage.createPriceItem(priceData);
      
      res.status(201).json({
        message: "Item de preço criado com sucesso",
        priceItem
      });
    } catch (error) {
      
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados do preço inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar item de preço" });
      }
    }
  });

  app.put("/api/admin/prices/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode editar preços." });
      }

      const id = parseInt(req.params.id);
      const priceData = insertPriceItemSchema.partial().parse(req.body);
      const updatedPriceItem = await storage.updatePriceItem(id, priceData);
      
      if (!updatedPriceItem) {
        return res.status(404).json({ message: "Item de preço não encontrado" });
      }

      res.json({
        message: "Item de preço atualizado com sucesso",
        priceItem: updatedPriceItem
      });
    } catch (error) {
      
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados do preço inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar item de preço" });
      }
    }
  });

  app.delete("/api/admin/prices/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode remover preços." });
      }

      const id = parseInt(req.params.id);
      const deleted = await storage.deletePriceItem(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Item de preço não encontrado" });
      }

      res.json({ message: "Item de preço removido com sucesso" });
    } catch (error) {
      
      res.status(500).json({ message: "Erro ao remover item de preço" });
    }
  });
  
  // === Appointments ===
  // Nova rota para buscar horários disponíveis
  app.get("/api/appointments/available-times/:date", async (req: Request, res: Response) => {
    try {
      const date = req.params.date;
      const professionalId = req.query.professionalId ? parseInt(req.query.professionalId as string) : null;
      
      // Buscar dados do profissional selecionado (intervalo e horário de almoço)
      let interval = 40;
      let lunchBreakStart: string | null = null;
      let lunchBreakEnd: string | null = null;
      if (professionalId) {
        const prof = await storage.getProfessionalById(professionalId);
        if (prof?.appointmentInterval) interval = prof.appointmentInterval;
        if (prof?.lunchBreakStart) lunchBreakStart = prof.lunchBreakStart;
        if (prof?.lunchBreakEnd) lunchBreakEnd = prof.lunchBreakEnd;
      }

      // Gerar todos os horários possíveis com o intervalo do profissional
      const generateTimeSlots = (intervalMin: number) => {
        const slots = [];
        const startTime = 8 * 60; // 08:00
        const endTime = 19 * 60;  // 19:00
        for (let time = startTime; time < endTime; time += intervalMin) {
          const hour = Math.floor(time / 60);
          const minute = time % 60;
          slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
        }
        return slots;
      };

      const allTimeSlots = generateTimeSlots(interval);
      
      // Buscar agendamentos existentes para a data (filtrados por profissional se informado)
      const existingAppointments = await storage.getAppointments();
      const bookedTimes = existingAppointments
        .filter(appointment => 
          appointment.date === date && 
          (appointment.status === 'pending' || appointment.status === 'confirmed') &&
          (professionalId === null || appointment.professionalId === professionalId)
        )
        .map(appointment => appointment.time);
      
      // Buscar todos os bloqueios para a data (pode haver bloqueios parciais)
      const dateBlocks = await storage.getBlocksForDate(date, professionalId);
      const fullDayBlock = dateBlocks.find(b => !b.startTime || !b.endTime);

      const [year, month, day] = date.split('-').map(Number);
      const brasiliaTZ = getBusinessNow();
      const selectedDateOnly = new Date(year, month - 1, day, 0, 0, 0);
      const todayOnly = new Date(brasiliaTZ.getFullYear(), brasiliaTZ.getMonth(), brasiliaTZ.getDate(), 0, 0, 0);
      const isSelectedDateInPast = selectedDateOnly < todayOnly;
      const isSelectedDateToday = selectedDateOnly.getTime() === todayOnly.getTime();
      const nowMinutes = brasiliaTZ.getHours() * 60 + brasiliaTZ.getMinutes();

      const timeSlots = allTimeSlots.map(time => {
        const [hour, minute] = time.split(':').map(Number);
        const slotMinutes = hour * 60 + minute;

        // Datas anteriores: todos os horários são "past"
        if (isSelectedDateInPast) {
          return { time, available: false, status: 'past' };
        }
        
        // Data de hoje: só marca como "past" se a hora já tiver passado
        if (isSelectedDateToday && slotMinutes < nowMinutes) {
          return { time, available: false, status: 'past' };
        }

        if (bookedTimes.includes(time)) {
          return { time, available: false, status: 'occupied' };
        }
        // Verificar horário de almoço da profissional
        if (lunchBreakStart && lunchBreakEnd && time >= lunchBreakStart && time < lunchBreakEnd) {
          return { time, available: false, status: 'lunch' };
        }
        const blockingBlock = dateBlocks.find(b => {
          if (!b.startTime || !b.endTime) return true; // bloqueio de dia inteiro
          return time >= b.startTime && time < b.endTime; // bloqueio parcial
        });
        return {
          time,
          available: !blockingBlock,
          status: blockingBlock ? 'blocked' : 'available'
        };
      });

      res.json({
        timeSlots,
        blocked: !!fullDayBlock,
        blockReason: fullDayBlock?.reason,
        blockDescription: fullDayBlock?.description ?? undefined
      });
    } catch (error) {
      
      res.status(500).json({ message: "Erro ao buscar horários disponíveis" });
    }
  });

  app.post("/api/appointments", async (req: Request, res: Response) => {
    try {
      // Verificar se o usuário está autenticado
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "É necessário estar logado para agendar um horário" });
      }

      const appointmentData = insertAppointmentSchema.parse(req.body);

      // Validar data/hora em relação ao horário de negócio (Brasília)
      const brasiliaTZ = getBusinessNow();
      const [year, month, day] = appointmentData.date.split('-').map(Number);

      const selectedDateOnly = new Date(year, month - 1, day, 0, 0, 0);
      const todayOnly = new Date(brasiliaTZ.getFullYear(), brasiliaTZ.getMonth(), brasiliaTZ.getDate(), 0, 0, 0);

      // Datas anteriores não podem ser agendadas
      if (selectedDateOnly < todayOnly) {
        return res.status(409).json({ message: "Este horário já passou e não pode ser agendado." });
      }

      // Se for hoje, validar horário (minutos) contra agora em Brasília
      const isSelectedDateToday = selectedDateOnly.getTime() === todayOnly.getTime();
      if (isSelectedDateToday) {
        const [hour, minute] = appointmentData.time.split(':').map(Number);
        const slotMinutes = hour * 60 + minute;
        const nowMinutes = brasiliaTZ.getHours() * 60 + brasiliaTZ.getMinutes();
        if (slotMinutes <= nowMinutes) {
          return res.status(409).json({ message: "Este horário já passou e não pode ser agendado." });
        }
      }

      // Verificar se a data/horário está bloqueado (incluindo bloqueios parciais)
      const blockStatus = await storage.isDateBlocked(appointmentData.date, appointmentData.professionalId ?? null, appointmentData.time);
      if (blockStatus.blocked) {
        return res.status(409).json({
          message: `Este horário está bloqueado: ${blockStatus.reason}. ${blockStatus.description ?? ''}`.trim()
        });
      }
      
      // Verificar se já existe um agendamento no mesmo horário (considerando profissional)
      const existingAppointments = await storage.getAppointments();
      const conflictingAppointment = existingAppointments.find(existing => 
        existing.date === appointmentData.date && 
        existing.time === appointmentData.time &&
        (existing.status === 'pending' || existing.status === 'confirmed') &&
        (
          appointmentData.professionalId == null ||
          existing.professionalId == null ||
          existing.professionalId === appointmentData.professionalId
        )
      );
      
      if (conflictingAppointment) {
        return res.status(409).json({ 
          message: "Este horário já está ocupado. Por favor, escolha outro horário disponível."
        });
      }
      
      const appointment = await storage.createAppointment(appointmentData);
      
      // Notify SSE clients to refresh available times for the appointment date
      try {
        broadcastEvent('refresh', { date: appointment.date, professionalId: appointment.professionalId ?? null });
      } catch (err) {
        console.warn('Failed to broadcast appointment creation', err);
      }

      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados de agendamento inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar agendamento" });
      }
    }
  });

  // Rota de teste interna (SEM autenticação) para reproduzir validação de agendamentos
  app.post("/api/_test/create-appointment", async (req: Request, res: Response) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);

      // Reaproveita a mesma validação de timezone/horário
      const brasiliaTZ = getBusinessNow();
      const [year, month, day] = appointmentData.date.split('-').map(Number);
      const selectedDateOnly = new Date(year, month - 1, day, 0, 0, 0);
      const todayOnly = new Date(brasiliaTZ.getFullYear(), brasiliaTZ.getMonth(), brasiliaTZ.getDate(), 0, 0, 0);

      if (selectedDateOnly < todayOnly) {
        return res.status(409).json({ message: "Este horário já passou e não pode ser agendado." });
      }

      const isSelectedDateToday = selectedDateOnly.getTime() === todayOnly.getTime();
      if (isSelectedDateToday) {
        const [hour, minute] = appointmentData.time.split(':').map(Number);
        const slotMinutes = hour * 60 + minute;
        const nowMinutes = brasiliaTZ.getHours() * 60 + brasiliaTZ.getMinutes();
        if (slotMinutes <= nowMinutes) {
          return res.status(409).json({ message: "Este horário já passou e não pode ser agendado." });
        }
      }

      // Simula criação (sem persistir)
      // Notify SSE clients (test route) so frontend can refresh
      try {
        broadcastEvent('refresh', { date: appointmentData.date, professionalId: appointmentData.professionalId ?? null });
      } catch {}
      return res.status(201).json({ message: 'ok', appointment: appointmentData });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: err.errors });
      }
      return res.status(500).json({ message: 'Erro interno' });
    }
  });
  
  app.get("/api/appointments", async (req: Request, res: Response) => {
    try {
      // Verificar se o usuário está autenticado e é admin
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const appointments = await storage.getAppointments();
      
      res.json(appointments);
    } catch (error) {
      
      res.status(500).json({ message: "Erro ao buscar agendamentos" });
    }
  });


  app.get("/api/my-appointments", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user as any;
      const allAppointments = await storage.getAppointments();
      

      const userAppointments = allAppointments.filter(appointment => 
        appointment.email === user.username
      );
      
      
      res.json(userAppointments);
    } catch (error) {
      
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  app.patch("/api/appointments/:id/status", async (req: Request, res: Response) => {
    try {
      // Only allow authenticated users
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (isNaN(id) || !status) {
        return res.status(400).json({ message: "Dados da requisição inválidos" });
      }


      const originalAppointment = await storage.getAppointmentById(id);
      
      if (!originalAppointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }


      const appointment = await storage.updateAppointmentStatus(id, status);
      
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }



      
      res.json(appointment);
    } catch (error) {
      
      res.status(500).json({ message: "Error updating appointment status" });
    }
  });
  

  app.get("/api/reviews", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getReviews();
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reviews" });
    }
  });
  
  app.post("/api/reviews", async (req: Request, res: Response) => {
    try {
      // Verificar se o usuário está autenticado
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "É necessário estar logado para enviar avaliações" });
      }
      
      // Se o nome do cliente não for fornecido, usar o nome do usuário logado
      if (!req.body.clientName && req.user) {
        req.body.clientName = req.user.name || req.user.username;
      }
      
      // Validar os dados da avaliação
      const reviewData = insertReviewSchema.parse(req.body);
      
      // Adicionar userId se o usuário está autenticado
      const reviewWithUser = {
        ...reviewData,
        userId: req.user?.id || null
      };
      
      // Criar a avaliação
      const review = await storage.createReview(reviewWithUser);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados de avaliação inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar avaliação" });
      }
    }
  });
  
  // Rota para dar/remover like (coração ou joinha) em uma avaliação
  app.post("/api/reviews/:id/like/:likeType", async (req: Request, res: Response) => {
    try {
      const reviewId = parseInt(req.params.id);
      const likeType = req.params.likeType as 'heart' | 'thumbs';
      
      // Verificar se o tipo de like é válido
      if (likeType !== 'heart' && likeType !== 'thumbs') {
        return res.status(400).json({ message: "Tipo de like inválido" });
      }
      
      // Verificar se o usuário está autenticado
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "É necessário estar logado para curtir avaliações" });
      }
      
      const result = await storage.toggleLikeReview(reviewId, req.user.id, likeType);
      
      if (!result) {
        return res.status(404).json({ message: "Avaliação não encontrada" });
      }
      
      res.status(200).json({
        review: result.review,
        userLiked: result.userLiked
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao processar like na avaliação" });
    }
  });

  // Rota para obter os likes do usuário
  app.get("/api/user/likes", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "É necessário estar logado" });
      }
      
      const userLikes = await storage.getUserLikes(req.user.id);
      res.status(200).json(userLikes);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar likes do usuário" });
    }
  });

  // === Review Comments ===
  app.get("/api/reviews/:reviewId/comments", async (req: Request, res: Response) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      if (isNaN(reviewId)) {
        return res.status(400).json({ message: "ID da avaliação inválido" });
      }

      const comments = await storage.getReviewComments(reviewId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar comentários" });
    }
  });

  app.post("/api/reviews/:reviewId/comments", async (req: Request, res: Response) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      if (isNaN(reviewId)) {
        return res.status(400).json({ message: "ID da avaliação inválido" });
      }

      // Verificar se o usuário está autenticado
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "É necessário estar logado para comentar" });
      }

      // Validar dados do comentário
      const { comment } = req.body;
      if (!comment || comment.trim().length === 0) {
        return res.status(400).json({ message: "Comentário não pode estar vazio" });
      }

      // Criar comentário
      const newComment = await storage.createReviewComment({
        reviewId,
        comment: comment.trim(),
        userId: req.user.id,
        userName: req.user.name || req.user.username
      });

      res.status(201).json(newComment);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar comentário" });
    }
  });

  app.post("/api/comments/:commentId/like/:likeType", async (req: Request, res: Response) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const likeType = req.params.likeType as 'heart' | 'thumbs';
      
      if (isNaN(commentId)) {
        return res.status(400).json({ message: "ID do comentário inválido" });
      }

      if (!['heart', 'thumbs'].includes(likeType)) {
        return res.status(400).json({ message: "Tipo de like inválido" });
      }

      // Verificar se o usuário está autenticado
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "É necessário estar logado para curtir comentários" });
      }
      
      const result = await storage.toggleLikeComment(commentId, req.user.id, likeType);

      if (!result) {
        return res.status(404).json({ message: "Comentário não encontrado" });
      }

      res.status(200).json({
        comment: result.comment,
        userLiked: result.userLiked,
        likeType
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao processar like no comentário" });
    }
  });

  app.get("/api/user/comment-likes", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "É necessário estar logado" });
      }

      const userCommentLikes = await storage.getUserCommentLikes(req.user.id);
      res.status(200).json(userCommentLikes);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar likes de comentários do usuário" });
    }
  });
  
  // === Admin Users Management ===
  app.get("/api/admin/users", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || (!req.user?.isMaster && !req.user?.isAdmin)) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const users = await storage.getUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  app.post("/api/admin/users", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || (!req.user?.isMaster && !req.user?.isAdmin)) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const { username, password, name, phone, isAdmin } = req.body;
      
      // Verifica se o usuário já existe
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Usuário já existe" });
      }
      
      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        phone,
        isAdmin: isAdmin || false
      });
      
      // Remove password from response
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  app.patch("/api/admin/users/:id/master", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID de usuário inválido" });
      if (req.user?.id === id) return res.status(400).json({ message: "Não é possível alterar seu próprio status master" });
      const { isMaster } = req.body;
      if (typeof isMaster !== "boolean") return res.status(400).json({ message: "O campo isMaster deve ser booleano" });
      // Only a senior master (lower ID = created first) can demote another master
      const targetUser = await storage.getUser(id);
      if (targetUser?.isMaster && !isMaster && req.user!.id > id) {
        return res.status(403).json({ message: "Você não pode remover o acesso Master de um usuário mais antigo que você." });
      }
      const updated = await storage.updateUser(id, { isMaster });
      if (!updated) return res.status(404).json({ message: "Usuário não encontrado" });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar status master" });
    }
  });

  app.delete("/api/admin/users/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || (!req.user?.isMaster && !req.user?.isAdmin)) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      // Prevent deleting own account
      if (req.user?.id === id) {
        return res.status(400).json({ message: "Não é possível excluir sua própria conta" });
      }

      // Prevent deleting master users (must demote first)
      const targetUser = await storage.getUser(id);
      if (targetUser?.isMaster) {
        return res.status(403).json({ message: "Usuários Master não podem ser excluídos. Remova o acesso Master primeiro." });
      }
      
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });

  // === Sales ===
  app.post("/api/sales", async (req: Request, res: Response) => {
    try {
      // Only allow authenticated users
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const saleData = insertSaleSchema.parse(req.body);
      const sale = await storage.createSale(saleData);
      res.status(201).json(sale);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados de venda inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar venda" });
      }
    }
  });
  
  app.get("/api/sales", async (req: Request, res: Response) => {
    try {
      // Only allow authenticated users
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const sales = await storage.getSales();
      res.json(sales);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar vendas" });
    }
  });
  
  app.patch("/api/sales/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID de venda inválido" });
      const sale = await storage.updateSale(id, req.body);
      if (!sale) return res.status(404).json({ message: "Venda não encontrada" });
      res.json(sale);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar venda" });
    }
  });

  app.patch("/api/sales/:id/cancel", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID de venda inválido" });
      const { reason } = req.body;
      const sale = await storage.cancelSale(id, reason);
      if (!sale) return res.status(404).json({ message: "Venda não encontrada" });
      res.json(sale);
    } catch (error) {
      res.status(500).json({ message: "Erro ao cancelar venda" });
    }
  });

  app.get("/api/sales/filter", async (req: Request, res: Response) => {
    try {
      // Only allow authenticated users
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Data de início e data de fim são obrigatórias" });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Formato de data inválido" });
      }
      
      const sales = await storage.getSalesByDate(start, end);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar vendas filtradas" });
    }
  });

  // === Professional Portal ===
  app.get("/api/professional/me", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Não autenticado" });
    try {
      const prof = await storage.getProfessionalByUserId(req.user!.id);
      if (!prof) return res.status(404).json({ message: "Nenhum profissional vinculado a este usuário" });
      res.json(prof);
    } catch { res.status(500).json({ message: "Erro interno" }); }
  });

  app.get("/api/professional/unseen-count", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.json({ count: 0, isProfessional: false });
    try {
      const prof = await storage.getProfessionalByUserId(req.user!.id);
      if (!prof) return res.json({ count: 0, isProfessional: false });
      const count = await storage.getUnseenCountForProfessional(prof.id);
      res.json({ count, isProfessional: true });
    } catch { res.json({ count: 0, isProfessional: false }); }
  });

  app.get("/api/professional/appointments", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Não autenticado" });
    try {
      const prof = await storage.getProfessionalByUserId(req.user!.id);
      if (!prof) return res.status(404).json({ message: "Profissional não encontrado" });
      const appts = await storage.getAppointmentsByProfessionalId(prof.id);
      res.json(appts);
    } catch { res.status(500).json({ message: "Erro interno" }); }
  });

  app.post("/api/professional/appointments/mark-seen", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Não autenticado" });
    try {
      const prof = await storage.getProfessionalByUserId(req.user!.id);
      if (!prof) return res.status(404).json({ message: "Profissional não encontrado" });
      await storage.markAppointmentsSeenByProfessional(prof.id);
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Erro interno" }); }
  });

  // === Password Reset Routes ===
  app.post("/api/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email é obrigatório" });
      }
      
      // Verificar se o usuário existe
      const user = await storage.getUserByUsername(email);
      
      if (!user) {
        // Por segurança, não informamos se o email existe ou não
        return res.status(200).json({ message: "Se o email estiver cadastrado, você receberá um link de recuperação" });
      }
      
      // Gerar token de recuperação
      const resetToken = await generatePasswordResetToken(user.id);
      
      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0].trim()}`
        : 'http://localhost:5000';
      const resetLink = `${baseUrl}/reset-password/${resetToken}`;
      
      res.status(200).json({ resetLink });
    } catch (error) {
      
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/reset-password/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ message: "Token é obrigatório" });
      }
      
      const userId = await verifyPasswordResetToken(token);
      const valid = userId !== null;
      res.status(200).json({ valid });
    } catch (error) {
      res.status(500).json({ message: "Erro ao verificar token" });
    }
  });

  app.post("/api/reset-password/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token e senha são obrigatórios" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "Senha deve ter no mínimo 6 caracteres" });
      }
      
      const userId = await verifyPasswordResetToken(token);
      if (!userId) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }
      
      // Hash da nova senha
      const hashedPassword = await hashPassword(password);
      
      // Atualizar senha do usuário
      const user = await storage.updateUserPassword(userId, hashedPassword);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Remover token usado
      await removePasswordResetToken(token);
      
      res.status(200).json({ message: "Senha redefinida com sucesso" });
    } catch (error) {
      
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === Banner Management ===
  app.get("/api/banner", async (req: Request, res: Response) => {
    try {
      const banner = await storage.getBanner();
      res.json(banner);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar configuração do banner" });
    }
  });

  app.put("/api/banner", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode editar o banner." });
      }

      const bannerData = insertBannerSchema.parse(req.body);
      const banner = await storage.updateBanner(bannerData);
      
      res.json({
        message: "Banner atualizado com sucesso",
        banner
      });
    } catch (error) {
      
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados do banner inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar banner" });
      }
    }
  });

  // Upload background image for banner
  app.post("/api/banner/upload-image", upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode fazer upload de imagens." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nenhuma imagem foi enviada" });
      }

      // Read the file and convert to base64
      const imageBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;
      const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
      const uploadPath = `banner/background-${Date.now()}${ext}`;
      const publicUrl = await uploadFileToSupabase(uploadPath, imageBuffer, mimeType);
      
      const currentBanner = await storage.getBanner();
      const updatedBanner = await storage.updateBanner({
        title: currentBanner?.title || "Bem-vindo",
        subtitle: currentBanner?.subtitle || "Descubra nossos serviços",
        ctaText: currentBanner?.ctaText || "Agendar",
        ctaLink: currentBanner?.ctaLink || "/",
        backgroundImage: publicUrl,
        backgroundImageDataBase64: null,
        backgroundImageMimeType: null,
        isActive: currentBanner?.isActive ?? true,
      });

      res.json({
        message: "Imagem de fundo do banner salva no banco de dados",
        banner: updatedBanner,
        imageUrl: updatedBanner.backgroundImage || publicUrl
      });
    } catch (error) {
      console.error("Erro no upload do banner:", error);
      res.status(500).json({ message: "Erro ao fazer upload da imagem do banner", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // === Footer Management ===
  app.get("/api/footer", async (req: Request, res: Response) => {
    try {
      const footer = await storage.getFooter();
      res.json(footer);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar configuração do rodapé" });
    }
  });

  app.put("/api/footer", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode editar o rodapé." });
      }

      const footerData = insertFooterSchema.parse(req.body);
      const footer = await storage.updateFooter(footerData);
      
      res.json({
        message: "Rodapé atualizado com sucesso",
        footer
      });
    } catch (error) {
      console.error("Erro ao atualizar rodapé:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados do rodapé inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar rodapé" });
      }
    }
  });

  // === Site Configuration ===
  app.get("/api/site-config", async (req: Request, res: Response) => {
    try {
      const config = await storage.getSiteConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar configuração do site" });
    }
  });

  app.put("/api/site-config", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      if (!req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode editar as configurações do site." });
      }

      const existingConfig = await storage.getSiteConfig();
      const configData = insertSiteConfigSchema.parse({
        siteName: req.body.siteName ?? existingConfig?.siteName ?? "",
        siteSlogan: req.body.siteSlogan ?? existingConfig?.siteSlogan ?? "",
        logoUrl: req.body.logoUrl ?? existingConfig?.logoUrl ?? null,
        primaryColor: req.body.primaryColor ?? existingConfig?.primaryColor ?? "#3b82f6",
        appointmentBackgroundImageBase64: req.body.appointmentBackgroundImageBase64 ?? existingConfig?.appointmentBackgroundImageBase64 ?? null,
        appointmentBackgroundImageMimeType: req.body.appointmentBackgroundImageMimeType ?? existingConfig?.appointmentBackgroundImageMimeType ?? null,
        pixKey: req.body.pixKey ?? existingConfig?.pixKey ?? "",
        pixBeneficiaryName: req.body.pixBeneficiaryName ?? existingConfig?.pixBeneficiaryName ?? "",
        pixCity: req.body.pixCity ?? existingConfig?.pixCity ?? "",
      });

      const config = await storage.updateSiteConfig(configData);
      
      res.json({
        message: "Configuração do site atualizada com sucesso",
        config
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar site-config:", error);
      
      if (error instanceof ZodError) {
        console.error("🔴 Erro de validação Zod:", error.errors);
        res.status(400).json({ 
          message: "Dados da configuração inválidos", 
          errors: error.errors 
        });
      } else {
        console.error("🔴 Erro desconhecido:", error instanceof Error ? error.message : String(error));
        res.status(500).json({ message: "Erro ao atualizar configuração do site" });
      }
    }
  });

  app.post("/api/site-config/upload-logo", upload.single('logo'), async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode fazer upload da logo." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nenhuma imagem foi enviada" });
      }

      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;
      const ext = path.extname(req.file.originalname).toLowerCase() || ".png";
      const uploadPath = `logo/logo-${Date.now()}${ext}`;
      const publicUrl = await uploadFileToSupabase(uploadPath, fileBuffer, mimeType);
      
      const currentConfig = await storage.getSiteConfig();
      const updatedConfig = currentConfig
        ? await storage.updateSiteLogo(publicUrl)
        : await storage.updateSiteConfig({
            siteName: "",
            siteSlogan: "",
            logoUrl: publicUrl,
            primaryColor: "#3b82f6",
            appointmentBackgroundImageBase64: null,
            appointmentBackgroundImageMimeType: null,
            pixKey: "",
            pixBeneficiaryName: "",
            pixCity: "",
          });

      res.json({
        message: "Logo do site atualizada com sucesso",
        config: updatedConfig,
        logoUrl: publicUrl
      });
    } catch (error) {
      console.error("Erro no upload da logo:", error);
      res.status(500).json({ message: "Erro ao fazer upload da logo", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Upload appointment section background image
  app.post("/api/site-config/upload-appointment-background", upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isMaster) {
        return res.status(403).json({ message: "Acesso negado. Apenas o master pode fazer upload." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nenhuma imagem foi enviada" });
      }

      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;
      const ext = path.extname(req.file.originalname).toLowerCase() || ".png";
      const uploadPath = `appointment-backgrounds/appointment-${Date.now()}${ext}`;
      const publicUrl = await uploadFileToSupabase(uploadPath, fileBuffer, mimeType);
      
      const config = await storage.getSiteConfig();
      const updatedConfig = await storage.updateSiteConfig({
        siteName: config?.siteName || "",
        siteSlogan: config?.siteSlogan || "",
        logoUrl: config?.logoUrl || null,
        primaryColor: config?.primaryColor || "#3b82f6",
        appointmentBackgroundImageBase64: publicUrl,
        appointmentBackgroundImageMimeType: mimeType,
        pixKey: config?.pixKey || "",
        pixBeneficiaryName: config?.pixBeneficiaryName || "",
        pixCity: config?.pixCity || "",
      });

      res.json({
        message: "Imagem de fundo de agendamento atualizada com sucesso",
        config: updatedConfig,
      });
    } catch (error) {
      console.error("Erro no upload de fundo de agendamento:", error);
      res.status(500).json({ message: "Erro ao fazer upload da imagem de fundo", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // === Professionals ===
  app.get("/api/professionals", async (req: Request, res: Response) => {
    try {
      const list = await storage.getProfessionals();
      res.json(list);
    } catch {
      res.status(500).json({ message: "Erro ao buscar profissionais" });
    }
  });

  app.get("/api/professionals/category/:categoryId", async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const list = await storage.getProfessionalsByCategory(categoryId);
      res.json(list);
    } catch {
      res.status(500).json({ message: "Erro ao buscar profissionais da categoria" });
    }
  });

  app.post("/api/admin/professionals", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const data = insertProfessionalSchema.parse(req.body);
      const professional = await storage.createProfessional(data);
      res.status(201).json(professional);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar profissional" });
      }
    }
  });

  app.put("/api/admin/professionals/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const id = parseInt(req.params.id);
      const data = insertProfessionalSchema.partial().parse(req.body);
      const updated = await storage.updateProfessional(id, data);
      if (!updated) return res.status(404).json({ message: "Profissional não encontrado" });
      res.json(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar profissional" });
      }
    }
  });

  app.patch("/api/admin/professionals/:id/active", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const id = parseInt(req.params.id);
      const { active } = req.body;
      const updated = await storage.updateProfessional(id, { active });
      if (!updated) return res.status(404).json({ message: "Profissional não encontrado" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Erro ao atualizar status" });
    }
  });

  app.delete("/api/admin/professionals/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProfessional(id);
      if (!deleted) return res.status(404).json({ message: "Profissional não encontrado" });
      res.json({ message: "Profissional removido com sucesso" });
    } catch {
      res.status(500).json({ message: "Erro ao remover profissional" });
    }
  });

  app.post("/api/professionals/:id/upload-photo", upload.single("photo"), async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      if (!req.file) return res.status(400).json({ message: "Nenhuma foto enviada" });
      const id = parseInt(req.params.id);
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;
      const ext = path.extname(req.file.originalname).toLowerCase() || ".png";
      const uploadPath = `professionals/photo-${id}-${Date.now()}${ext}`;
      const publicUrl = await uploadFileToSupabase(uploadPath, fileBuffer, mimeType);
      const updated = await storage.uploadProfessionalPhoto(id, publicUrl, mimeType);
      if (!updated) return res.status(404).json({ message: "Profissional não encontrado" });
      res.json({ message: "Foto enviada com sucesso", professional: updated });
    } catch {
      res.status(500).json({ message: "Erro ao fazer upload da foto" });
    }
  });

  // === Schedule Blocks ===
  app.get("/api/schedule-blocks", async (req: Request, res: Response) => {
    try {
      const blocks = await storage.getScheduleBlocks();
      res.json(blocks);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar bloqueios de agenda" });
    }
  });

  app.post("/api/schedule-blocks", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores podem bloquear a agenda." });
      }
      const { insertScheduleBlockSchema } = await import("@shared/schema");
      const blockData = insertScheduleBlockSchema.parse(req.body);
      const today = getBusinessNow().toISOString().split("T")[0];
      if (blockData.startDate < today) {
        return res.status(400).json({ message: "A data de início não pode ser anterior a hoje." });
      }
      if (blockData.endDate < today) {
        return res.status(400).json({ message: "A data de fim não pode ser anterior a hoje." });
      }
      if (blockData.endDate < blockData.startDate) {
        return res.status(400).json({ message: "A data de fim não pode ser anterior à data de início." });
      }
      const block = await storage.createScheduleBlock(blockData);
      res.status(201).json(block);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar bloqueio de agenda" });
      }
    }
  });

  app.delete("/api/schedule-blocks/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Acesso negado." });
      }
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteScheduleBlock(id);
      if (!deleted) {
        return res.status(404).json({ message: "Bloqueio não encontrado" });
      }
      res.json({ message: "Bloqueio removido com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao remover bloqueio" });
    }
  });

  // === User Profile Image Routes ===
  // Test endpoint for debugging authentication
  app.get("/api/user/test-auth", (req: Request, res: Response) => {
    res.json({
      authenticated: req.isAuthenticated(),
      user: req.user ? { id: req.user.id, username: req.user.username } : null
    });
  });

  // Atualizar telefone/WhatsApp do usuário logado
  app.patch("/api/user/phone", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Não autenticado" });
    const { phone } = req.body;
    if (!phone || String(phone).trim().length < 10) {
      return res.status(400).json({ message: "Número de telefone inválido" });
    }
    try {
      const updated = await storage.updateClient(req.user.id, { phone: String(phone).trim() });
      if (!updated) return res.status(404).json({ message: "Usuário não encontrado" });
      // Atualizar sessão com o novo telefone
      (req.user as any).phone = updated.phone;
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar telefone" });
    }
  });

  // Upload de imagem de perfil do usuário
  app.post("/api/user/upload-profile-image", upload.single('profileImage'), async (req: Request, res: Response) => {
    
    
    
    
    
    
    
    if (req.file) {
      
    }

    if (!req.isAuthenticated()) {
      
      return res.status(401).json({ error: "Login necessário" });
    }

    if (!req.file) {
      
      return res.status(400).json({ error: "Arquivo de imagem necessário" });
    }

    try {
      // Ler o arquivo e converter para base64
      const imageBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;
      const ext = path.extname(req.file.originalname).toLowerCase() || ".png";
      const uploadPath = `profiles/user-${req.user.id}-${Date.now()}${ext}`;
      const publicUrl = await uploadFileToSupabase(uploadPath, imageBuffer, mimeType);

      // Atualizar usuário no banco
      const updatedUser = await storage.updateUserProfileImage(req.user.id, publicUrl, mimeType);

      if (!updatedUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      res.json({ message: "Imagem de perfil atualizada com sucesso", user: updatedUser });
    } catch (error) {
      console.error("Erro no upload de perfil:", error);
      res.status(500).json({ error: "Erro ao fazer upload da imagem de perfil", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/user/profile-image", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Login necessário" });
    }

    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const publicUrl = user.profileImageBase64;
      if (publicUrl && publicUrl.startsWith('http')) {
        try {
          const url = new URL(publicUrl);
          const marker = `/object/public/${process.env.SUPABASE_BUCKET}/`;
          const idx = url.pathname.indexOf(marker);
          const targetPath = idx >= 0
            ? url.pathname.substring(idx + marker.length)
            : url.pathname.split('/').filter(Boolean).slice((url.pathname.split('/').filter(Boolean).indexOf(process.env.SUPABASE_BUCKET || '') + 1)).join('/');
          if (targetPath) {
            await deleteFileFromSupabase(targetPath);
          }
        } catch (error) {
          console.warn("Não foi possível remover arquivo antigo do Supabase", error);
        }
      }

      const updatedUser = await storage.deleteUserProfileImage(req.user.id);
      if (!updatedUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      res.json({ message: "Imagem de perfil removida com sucesso", user: updatedUser });
    } catch (error) {
      console.error("Erro ao remover imagem de perfil:", error);
      res.status(500).json({ error: "Erro ao remover a imagem de perfil", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // === Image Serving Routes ===
  
  // Serve user profile images from database
  app.get("/api/images/user/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);

      if (!user || !user.profileImageBase64) {
        return res.status(404).json({ error: "Imagem de perfil não encontrada" });
      }

      if (user.profileImageBase64.startsWith("http")) {
        return res.redirect(user.profileImageBase64);
      }

      if (user.profileImageBase64.startsWith("data:")) {
        const [, mimeType, base64Data] = user.profileImageBase64.match(/^data:(.+);base64,(.*)$/) || [];
        if (!mimeType || !base64Data) {
          return res.status(400).json({ error: "Formato de imagem inválido" });
        }
        const imageBuffer = Buffer.from(base64Data, 'base64');
        res.set({
          'Content-Type': mimeType,
          'Content-Length': imageBuffer.length.toString(),
          'Cache-Control': 'public, max-age=86400'
        });
        return res.send(imageBuffer);
      }

      const isSelfRoute = user.profileImageBase64 === `/api/images/user/${userId}`;
      if (!isSelfRoute && user.profileImageBase64.startsWith("/")) {
        return res.redirect(user.profileImageBase64);
      }

      if (!user.profileImageMimeType) {
        return res.status(404).json({ error: "Mime type da imagem não encontrado" });
      }

      const imageBuffer = Buffer.from(user.profileImageBase64, 'base64');

      res.set({
        'Content-Type': user.profileImageMimeType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400'
      });

      res.send(imageBuffer);
    } catch (error) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  
  // Serve service images from database
  app.get("/api/images/service/:id", async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.id);
      if (isNaN(serviceId)) {
        return res.status(400).json({ message: "ID de serviço inválido" });
      }

      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Imagem não encontrada" });
      }

      if (service.imageUrl && service.imageUrl.startsWith("http")) {
        return res.redirect(service.imageUrl);
      }

      if (service.imageUrl && service.imageUrl.startsWith("data:")) {
        const [, mimeType, base64Data] = service.imageUrl.match(/^data:(.+);base64,(.*)$/) || [];
        if (!mimeType || !base64Data) {
          return res.status(400).json({ message: "Formato de imagem inválido" });
        }
        const imageBuffer = Buffer.from(base64Data, 'base64');
        res.set('Content-Type', mimeType);
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(imageBuffer);
      }

      const serviceImageSelfRoute = service.imageUrl?.startsWith(`/api/images/service/${serviceId}`);
      if (service.imageUrl && !serviceImageSelfRoute) {
        return res.redirect(service.imageUrl);
      }

      if (!service.imageDataBase64) {
        return res.status(404).json({ message: "Imagem não encontrada" });
      }

      const imageBuffer = Buffer.from(service.imageDataBase64, 'base64');
      
      res.set('Content-Type', service.imageMimeType || 'image/jpeg');
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.send(imageBuffer);
    } catch (error) {
      res.status(500).json({ message: "Erro ao servir imagem" });
    }
  });

  // Serve banner image from database
  app.get("/api/images/banner", async (req: Request, res: Response) => {
    try {
      const banner = await storage.getBanner();
      if (!banner) {
        return res.status(404).json({ message: "Imagem do banner não encontrada" });
      }

      if (banner.backgroundImage && banner.backgroundImage.startsWith("http")) {
        return res.redirect(banner.backgroundImage);
      }

      if (banner.backgroundImage && banner.backgroundImage.startsWith("data:")) {
        const [, mimeType, base64Data] = banner.backgroundImage.match(/^data:(.+);base64,(.*)$/) || [];
        if (!mimeType || !base64Data) {
          return res.status(400).json({ message: "Formato de imagem inválido" });
        }
        const imageBuffer = Buffer.from(base64Data, 'base64');
        res.set('Content-Type', mimeType);
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(imageBuffer);
      }

      const bannerSelfRoute = banner.backgroundImage?.startsWith("/api/images/banner");
      if (banner.backgroundImage && !bannerSelfRoute) {
        return res.redirect(banner.backgroundImage);
      }

      if (!banner.backgroundImageDataBase64) {
        return res.status(404).json({ message: "Imagem do banner não encontrada" });
      }

      const imageBuffer = Buffer.from(banner.backgroundImageDataBase64, 'base64');
      
      res.set('Content-Type', banner.backgroundImageMimeType || 'image/jpeg');
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      res.send(imageBuffer);
    } catch (error) {
      res.status(500).json({ message: "Erro ao servir imagem do banner" });
    }
  });

  // === Regeneração de Imagens ===
  app.post("/api/admin/regenerate-images", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      res.json({ 
        message: "Regeneração de imagens desabilitada para proteger suas imagens personalizadas",
        success: false,
        note: "Suas imagens estão protegidas e não serão removidas"
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao processar regeneração de imagens" });
    }
  });

  // === Mercado Pago & Payment Routes ===

  // Get Mercado Pago public key
  app.get("/api/config/mercadopago-public-key", (_req: Request, res: Response) => {
    try {
      const publicKey = mercadoPago.getPublicKey();
      const isConfigured = mercadoPago.isMercadoPagoConfigured();
      
      if (!isConfigured) {
        return res.status(503).json({ 
          publicKey: "",
          isConfigured: false,
          message: "Mercado Pago não está configurado. Configure as variáveis de ambiente MERCADOPAGO_PUBLIC_KEY e MERCADOPAGO_ACCESS_TOKEN."
        });
      }
      
      res.json({ publicKey, isConfigured: true });
    } catch (error) {
      res.status(500).json({ 
        message: "Erro ao obter configuração do Mercado Pago",
        publicKey: "",
        isConfigured: false
      });
    }
  });

  // Payment for appointment (before confirming)
  app.post("/api/appointments/:id/pay", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "É necessário estar logado" });
      }

      const { id } = req.params;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: "Token de cartão é obrigatório" });
      }

      const appointmentId = Number(id);
      const appointment = await storage.getAppointmentById(appointmentId);

      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      if (appointment.paymentStatus === "paid") {
        return res.status(400).json({ message: "Este agendamento já foi pago" });
      }

      // Create payment on Mercado Pago
      const paymentResult = await mercadoPago.createAppointmentPayment(
        appointment.paymentAmount!,
        token,
        `Serviço agendado`,
        appointment.email,
        appointmentId
      );

      // Update appointment payment status
      if (paymentResult.status === "approved") {
        await storage.updateAppointmentPayment(appointmentId, {
          paymentStatus: "paid",
          mpPaymentId: paymentResult.id ? String(paymentResult.id) : undefined,
        });

        // Confirm appointment
        await storage.updateAppointmentStatus(appointmentId, "confirmed");

        res.json({ success: true, message: "Pagamento confirmado! Seu agendamento foi confirmado.", payment: paymentResult });
      } else {
        await storage.updateAppointmentPayment(appointmentId, {
          paymentStatus: "failed",
          mpPaymentId: paymentResult.id ? String(paymentResult.id) : undefined,
        });

        res.status(400).json({ message: "Pagamento não foi aprovado. Tente novamente." });
      }
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      res.status(500).json({ message: "Erro ao processar pagamento" });
    }
  });

  // === Subscription Plans Routes ===

  // List public subscription plans
  app.get("/api/subscription-plans", async (_req: Request, res: Response) => {
    try {
      const plans = await storage.getActiveSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Erro ao listar planos:", error);
      // Mock data para desenvolvimento enquanto o banco está indisponível
      const mockPlans = [
        {
          id: 1,
          name: "Plano Básico",
          description: "Acesso a serviços básicos",
          price: 49.90,
          includedServiceIds: [1, 2],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: "Plano Premium",
          description: "Acesso completo com prioridade",
          price: 99.90,
          includedServiceIds: [1, 2, 3, 4],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      res.json(mockPlans);
    }
  });

  // Admin: CRUD for subscription plans
  app.get("/api/admin/subscription-plans", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !(req.user as any).isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Erro ao listar planos" });
    }
  });

  app.post("/api/admin/subscription-plans", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !(req.user as any).isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const planData = insertSubscriptionPlanSchema.parse(req.body);
      const plan = await storage.createSubscriptionPlan(planData);

      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join("; ");
        res.status(400).json({ message: errorMessages });
      } else {
        res.status(500).json({ message: "Erro ao criar plano" });
      }
    }
  });

  app.put("/api/admin/subscription-plans/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !(req.user as any).isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { id } = req.params;
      const planData = insertSubscriptionPlanSchema.partial().parse(req.body);
      const plan = await storage.updateSubscriptionPlan(Number(id), planData);

      if (!plan) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }

      res.json(plan);
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join("; ");
        res.status(400).json({ message: errorMessages });
      } else {
        res.status(500).json({ message: "Erro ao atualizar plano" });
      }
    }
  });

  app.delete("/api/admin/subscription-plans/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !(req.user as any).isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { id } = req.params;
      const deleted = await storage.deleteSubscriptionPlan(Number(id));

      if (!deleted) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }

      res.json({ message: "Plano deletado com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar plano" });
    }
  });

  // === User Subscription Routes ===

  // Get user's active subscription
  app.get("/api/my-subscription", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "É necessário estar logado" });
      }

      const userId = (req.user as any).id;
      const subscription = await storage.getActiveSubscriptionForUser(userId);

      res.json(subscription || null);
    } catch (error) {
      console.error("Erro ao buscar assinatura do usuário:", error);
      // Retornar null para desenvolvimento enquanto banco está indisponível
      res.json(null);
    }
  });

  // Create subscription (checkout)
  app.post("/api/subscriptions/checkout", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "É necessário estar logado" });
      }

      const { planId, token } = req.body;
      const userId = (req.user as any).id;

      if (!planId || !token) {
        return res.status(400).json({ message: "Dados inválidos" });
      }

      const plan = await storage.getSubscriptionPlanById(Number(planId));
      if (!plan) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }

      // Create preapproval on Mercado Pago
      const user = await storage.getUser(userId);
      const preapprovalResult = await mercadoPago.createPreapproval(
        token,
        plan.price,
        plan.name,
        user?.email || "",
        new Date()
      );

      // Save subscription to database
      const startDate = new Date();
      const nextBillingDate = new Date(startDate);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      const subscription = await storage.createUserSubscription({
        userId,
        planId: Number(planId),
        mpPreapprovalId: preapprovalResult.id,
        status: "authorized",
        nextBillingDate,
      });

      res.status(201).json({ success: true, subscription });
    } catch (error) {
      console.error("Erro ao criar assinatura:", error);
      res.status(500).json({ message: "Erro ao criar assinatura" });
    }
  });

  // Cancel subscription
  app.post("/api/subscriptions/:id/cancel", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "É necessário estar logado" });
      }

      const { id } = req.params;
      const userId = (req.user as any).id;

      const subscription = await storage.getUserSubscriptionById(Number(id));
      if (!subscription) {
        return res.status(404).json({ message: "Assinatura não encontrada" });
      }

      if (subscription.userId !== userId && !(req.user as any).isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Cancel on Mercado Pago if exists
      if (subscription.mpPreapprovalId) {
        try {
          await mercadoPago.cancelPreapproval(subscription.mpPreapprovalId);
        } catch (err) {
          console.warn("Erro ao cancelar no Mercado Pago:", err);
        }
      }

      // Cancel in database
      const cancelled = await storage.cancelUserSubscription(Number(id));

      res.json({ message: "Assinatura cancelada com sucesso", subscription: cancelled });
    } catch (error) {
      console.error("Erro ao cancelar assinatura:", error);
      res.status(500).json({ message: "Erro ao cancelar assinatura" });
    }
  });

  // Webhook from Mercado Pago
  app.post("/api/webhooks/mercadopago", async (req: Request, res: Response) => {
    try {
      const { action, data, type } = req.body;

      // Payment webhook
      if (type === "payment") {
        const paymentId = data.id;
        const paymentData = await mercadoPago.getPayment(paymentId);

        // Find appointment by mpPaymentId
        const allAppointments = await storage.getAppointments();
        const appointment = allAppointments.find(a => a.mpPaymentId === paymentId.toString());

        if (appointment) {
          if (paymentData.status === "approved") {
            await storage.updateAppointmentPayment(appointment.id, {
              paymentStatus: "paid",
            });
            await storage.updateAppointmentStatus(appointment.id, "confirmed");
          } else if (paymentData.status === "rejected" || paymentData.status === "cancelled") {
            await storage.updateAppointmentPayment(appointment.id, {
              paymentStatus: "failed",
            });
          }
        }
      }

      // Subscription webhook
      if (type === "subscription_preapproval") {
        const preapprovalId = data.id;
        const subscription = await storage.getUserSubscriptionByPreapprovalId(preapprovalId);

        if (subscription) {
          if (action === "subscription_preapproval.updated") {
            const preapprovalData = await mercadoPago.getPreapproval(preapprovalId);
            if (preapprovalData.status === "authorized") {
              await storage.updateUserSubscription(subscription.id, {
                status: "authorized",
                nextBillingDate: new Date(preapprovalData.nextBillingDate || Date.now()),
              });
            }
          }
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ message: "Webhook processing error" });
    }
  });

  // Fallback JSON para rotas /api que não existirem
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Endpoint da API não encontrado" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
