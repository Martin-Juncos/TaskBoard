import { Router, type RequestHandler } from "express";

// Agrupa las rutas de autenticación bajo el prefijo /api/auth.
export function createAuthRouter(registerUserController: RequestHandler): Router {
  const router = Router();

  // Registra una cuenta nueva mediante el caso de uso inyectado.
  router.post("/register", registerUserController);

  return router;
}
