import express from "express";
import errorHandler from "./middleware/error-handler";
import notFoundHandler from "./middleware/not-found-handler";
import { createAuthRouter, type AuthRouteHandlers } from "./routes/auth-routes";
import { createUserRouter, type UserRouteHandlers } from "./routes/user-routes";
import { createTicketRouter, type TicketRouteHandlers } from "./routes/ticket-routes";

// Agrupa handlers opcionales para permitir montar aplicaciones parciales en las pruebas.
export interface AppRouteHandlers extends AuthRouteHandlers {
  users?: UserRouteHandlers;
  tickets?: TicketRouteHandlers;
}

// Crea una aplicación con las rutas disponibles y los controladores de autenticación inyectados.
export function createApp(authHandlers?: AppRouteHandlers) {
  const app = express();

  // Procesa JSON antes de las rutas para que los controladores reciban cuerpos utilizables.
  app.use(express.json());

  // Permite comprobar rápidamente que la API está encendida y responde correctamente.
  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  // Permite montar solo /health en pruebas que no necesitan autenticación.
  if (authHandlers) {
    app.use("/api/auth", createAuthRouter(authHandlers));
  }

  // Mantiene opcionales los módulos que una composición de prueba no necesita.
  if (authHandlers?.users) {
    app.use("/api/users", createUserRouter(authHandlers.users));
  }

  if (authHandlers?.tickets) {
    app.use("/api/tickets", createTicketRouter(authHandlers.tickets));
  }

  // Convierte rutas no registradas en HttpError antes de que se ejecute el manejador global.
  app.use(notFoundHandler);

  // Debe quedar al final para centralizar errores propagados por cualquier ruta.
  app.use(errorHandler);

  return app;
}
