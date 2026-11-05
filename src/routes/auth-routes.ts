import { Router, type RequestHandler } from "express";

export interface AuthRouteHandlers {
  register?: RequestHandler;
  login?: RequestHandler;
}

// Agrupa las rutas de autenticación bajo el prefijo /api/auth.
export function createAuthRouter(handlers: AuthRouteHandlers): Router {
  const router = Router();

  // Registra una cuenta nueva cuando se inyecta su controlador.
  if (handlers.register) {
    router.post("/register", handlers.register);
  }

  // Inicia sesión cuando se inyecta el controlador correspondiente.
  if (handlers.login) {
    router.post("/login", handlers.login);
  }

  return router;
}
