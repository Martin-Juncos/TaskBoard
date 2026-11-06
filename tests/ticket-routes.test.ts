import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createApp } from "../src/app";
import { createCreateTicketController, createGetTicketController, createListTicketsController, createUpdateTicketController } from "../src/controllers/ticket-controller";
import { createAuthenticationMiddleware } from "../src/middleware/authentication";
import type { Ticket } from "../src/models/ticket";
import type { User } from "../src/models/user";
import type { CreateTicketRecord, UpdateTicketRecord } from "../src/repositories/ticket-repository";
import type { TicketRepositoryFilters } from "../src/types/ticket-filters";
import { CreateTicketService, GetTicketService, ListTicketsService, UpdateTicketService } from "../src/services/ticket-service";
import { signAccessToken } from "../src/utils/jwt";

const settings = { jwtSecret: "secreto-para-probar-tickets", jwtExpiresIn: "1h" };
const user = {
  id: 44,
  name: "Desarrolladora",
  email: "dev@example.com",
  passwordHash: "hash-privado",
  role: "developer",
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;
const otherDeveloper = { ...user, id: 55, email: "otro@example.com" } as User;
const admin = { ...user, id: 1, email: "admin@example.com", role: "admin" } as User;
const tickets = new Map<number, Ticket>();
let nextTicketId = 8;
let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;

// Arma una instancia simulada compatible con el formato de respuesta del modelo Sequelize.
function makeTicket(id: number, data: CreateTicketRecord): Ticket {
  const values = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
  // Simula la actualización de Sequelize para que la respuesta lea los valores persistidos.
  const ticket = {
    ...values,
    get: () => ({ ...values }),
    update: async (changes: UpdateTicketRecord) => {
      Object.assign(values, changes);
      Object.assign(ticket, changes);
      return ticket;
    },
  } as unknown as Ticket;
  return ticket;
}

// Monta el router real con repositorios en memoria y un usuario autenticado de prueba.
before(async () => {
  tickets.set(7, makeTicket(7, {
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
  }));
  tickets.set(9, makeTicket(9, {
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
  }));

  const userRepository = { findById: async (id: number) => [user, otherDeveloper, admin].find((item) => item.id === id) ?? null };
  const ticketRepository = {
    create: async (data: CreateTicketRecord) => {
      const ticket = makeTicket(nextTicketId++, data);
      tickets.set(ticket.id, ticket);
      return ticket;
    },
    findById: async (id: number) => tickets.get(id) ?? null,
    update: async (ticket: Ticket, changes: UpdateTicketRecord) => ticket.update(changes),
    findAll: async (filters?: TicketRepositoryFilters) => [...tickets.values()]
      .filter((ticket) => !filters?.search || ticket.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        (ticket.description ?? "").toLowerCase().includes(filters.search.toLowerCase()))
      .filter((ticket) => !filters?.status || ticket.status === filters.status)
      .filter((ticket) => !filters?.priority || ticket.priority === filters.priority)
      .filter((ticket) => !filters?.type || ticket.type === filters.type)
      .filter((ticket) => filters?.assigneeId === undefined || ticket.assigneeId === filters.assigneeId)
      .filter((ticket) => filters?.mineUserId === undefined || ticket.assigneeId === filters.mineUserId)
      .filter((ticket) => !filters?.unassigned || ticket.assigneeId === null)
      .sort((left, right) => left.id - right.id),
  };
  const app = createApp({
    tickets: {
      authenticate: createAuthenticationMiddleware(userRepository, settings),
      create: createCreateTicketController(new CreateTicketService(ticketRepository)),
      update: createUpdateTicketController(new UpdateTicketService(ticketRepository)),
      findById: createGetTicketController(new GetTicketService(ticketRepository)),
      list: createListTicketsController(new ListTicketsService(ticketRepository)),
    },
  });
  server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;
});

// Cierra el servidor de pruebas para liberar su puerto.
after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

// Devuelve un token real firmado por el mismo secreto que usa el middleware.
function authorizationHeaders(currentUser: User = user): Record<string, string> {
  const token = signAccessToken({ userId: currentUser.id, role: currentUser.role }, settings);
  return { Authorization: `Bearer ${token}` };
}

// Crea un ticket, toma el autor desde el JWT y completa las sugerencias de rama y commit.
test("POST /api/tickets crea el ticket y responde 201", async () => {
  const response = await fetch(`${baseUrl}/api/tickets`, {
    method: "POST",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      title: " Agregar búsqueda: ¿qué pasó? ",
      type: "feature",
      priority: "high",
      status: "pending",
      dueDate: "2099-01-01",
    }),
  });
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 201);
  assert.equal(body.title, "Agregar búsqueda: ¿qué pasó?");
  assert.equal(body.createdById, user.id);
  assert.equal(body.branchType, "feature");
  assert.equal(body.branchName, "feature/agregar-busqueda-que-paso");
  assert.equal(body.commitType, "feat");
  assert.equal(body.commitDescription, "Agregar búsqueda: ¿qué pasó?");
  assert.equal(body.completed, false);
  assert.equal(body.alert, false);
});

// Rechaza la creación sin token y valida los campos obligatorios y la fecha del ticket.
test("POST /api/tickets requiere JWT y responde 400 ante datos inválidos", async () => {
  const withoutToken = await fetch(`${baseUrl}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(withoutToken.status, 401);

  const validBody = {
    title: "Ticket válido",
    type: "task",
    priority: "medium",
    status: "pending",
    dueDate: "2099-01-01",
  };
  const invalidBodies = [
    { ...validBody, title: "   " },
    { ...validBody, type: "epic" },
    { ...validBody, priority: "normal" },
    { ...validBody, status: "queued" },
    { ...validBody, dueDate: "2026-02-30" },
    { ...validBody, dueDate: "30/02/2026" },
  ];

  for (const invalidBody of invalidBodies) {
    const response = await fetch(`${baseUrl}/api/tickets`, {
      method: "POST",
      headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(invalidBody),
    });
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(response.status, 400);
    assert.equal(body.error.code, "VALIDACION_TICKET");
  }
});

// Devuelve un ticket existente con completed y alert calculados, y usa 404 para uno ausente.
test("GET /api/tickets/:id consulta existente y responde 404 si falta", async () => {
  const headers = authorizationHeaders();
  const found = await fetch(`${baseUrl}/api/tickets/7`, { headers });
  const foundBody = (await found.json()) as Record<string, unknown>;
  const missing = await fetch(`${baseUrl}/api/tickets/999`, { headers });
  const missingBody = (await missing.json()) as { error: { code: string } };

  assert.equal(found.status, 200);
  assert.equal(foundBody.id, 7);
  assert.equal(foundBody.completed, false);
  assert.equal(foundBody.alert, false);
  assert.equal(missing.status, 404);
  assert.equal(missingBody.error.code, "TICKET_NO_ENCONTRADO");
});

// Mantiene el listado completo cuando search no se envía o contiene solo espacios.
test("GET /api/tickets lista todo sin un término de búsqueda", async () => {
  const response = await fetch(`${baseUrl}/api/tickets?search=%20%20`, { headers: authorizationHeaders() });
  const body = (await response.json()) as Array<{ id: number }>;

  assert.equal(response.status, 200);
  assert.deepEqual(body.map((ticket) => ticket.id), [7, 8, 9]);
});

// Devuelve una columna por estado y mantiene vacías las columnas sin tickets.
test("GET /api/tickets?groupBy=status agrupa tickets por estado", async () => {
  const response = await fetch(`${baseUrl}/api/tickets?groupBy=status`, { headers: authorizationHeaders() });
  const body = (await response.json()) as Record<string, Array<{ id: number }>>;

  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(body), ["pending", "in_progress", "in_review", "completed", "blocked"]);
  assert.deepEqual(body.pending.map((ticket) => ticket.id), [7, 8]);
  assert.deepEqual(body.blocked.map((ticket) => ticket.id), [9]);
  assert.deepEqual(body.completed, []);
});

// Agrupa después de aplicar los filtros existentes, sin perder las columnas vacías.
test("GET /api/tickets combina agrupación y filtros", async () => {
  const response = await fetch(`${baseUrl}/api/tickets?groupBy=status&status=blocked&unassigned=true`, {
    headers: authorizationHeaders(),
  });
  const body = (await response.json()) as Record<string, Array<{ id: number }>>;

  assert.equal(response.status, 200);
  assert.deepEqual(body.blocked.map((ticket) => ticket.id), [9]);
  assert.deepEqual(body.pending, []);
});

// Busca sin distinguir mayúsculas y encuentra coincidencias en el título o la descripción.
test("GET /api/tickets?search busca en título y descripción", async () => {
  const titleResponse = await fetch(`${baseUrl}/api/tickets?search=AGREGAR`, { headers: authorizationHeaders() });
  const titleResults = (await titleResponse.json()) as Array<{ id: number }>;
  const descriptionResponse = await fetch(`${baseUrl}/api/tickets?search=API`, { headers: authorizationHeaders() });
  const descriptionResults = (await descriptionResponse.json()) as Array<{ id: number }>;

  assert.equal(titleResponse.status, 200);
  assert.deepEqual(titleResults.map((ticket) => ticket.id), [8]);
  assert.equal(descriptionResponse.status, 200);
  assert.deepEqual(descriptionResults.map((ticket) => ticket.id), [7]);
});

// Combina status, priority y type como condiciones AND, y también con search si se envía.
test("GET /api/tickets combina status, priority y type", async () => {
  const match = await fetch(`${baseUrl}/api/tickets?status=pending&priority=high&type=feature`, {
    headers: authorizationHeaders(),
  });
  const matchResults = (await match.json()) as Array<{ id: number }>;
  const noMatch = await fetch(`${baseUrl}/api/tickets?status=blocked&priority=urgent&type=feature`, {
    headers: authorizationHeaders(),
  });
  const noMatchResults = (await noMatch.json()) as Array<{ id: number }>;
  const combinedSearch = await fetch(`${baseUrl}/api/tickets?search=API&status=pending&priority=medium&type=task`, {
    headers: authorizationHeaders(),
  });
  const combinedSearchResults = (await combinedSearch.json()) as Array<{ id: number }>;

  assert.deepEqual(matchResults.map((ticket) => ticket.id), [8]);
  assert.deepEqual(noMatchResults, []);
  assert.deepEqual(combinedSearchResults.map((ticket) => ticket.id), [7]);
});

// Filtra responsable por ID, tickets asignados al usuario autenticado y tickets sin asignar.
test("GET /api/tickets filtra responsable, mis tickets y sin asignar", async () => {
  const byAssignee = await fetch(`${baseUrl}/api/tickets?assigneeId=${user.id}`, { headers: authorizationHeaders() });
  const assigneeResults = (await byAssignee.json()) as Array<{ id: number }>;
  const mine = await fetch(`${baseUrl}/api/tickets?mine=true`, { headers: authorizationHeaders() });
  const mineResults = (await mine.json()) as Array<{ id: number }>;
  const unassigned = await fetch(`${baseUrl}/api/tickets?unassigned=true`, { headers: authorizationHeaders() });
  const unassignedResults = (await unassigned.json()) as Array<{ id: number }>;

  assert.deepEqual(assigneeResults.map((ticket) => ticket.id), [7]);
  assert.deepEqual(mineResults.map((ticket) => ticket.id), [7]);
  assert.deepEqual(unassignedResults.map((ticket) => ticket.id), [8, 9]);
});

// Rechaza términos repetidos o demasiado largos en lugar de interpretarlos ambiguamente.
test("GET /api/tickets valida el parámetro search", async () => {
  const repeated = await fetch(`${baseUrl}/api/tickets?search=uno&search=dos`, { headers: authorizationHeaders() });
  const tooLong = await fetch(`${baseUrl}/api/tickets?search=${"a".repeat(201)}`, { headers: authorizationHeaders() });
  assert.equal(repeated.status, 400);
  assert.equal(tooLong.status, 400);
});

// Rechaza nombres de filtros con valores no admitidos o parámetros repetidos.
test("GET /api/tickets valida los filtros", async () => {
  const invalidQueries = [
    "status=queued",
    "priority=low&priority=high",
    "type=epic",
    "assigneeId=0",
    "assigneeId=44&assigneeId=45",
    "mine=yes",
    "unassigned=1",
    "groupBy=priority",
    "groupBy=status&groupBy=status",
  ];
  for (const query of invalidQueries) {
    const response = await fetch(`${baseUrl}/api/tickets?${query}`, { headers: authorizationHeaders() });
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(response.status, 400);
    assert.equal(body.error.code, "FILTRO_INVALIDO");
  }
});

// Cambiar el título no vuelve a calcular la rama ni los datos del commit ya guardados.
test("PUT /api/tickets/:id actualiza el título sin alterar rama, commit ni autor", async () => {
  const response = await fetch(`${baseUrl}/api/tickets/7`, {
    method: "PUT",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Nuevo título", createdById: otherDeveloper.id }),
  });
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.title, "Nuevo título");
  assert.equal(body.createdById, user.id);
  assert.equal(body.branchType, "chore");
  assert.equal(body.branchName, "chore/ticket-de-ejemplo");
  assert.equal(body.commitType, "chore");
  assert.equal(body.commitScope, null);
  assert.equal(body.commitDescription, "Ticket de ejemplo");
});

// Solo cambia las sugerencias guardadas cuando el cliente las envía expresamente.
test("PUT /api/tickets/:id permite editar rama y commit de forma explícita", async () => {
  const response = await fetch(`${baseUrl}/api/tickets/7`, {
    method: "PUT",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ branchName: "chore/rama-manual", commitDescription: "Cambio manual" }),
  });
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.branchName, "chore/rama-manual");
  assert.equal(body.commitDescription, "Cambio manual");
});

// Protege la ruta y diferencia los IDs ausentes de los cuerpos inválidos.
test("PUT /api/tickets/:id requiere JWT y valida ID y campos", async () => {
  const withoutToken = await fetch(`${baseUrl}/api/tickets/7`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Nuevo" }),
  });
  assert.equal(withoutToken.status, 401);

  for (const [id, input, expectedStatus, expectedCode] of [
    ["999", { title: "Nuevo" }, 404, "TICKET_NO_ENCONTRADO"],
    ["abc", { title: "Nuevo" }, 400, "ID_INVALIDO"],
    ["7", {}, 400, "VALIDACION_TICKET"],
    ["7", { title: "  " }, 400, "VALIDACION_TICKET"],
    ["7", { type: "epic" }, 400, "VALIDACION_TICKET"],
    ["7", { dueDate: "2026-02-30" }, 400, "VALIDACION_TICKET"],
  ] as const) {
    const response = await fetch(`${baseUrl}/api/tickets/${id}`, {
      method: "PUT",
      headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(response.status, expectedStatus);
    assert.equal(body.error.code, expectedCode);
  }
});

// El desarrollador ajeno no edita tickets, pero el administrador sí puede hacerlo.
test("PUT /api/tickets/:id respeta permisos de desarrollador y administrador", async () => {
  const denied = await fetch(`${baseUrl}/api/tickets/7`, {
    method: "PUT",
    headers: { ...authorizationHeaders(otherDeveloper), "Content-Type": "application/json" },
    body: JSON.stringify({ priority: "high" }),
  });
  const deniedBody = (await denied.json()) as { error: { code: string } };
  assert.equal(denied.status, 403);
  assert.equal(deniedBody.error.code, "PERMISO_DENEGADO");

  const allowed = await fetch(`${baseUrl}/api/tickets/7`, {
    method: "PUT",
    headers: { ...authorizationHeaders(admin), "Content-Type": "application/json" },
    body: JSON.stringify({ priority: "high" }),
  });
  const allowedBody = (await allowed.json()) as Record<string, unknown>;
  assert.equal(allowed.status, 200);
  assert.equal(allowedBody.priority, "high");
});

// Cambiar el estado exige ser responsable o tomar el ticket libre en la misma solicitud.
test("PUT /api/tickets/:id controla cambios de estado y asignación", async () => {
  const denied = await fetch(`${baseUrl}/api/tickets/9`, {
    method: "PUT",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ status: "in_progress" }),
  });
  assert.equal(denied.status, 403);

  const allowed = await fetch(`${baseUrl}/api/tickets/9`, {
    method: "PUT",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ assigneeId: user.id, status: "in_progress" }),
  });
  const body = (await allowed.json()) as Record<string, unknown>;
  assert.equal(allowed.status, 200);
  assert.equal(body.assigneeId, user.id);
  assert.equal(body.status, "in_progress");
});
