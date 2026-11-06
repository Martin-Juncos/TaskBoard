import { Router, type RequestHandler } from "express";

export interface UserRouteHandlers {
  authenticate: RequestHandler;
  list: RequestHandler;
  updateRole: RequestHandler;
}

// Agrupa operaciones de usuarios y protege cada ruta según su nivel de acceso.
export function createUserRouter(handlers: UserRouteHandlers): Router {
  const router = Router();
  router.get("/", handlers.authenticate, handlers.list);
  router.patch("/:id/role", handlers.authenticate, handlers.updateRole);
  return router;
}
