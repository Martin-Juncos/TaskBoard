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
import { createApp } from "./app";
import { createAuthenticationMiddleware } from "./middleware/authentication";
import { Ticket } from "./models/ticket";
import { User } from "./models/user";
import { TicketRepository } from "./repositories/ticket-repository";
import { UserRepository } from "./repositories/user-repository";
import { LoginUserService } from "./services/login-user-service";
import { RegisterUserService } from "./services/register-user-service";
import { ChangeUserRoleService, ListUsersService } from "./services/user-service";
import {
  CreateTicketService,
  DeleteTicketService,
  GetTicketService,
  ListTicketsService,
  RegenerateTicketSuggestionsService,
  UpdateTicketService,
  UpdateTicketStatusService,
} from "./services/ticket-service";

type ApplicationConfig = Pick<AppConfig, "jwtSecret" | "jwtExpiresIn">;

// Construye la API completa para que servidor y pruebas usen las mismas dependencias.
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
