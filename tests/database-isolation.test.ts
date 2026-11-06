import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, test } from "node:test";
import type { Sequelize } from "sequelize";
import type { User as UserModelType } from "../src/models/user";
import type { Ticket as TicketModelType } from "../src/models/ticket";

let sequelize: Sequelize;
let User: typeof UserModelType;
let Ticket: typeof TicketModelType;
const jwtSettings = { jwtSecret: "secreto-de-integracion-local", jwtExpiresIn: "1h" };
let baseUrl: string;
let server: Server | undefined;

// Verifica y prepara una conexión exclusiva a la base de pruebas antes de cargar modelos.
before(async () => {
  const testDatabaseUrl = process.env.DATABASE_URL_TEST?.trim();
  assert.ok(testDatabaseUrl, "Falta DATABASE_URL_TEST para ejecutar las pruebas de PostgreSQL.");

  const testDatabaseName = databaseName(testDatabaseUrl);
  assert.match(testDatabaseName, /_test$/i, "La base de pruebas debe terminar en _test.");
  const developmentDatabaseUrl = process.env.DATABASE_URL?.trim();
  if (developmentDatabaseUrl) {
    assert.notEqual(
      testDatabaseName.toLowerCase(),
      databaseName(developmentDatabaseUrl).toLowerCase(),
      "DATABASE_URL_TEST debe usar un nombre de base distinto al de DATABASE_URL.",
    );
    assert.notEqual(
      databaseIdentity(testDatabaseUrl),
      databaseIdentity(developmentDatabaseUrl),
      "DATABASE_URL_TEST no puede apuntar a la misma base que DATABASE_URL.",
    );
  }

  // Hace que el singleton de Sequelize usado por los modelos apunte a taskboard_test.
  process.env.DATABASE_URL = testDatabaseUrl;
  const databaseModule = await import("../src/database/sequelize");
  sequelize = databaseModule.sequelize;
  User = (await import("../src/models/user")).User;
  Ticket = (await import("../src/models/ticket")).Ticket;
  await sequelize.authenticate();

  // Monta la API con repositorios Sequelize reales para probar rutas y persistencia juntas.
  const [
    { createApp },
    { createAuthenticationMiddleware },
    { createLoginUserController, createRegisterUserController },
    { createChangeUserRoleController, createListUsersController },
    {
      createCreateTicketController,
      createDeleteTicketController,
      createGetTicketController,
      createListTicketsController,
      createRegenerateTicketSuggestionsController,
      createUpdateTicketController,
      createUpdateTicketStatusController,
    },
    { UserRepository },
    { TicketRepository },
    { LoginUserService },
    { RegisterUserService },
    { ChangeUserRoleService, ListUsersService },
    {
      CreateTicketService,
      DeleteTicketService,
      GetTicketService,
      ListTicketsService,
      RegenerateTicketSuggestionsService,
      UpdateTicketService,
      UpdateTicketStatusService,
    },
  ] = await Promise.all([
    import("../src/app"),
    import("../src/middleware/authentication"),
    import("../src/controllers/auth-controller"),
    import("../src/controllers/user-controller"),
    import("../src/controllers/ticket-controller"),
    import("../src/repositories/user-repository"),
    import("../src/repositories/ticket-repository"),
    import("../src/services/login-user-service"),
    import("../src/services/register-user-service"),
    import("../src/services/user-service"),
    import("../src/services/ticket-service"),
  ]);
  const userRepository = new UserRepository(User);
  const ticketRepository = new TicketRepository(Ticket);
  const authenticate = createAuthenticationMiddleware(userRepository, jwtSettings);
  const app = createApp({
    register: createRegisterUserController(new RegisterUserService(userRepository)),
    login: createLoginUserController(new LoginUserService(userRepository, jwtSettings)),
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
      updateStatus: createUpdateTicketStatusController(new UpdateTicketStatusService(ticketRepository)),
      delete: createDeleteTicketController(new DeleteTicketService(ticketRepository)),
      findById: createGetTicketController(new GetTicketService(ticketRepository)),
      list: createListTicketsController(new ListTicketsService(ticketRepository)),
    },
  });
  server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server?.once("listening", resolve);
    server?.once("error", reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;
});

// Vacía ambas tablas y reinicia IDs para aislar cada caso de base de datos.
beforeEach(async () => {
  await sequelize.query('TRUNCATE TABLE "tickets", "users" RESTART IDENTITY CASCADE');
});

// Cierra la conexión a la base aislada después de ejecutar todos los casos.
after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => error ? reject(error) : resolve());
    });
  }
  await sequelize?.close();
});

// Inserta datos reales en PostgreSQL para comprobar que el siguiente caso recibe tablas vacías.
test("guarda fixtures en la base de pruebas aislada", async () => {
  const user = await User.create({
    name: "Usuario de prueba aislada",
    email: "aislamiento@example.com",
    passwordHash: "hash-de-prueba",
  });
  await Ticket.create({
    title: "Ticket de prueba aislada",
    description: null,
    type: "task",
    priority: "medium",
    status: "pending",
    dueDate: "2099-01-01",
    createdById: user.id,
    assigneeId: null,
    branchType: "chore",
    branchName: "chore/ticket-de-prueba-aislada",
    commitType: "chore",
    commitScope: null,
    commitDescription: "Ticket de prueba aislada",
  });

  assert.equal(await User.count(), 1);
  assert.equal(await Ticket.count(), 1);
});

// Confirma que el hook limpió usuarios y tickets insertados por el caso anterior.
test("empieza con usuarios y tickets vacíos en cada caso", async () => {
  assert.equal(await User.count(), 0);
  assert.equal(await Ticket.count(), 0);
});

// Integra registro/login con bcrypt, JWT, datos reales y errores de credenciales.
test("registro y login persisten usuarios y validan credenciales", async () => {
  const registration = await apiRequest("/api/auth/register", "POST", {
    name: "Cuenta integrada",
    email: "integracion-auth@example.com",
    password: "clave-de-prueba",
    role: "admin",
  });
  const registered = registration.body as { id: number; role: string; email: string };
  assert.equal(registration.response.status, 201);
  assert.equal(registered.role, "developer");
  assert.equal(registered.email, "integracion-auth@example.com");

  const stored = await User.findByPk(registered.id);
  assert.ok(stored);
  assert.notEqual(stored.passwordHash, "clave-de-prueba");
  assert.equal(await bcrypt.compare("clave-de-prueba", stored.passwordHash), true);

  const duplicate = await apiRequest("/api/auth/register", "POST", {
    name: "Cuenta duplicada",
    email: registered.email,
    password: "otra-clave",
  });
  assert.equal(duplicate.response.status, 400);

  const login = await apiRequest("/api/auth/login", "POST", {
    email: registered.email,
    password: "clave-de-prueba",
  });
  assert.equal(login.response.status, 200);
  const token = (login.body as { token: string }).token;

  const wrongPassword = await apiRequest("/api/auth/login", "POST", {
    email: registered.email,
    password: "incorrecta",
  });
  assert.equal(wrongPassword.response.status, 401);

  const protectedWithoutToken = await apiRequest("/api/users");
  assert.equal(protectedWithoutToken.response.status, 401);
  const protectedWithToken = await apiRequest("/api/users", "GET", undefined, token);
  assert.equal(protectedWithToken.response.status, 200);
  assert.equal("passwordHash" in (protectedWithToken.body as Array<Record<string, unknown>>)[0], false);
});

// Comprueba en las rutas reales que los permisos se apliquen entre distintos usuarios.
test("permisos de tickets y roles se respetan con usuarios persistidos", async () => {
  const owner = await registerAndLogin("Propietaria", "owner-permissions@example.com");
  const otherDeveloper = await registerAndLogin("Otro developer", "other-permissions@example.com");
  const admin = await createAdminAndLogin("admin-permissions@example.com");
  const ticket = await createApiTicket(owner.token, {
    title: "Ticket de permisos",
    type: "task",
    priority: "medium",
    status: "pending",
    dueDate: "2099-01-01",
  });
  assert.equal(ticket.response.status, 201);
  const ticketId = (ticket.body as { id: number }).id;

  const unauthorizedEdit = await apiRequest(`/api/tickets/${ticketId}`, "PUT", { title: "No autorizado" }, otherDeveloper.token);
  assert.equal(unauthorizedEdit.response.status, 403);

  // El responsable toma primero el ticket libre; desde ahí el otro developer no puede cambiarle el estado.
  const claim = await apiRequest(`/api/tickets/${ticketId}/status`, "PATCH", { status: "in_progress" }, owner.token);
  assert.equal(claim.response.status, 200);
  const unauthorizedStatus = await apiRequest(`/api/tickets/${ticketId}/status`, "PATCH", { status: "blocked" }, otherDeveloper.token);
  assert.equal(unauthorizedStatus.response.status, 403);

  const unauthorizedDelete = await apiRequest(`/api/tickets/${ticketId}`, "DELETE", undefined, otherDeveloper.token);
  assert.equal(unauthorizedDelete.response.status, 403);
  const unauthorizedRoleChange = await apiRequest(
    `/api/users/${owner.id}/role`,
    "PATCH",
    { role: "admin" },
    otherDeveloper.token,
  );
  assert.equal(unauthorizedRoleChange.response.status, 403);

  const adminRoleChange = await apiRequest(`/api/users/${otherDeveloper.id}/role`, "PATCH", { role: "admin" }, admin.token);
  assert.equal(adminRoleChange.response.status, 200);
  assert.equal((adminRoleChange.body as { role: string }).role, "admin");

  const adminEdit = await apiRequest(`/api/tickets/${ticketId}`, "PUT", { priority: "high" }, admin.token);
  assert.equal(adminEdit.response.status, 200);
});

// Recorre crear, consultar, actualizar, cambiar estado y borrar mediante la API y PostgreSQL.
test("CRUD de tickets persiste los cambios y devuelve los estados HTTP esperados", async () => {
  const developer = await registerAndLogin("Developer CRUD", "developer-crud@example.com");
  const admin = await createAdminAndLogin("admin-crud@example.com");
  const createdResponse = await createApiTicket(developer.token, {
    title: "Preparar versión inicial",
    type: "feature",
    priority: "high",
    status: "pending",
    dueDate: "2099-01-01",
  });
  const created = createdResponse.body as Record<string, unknown>;
  assert.equal(createdResponse.response.status, 201);
  assert.equal(created.branchName, "feature/preparar-version-inicial");
  assert.equal(created.commitType, "feat");

  const ticketId = created.id as number;
  const found = await apiRequest(`/api/tickets/${ticketId}`, "GET", undefined, developer.token);
  assert.equal(found.response.status, 200);

  const changedTitle = await apiRequest(
    `/api/tickets/${ticketId}`,
    "PUT",
    { title: "Cambiar título manualmente" },
    developer.token,
  );
  const changedTitleBody = changedTitle.body as Record<string, unknown>;
  assert.equal(changedTitle.response.status, 200);
  assert.equal(changedTitleBody.branchName, "feature/preparar-version-inicial");

  const regenerated = await apiRequest(
    `/api/tickets/${ticketId}/regenerate-suggestions`,
    "POST",
    undefined,
    developer.token,
  );
  const regeneratedBody = regenerated.body as Record<string, unknown>;
  assert.equal(regenerated.response.status, 200);
  assert.equal(regeneratedBody.branchName, "feature/cambiar-titulo-manualmente");
  assert.equal(regeneratedBody.commitDescription, "Cambiar título manualmente");

  const statusChanged = await apiRequest(
    `/api/tickets/${ticketId}/status`,
    "PATCH",
    { status: "in_progress" },
    developer.token,
  );
  const statusBody = statusChanged.body as Record<string, unknown>;
  assert.equal(statusChanged.response.status, 200);
  assert.equal(statusBody.assigneeId, developer.id);

  const deleted = await apiRequest(`/api/tickets/${ticketId}`, "DELETE", undefined, admin.token);
  assert.equal(deleted.response.status, 200);
  const missing = await apiRequest(`/api/tickets/${ticketId}`, "GET", undefined, developer.token);
  assert.equal(missing.response.status, 404);
});

// Integra filtros compuestos, responsables y alertas calculadas con fechas vencidas/futuras.
test("filtros, alertas y sugerencias usan tickets persistidos", async () => {
  const developer = await registerAndLogin("Developer filtros", "developer-filters@example.com");
  const overdue = await createApiTicket(developer.token, {
    title: "Implementar búsqueda avanzada",
    description: "La API necesita filtros",
    type: "feature",
    priority: "high",
    status: "pending",
    dueDate: "2000-01-01",
  });
  const completed = await createApiTicket(developer.token, {
    title: "Bug ya resuelto",
    description: "Error de autenticación",
    type: "bug",
    priority: "urgent",
    status: "completed",
    dueDate: "2000-01-01",
  });
  const future = await createApiTicket(developer.token, {
    title: "Preparar servidor",
    description: "Configurar hosting seguro",
    type: "task",
    priority: "low",
    status: "pending",
    dueDate: "2099-01-01",
  });
  const overdueId = (overdue.body as { id: number }).id;
  const completedId = (completed.body as { id: number }).id;

  const overdueDetail = await apiRequest(`/api/tickets/${overdueId}`, "GET", undefined, developer.token);
  const completedDetail = await apiRequest(`/api/tickets/${completedId}`, "GET", undefined, developer.token);
  assert.equal((overdueDetail.body as Record<string, unknown>).alert, true);
  assert.equal((completedDetail.body as Record<string, unknown>).alert, false);

  const filtered = await apiRequest(
    "/api/tickets?search=implementar&status=pending&priority=high&type=feature",
    "GET",
    undefined,
    developer.token,
  );
  const filteredTickets = filtered.body as Array<Record<string, unknown>>;
  assert.equal(filtered.response.status, 200);
  assert.deepEqual(filteredTickets.map((ticket) => ticket.id), [overdueId]);
  assert.equal(filteredTickets[0].branchName, "feature/implementar-busqueda-avanzada");
  assert.equal(filteredTickets[0].commitType, "feat");

  const hostingSearch = await apiRequest("/api/tickets?search=hosting", "GET", undefined, developer.token);
  assert.deepEqual((hostingSearch.body as Array<{ id: number }>).map((ticket) => ticket.id), [
    (future.body as { id: number }).id,
  ]);

  const unassigned = await apiRequest("/api/tickets?unassigned=true", "GET", undefined, developer.token);
  assert.equal((unassigned.body as unknown[]).length, 3);
  const statusChanged = await apiRequest(`/api/tickets/${overdueId}/status`, "PATCH", { status: "in_progress" }, developer.token);
  assert.equal(statusChanged.response.status, 200);

  const byAssignee = await apiRequest(
    `/api/tickets?assigneeId=${developer.id}&mine=true&status=in_progress`,
    "GET",
    undefined,
    developer.token,
  );
  assert.deepEqual((byAssignee.body as Array<{ id: number }>).map((ticket) => ticket.id), [overdueId]);
});

// Extrae el nombre de la base de una URI sin mostrar credenciales ni otros datos de conexión.
function databaseName(connectionString: string): string {
  return decodeURIComponent(new URL(connectionString).pathname.replace(/^\//, ""));
}

// Compara servidor y base, sin incluir usuario, contraseña ni parámetros de la URI.
function databaseIdentity(connectionString: string): string {
  const url = new URL(connectionString);
  return `${url.protocol}//${url.hostname.toLowerCase()}:${url.port || "5432"}/${databaseName(connectionString).toLowerCase()}`;
}

// Envía una solicitud JSON a la API levantada contra la base PostgreSQL de pruebas.
async function apiRequest(
  path: string,
  method = "GET",
  body?: unknown,
  token?: string,
): Promise<{ response: Response; body: unknown }> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, body: await response.json() as unknown };
}

// Registra y autentica un developer por las rutas HTTP públicas.
async function registerAndLogin(name: string, email: string): Promise<{ id: number; token: string }> {
  const registration = await apiRequest("/api/auth/register", "POST", {
    name,
    email,
    password: "clave-de-integracion",
  });
  assert.equal(registration.response.status, 201);
  const user = registration.body as { id: number };
  const login = await apiRequest("/api/auth/login", "POST", {
    email,
    password: "clave-de-integracion",
  });
  assert.equal(login.response.status, 200);
  return { id: user.id, token: (login.body as { token: string }).token };
}

// Crea un admin fixture persistido y obtiene su JWT iniciando sesión contra la API.
async function createAdminAndLogin(email: string): Promise<{ id: number; token: string }> {
  const password = "clave-admin-integracion";
  const user = await User.create({
    name: "Admin de integración",
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: "admin",
  });
  const login = await apiRequest("/api/auth/login", "POST", { email, password });
  assert.equal(login.response.status, 200);
  return { id: user.id, token: (login.body as { token: string }).token };
}

// Crea tickets por HTTP con los campos base y las variaciones del caso de prueba.
async function createApiTicket(token: string, fields: Record<string, unknown>): Promise<{ response: Response; body: unknown }> {
  return apiRequest(
    "/api/tickets",
    "POST",
    {
      title: "Ticket integrado",
      type: "task",
      priority: "medium",
      status: "pending",
      dueDate: "2099-01-01",
      ...fields,
    },
    token,
  );
}
