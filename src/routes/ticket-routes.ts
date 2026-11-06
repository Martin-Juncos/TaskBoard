import { Router, type RequestHandler } from "express";

export interface TicketRouteHandlers {
  authenticate: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  findById: RequestHandler;
  list: RequestHandler;
}

// Agrupa creación y consultas iniciales de tickets y requiere autenticación JWT.
export function createTicketRouter(handlers: TicketRouteHandlers): Router {
  const router = Router();
  router.post("/", handlers.authenticate, handlers.create);
  router.put("/:id", handlers.authenticate, handlers.update);
  router.get("/", handlers.authenticate, handlers.list);
  router.get("/:id", handlers.authenticate, handlers.findById);
  return router;
}
