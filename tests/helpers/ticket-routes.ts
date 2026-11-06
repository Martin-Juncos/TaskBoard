import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../../src/app";
import {
  createCreateTicketController,
  createDeleteTicketController,
  createGetTicketController,
  createListTicketsController,
  createRegenerateTicketSuggestionsController,
  createUpdateTicketController,
  createUpdateTicketStatusController,
} from "../../src/controllers/ticket-controller";
import { createAuthenticationMiddleware } from "../../src/middleware/authentication";
import type { Ticket } from "../../src/models/ticket";
import type { User } from "../../src/models/user";
import type {
  CreateTicketRecord,
  UpdateTicketRecord,
} from "../../src/repositories/ticket-repository";
import type { TicketRepositoryFilters } from "../../src/types/ticket-filters";
import {
  CreateTicketService,
  DeleteTicketService,
  GetTicketService,
  ListTicketsService,
  RegenerateTicketSuggestionsService,
  UpdateTicketService,
  UpdateTicketStatusService,
} from "../../src/services/ticket-service";
import { signAccessToken } from "../../src/utils/jwt";

const settings = { jwtSecret: "secreto-para-probar-tickets", jwtExpiresIn: "1h" };
export const user = {
  id: 44,
  name: "Desarrolladora",
  email: "dev@example.com",
  passwordHash: "hash-privado",
  role: "developer",
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;
export const otherDeveloper = { ...user, id: 55, email: "otro@example.com" } as User;
export const admin = { ...user, id: 1, email: "admin@example.com", role: "admin" } as User;
export const tickets = new Map<number, Ticket>();

// Crea un modelo simulado que replica la actualización y eliminación de Sequelize.
export function makeTicket(id: number, data: CreateTicketRecord): Ticket {
  const values = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
  const ticket = {
    ...values,
    get: () => ({ ...values }),
    update: async (changes: UpdateTicketRecord) => {
      Object.assign(values, changes);
      Object.assign(ticket, changes);
      return ticket;
    },
    destroy: async () => {
      tickets.delete(id);
    },
  } as unknown as Ticket;
  return ticket;
}

// Inicia la API con repositorios en memoria y fixtures estables para cada suite.
export async function startTicketTestServer(): Promise<{ baseUrl: string; server: Server }> {
  tickets.clear();
  let nextTicketId = 8;
  tickets.set(
    7,
    makeTicket(7, {
      title: "Ticket de ejemplo",
      description: "La API falla al desplegar",
      type: "task",
      priority: "medium",
      status: "pending",
      dueDate: "2099-01-01",
      createdById: user.id,
      assigneeId: user.id,
      branchType: "chore",
      branchName: "chore/ticket-de-ejemplo",
      commitType: "chore",
      commitScope: null,
      commitDescription: "Ticket de ejemplo",
    }),
  );
  tickets.set(
    9,
    makeTicket(9, {
      title: "Bloqueo de despliegue",
      description: "",
      type: "bug",
      priority: "urgent",
      status: "blocked",
      dueDate: "2099-01-01",
      createdById: user.id,
      assigneeId: null,
      branchType: "bugfix",
      branchName: "bugfix/bloqueo-de-despliegue",
      commitType: "fix",
      commitScope: null,
      commitDescription: "Bloqueo de despliegue",
    }),
  );

  const userRepository = {
    findById: async (id: number) =>
      [user, otherDeveloper, admin].find((item) => item.id === id) ?? null,
  };
  const ticketRepository = {
    create: async (data: CreateTicketRecord) => {
      const ticket = makeTicket(nextTicketId++, data);
      tickets.set(ticket.id, ticket);
      return ticket;
    },
    findById: async (id: number) => tickets.get(id) ?? null,
    update: async (ticket: Ticket, changes: UpdateTicketRecord) => ticket.update(changes),
    delete: async (ticket: Ticket) => {
      await ticket.destroy();
    },
    findAll: async (filters?: TicketRepositoryFilters) =>
      [...tickets.values()]
        .filter(
          (ticket) =>
            !filters?.search ||
            ticket.title.toLowerCase().includes(filters.search.toLowerCase()) ||
            (ticket.description ?? "").toLowerCase().includes(filters.search.toLowerCase()),
        )
        .filter((ticket) => !filters?.status || ticket.status === filters.status)
        .filter((ticket) => !filters?.priority || ticket.priority === filters.priority)
        .filter((ticket) => !filters?.type || ticket.type === filters.type)
        .filter(
          (ticket) => filters?.assigneeId === undefined || ticket.assigneeId === filters.assigneeId,
        )
        .filter(
          (ticket) => filters?.mineUserId === undefined || ticket.assigneeId === filters.mineUserId,
        )
        .filter((ticket) => !filters?.unassigned || ticket.assigneeId === null)
        .sort((left, right) => left.id - right.id),
  };
  const app = createApp({
    tickets: {
      authenticate: createAuthenticationMiddleware(userRepository, settings),
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
  const server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return { baseUrl: `http://127.0.0.1:${(address as AddressInfo).port}`, server };
}

// Cierra el servidor de pruebas para liberar el puerto de la suite.
export async function stopTicketTestServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

// Firma tokens de prueba con el mismo secreto que verifica el middleware.
export function authorizationHeaders(currentUser: User = user): Record<string, string> {
  const token = signAccessToken({ userId: currentUser.id, role: currentUser.role }, settings);
  return { Authorization: `Bearer ${token}` };
}
