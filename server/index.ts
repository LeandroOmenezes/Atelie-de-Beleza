import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false, limit: "20mb" }));

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://*.mercadopago.com https://*.mlstatic.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.mercadopago.com; " +
      "img-src 'self' data: blob: https://*.mercadopago.com https://*.mlstatic.com https://images.unsplash.com; " +
      "connect-src 'self' https://api.mercadopago.com https://sdk.mercadopago.com https://*.mercadopago.com https://*.mlstatic.com wss: ws:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "frame-src 'self' https://www.mercadopago.com https://*.mercadopago.com; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self' https://*.mercadopago.com; " +
      "upgrade-insecure-requests"
  );
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

   // Sempre utilize a porta 5000 para o aplicativo
   // Esta porta serve tanto a API quanto o cliente.
   // É a única porta que não está bloqueada por firewall.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
  }, async () => {
    log(`serving on port ${port}`);
    
    // Migração de imagens concluída com sucesso!
    // Todas as imagens agora estão permanentemente no PostgreSQL
  });
})();
