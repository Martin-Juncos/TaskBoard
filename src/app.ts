import express from "express";
import errorHandler from "./middleware/error-handler";
import notFoundHandler from "./middleware/not-found-handler";
import { createAuthRouter, type AuthRouteHandlers } from "./routes/auth-routes";
import { createUserRouter, type UserRouteHandlers } from "./routes/user-routes";
import { createTicketRouter, type TicketRouteHandlers } from "./routes/ticket-routes";

export interface AppRouteHandlers extends AuthRouteHandlers {
  users?: UserRouteHandlers;
  tickets?: TicketRouteHandlers;
}

// Crea una aplicación con las rutas disponibles y los controladores de autenticación inyectados.
export function createApp(authHandlers?: AppRouteHandlers) {
  const app = express();

  // Convierte automáticamente los cuerpos JSON de las solicitudes en objetos de JavaScript.
  app.use(express.json());

  // Permite comprobar rápidamente que la API está encendida y responde correctamente.
  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  // Agrega las rutas de autenticación que el punto de entrada haya configurado.
  if (authHandlers) {
    app.use("/api/auth", createAuthRouter(authHandlers));
  }

  // Agrega endpoints de usuarios solo cuando se inyectan sus middlewares y controladores.
  if (authHandlers?.users) {
    app.use("/api/users", createUserRouter(authHandlers.users));
  }

  // Agrega rutas de tickets con los controladores y la autenticación configurados.
  if (authHandlers?.tickets) {
    app.use("/api/tickets", createTicketRouter(authHandlers.tickets));
  }

  // Convierte rutas no registradas en HttpError antes de que se ejecute el manejador global.
  app.use(notFoundHandler);

  // Registra el manejador al final para que reciba errores de las rutas y middlewares anteriores.
  app.use(errorHandler);

  return app;
}
