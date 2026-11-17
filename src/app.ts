import express from "express";
import type { AppConfig } from "./config/env";
import {
  createLoginUserController,
  createRegisterUserController,
} from "./controllers/auth-controller";
import {
  createCreateTicketController,
  createDeleteTicketController,
  createGetTicketController,
  createListTicketsController,
  createRegenerateTicketSuggestionsController,
  createUpdateTicketController,
  createUpdateTicketStatusController,
} from "./controllers/ticket-controller";
import {
  createChangeUserRoleController,
  createListUsersController,
} from "./controllers/user-controller";
import { createAuthenticationMiddleware } from "./middleware/authentication";
import errorHandler from "./middleware/error-handler";
import notFoundHandler from "./middleware/not-found-handler";
import { Ticket } from "./models/ticket";
import { User } from "./models/user";
import { TicketRepository } from "./repositories/ticket-repository";
import { UserRepository } from "./repositories/user-repository";
import { createAuthRouter, type AuthRouteHandlers } from "./routes/auth-routes";
import { createTicketRouter, type TicketRouteHandlers } from "./routes/ticket-routes";
import { createUserRouter, type UserRouteHandlers } from "./routes/user-routes";
import { LoginUserService } from "./services/login-user-service";
import { RegisterUserService } from "./services/register-user-service";
import {
  CreateTicketService,
  DeleteTicketService,
  GetTicketService,
  ListTicketsService,
  RegenerateTicketSuggestionsService,
  UpdateTicketService,
  UpdateTicketStatusService,
} from "./services/ticket-service";
import { ChangeUserRoleService, ListUsersService } from "./services/user-service";

type ApplicationConfig = Pick<AppConfig, "jwtSecret" | "jwtExpiresIn">;

// Agrupa los handlers de cada módulo para mantener el armado de Express en un solo lugar.
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

  // La autenticación se registra únicamente cuando se proporcionan sus handlers.
  if (authHandlers) {
    app.use("/api/auth", createAuthRouter(authHandlers));
  }

  // Los módulos de usuarios y tickets dependen de sus respectivos handlers.
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

// Conecta las capas de la aplicación en un único lugar antes de iniciar el servidor.
export function createApplication(config: ApplicationConfig) {
  const userRepository = new UserRepository(User);
  const ticketRepository = new TicketRepository(Ticket);
  const authenticate = createAuthenticationMiddleware(userRepository, config);

  return createApp({
    register: createRegisterUserController(new RegisterUserService(userRepository)),
    login: createLoginUserController(new LoginUserService(userRepository, config)),
    users: {
      authenticate,
      list: createListUsersController(new ListUsersService(userRepository)),
      updateRole: createChangeUserRoleController(new ChangeUserRoleService(userRepository)),
    },
    tickets: {
      authenticate,
      create: createCreateTicketController(new CreateTicketService(ticketRepository)),
      update: createUpdateTicketController(new UpdateTicketService(ticketRepository)),
      regenerateSuggestions: createRegenerateTicketSuggestionsController(
        new RegenerateTicketSuggestionsService(ticketRepository),
      ),
      updateStatus: createUpdateTicketStatusController(
        new UpdateTicketStatusService(ticketRepository),
      ),
      delete: createDeleteTicketController(new DeleteTicketService(ticketRepository)),
      findById: createGetTicketController(new GetTicketService(ticketRepository)),
      list: createListTicketsController(new ListTicketsService(ticketRepository)),
    },
  });
}
