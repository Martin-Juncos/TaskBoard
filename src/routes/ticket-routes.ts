import { Router, type RequestHandler } from "express";

export interface TicketRouteHandlers {
  authenticate: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  regenerateSuggestions: RequestHandler;
  updateStatus: RequestHandler;
  delete: RequestHandler;
  findById: RequestHandler;
  list: RequestHandler;
}

// Agrupa creación y consultas iniciales de tickets y requiere autenticación JWT.
export function createTicketRouter(handlers: TicketRouteHandlers): Router {
  const router = Router();
  router.post("/", handlers.authenticate, handlers.create);
  router.put("/:id", handlers.authenticate, handlers.update);
  router.patch("/:id/status", handlers.authenticate, handlers.updateStatus);
  router.delete("/:id", handlers.authenticate, handlers.delete);
  // Esta ruta cambia sugerencias guardadas solo por pedido explícito del cliente.
  router.post("/:id/regenerate-suggestions", handlers.authenticate, handlers.regenerateSuggestions);
  router.get("/", handlers.authenticate, handlers.list);
  router.get("/:id", handlers.authenticate, handlers.findById);
  return router;
}
