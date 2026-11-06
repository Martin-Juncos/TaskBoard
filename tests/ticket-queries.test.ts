import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import {
  authorizationHeaders,
  startTicketTestServer,
  stopTicketTestServer,
  user,
} from "./helpers/ticket-routes";

let baseUrl: string;
let server: Server;

before(async () => {
  const context = await startTicketTestServer();
  baseUrl = context.baseUrl;
  server = context.server;
});

after(async () => {
  await stopTicketTestServer(server);
});

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
  const response = await fetch(`${baseUrl}/api/tickets?search=%20%20`, {
    headers: authorizationHeaders(),
  });
  const body = (await response.json()) as Array<{ id: number }>;

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.map((ticket) => ticket.id),
    [7, 8, 9],
  );
});

// Devuelve una columna por estado y mantiene vacías las columnas sin tickets.
test("GET /api/tickets?groupBy=status agrupa tickets por estado", async () => {
  const response = await fetch(`${baseUrl}/api/tickets?groupBy=status`, {
    headers: authorizationHeaders(),
  });
  const body = (await response.json()) as Record<string, Array<{ id: number }>>;

  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(body), [
    "pending",
    "in_progress",
    "in_review",
    "completed",
    "blocked",
  ]);
  assert.deepEqual(
    body.pending.map((ticket) => ticket.id),
    [7, 8],
  );
  assert.deepEqual(
    body.blocked.map((ticket) => ticket.id),
    [9],
  );
  assert.deepEqual(body.completed, []);
});

// Agrupa después de aplicar los filtros existentes, sin perder las columnas vacías.
test("GET /api/tickets combina agrupación y filtros", async () => {
  const response = await fetch(
    `${baseUrl}/api/tickets?groupBy=status&status=blocked&unassigned=true`,
    {
      headers: authorizationHeaders(),
    },
  );
  const body = (await response.json()) as Record<string, Array<{ id: number }>>;

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.blocked.map((ticket) => ticket.id),
    [9],
  );
  assert.deepEqual(body.pending, []);
});

// Busca sin distinguir mayúsculas y encuentra coincidencias en el título o la descripción.
test("GET /api/tickets?search busca en título y descripción", async () => {
  const titleResponse = await fetch(`${baseUrl}/api/tickets?search=AGREGAR`, {
    headers: authorizationHeaders(),
  });
  const titleResults = (await titleResponse.json()) as Array<{ id: number }>;
  const descriptionResponse = await fetch(`${baseUrl}/api/tickets?search=API`, {
    headers: authorizationHeaders(),
  });
  const descriptionResults = (await descriptionResponse.json()) as Array<{ id: number }>;

  assert.equal(titleResponse.status, 200);
  assert.deepEqual(
    titleResults.map((ticket) => ticket.id),
    [8],
  );
  assert.equal(descriptionResponse.status, 200);
  assert.deepEqual(
    descriptionResults.map((ticket) => ticket.id),
    [7],
  );
});

// Combina status, priority y type como condiciones AND, y también con search si se envía.
test("GET /api/tickets combina status, priority y type", async () => {
  const match = await fetch(`${baseUrl}/api/tickets?status=pending&priority=high&type=feature`, {
    headers: authorizationHeaders(),
  });
  const matchResults = (await match.json()) as Array<{ id: number }>;
  const noMatch = await fetch(
    `${baseUrl}/api/tickets?status=blocked&priority=urgent&type=feature`,
    {
      headers: authorizationHeaders(),
    },
  );
  const noMatchResults = (await noMatch.json()) as Array<{ id: number }>;
  const combinedSearch = await fetch(
    `${baseUrl}/api/tickets?search=API&status=pending&priority=medium&type=task`,
    {
      headers: authorizationHeaders(),
    },
  );
  const combinedSearchResults = (await combinedSearch.json()) as Array<{ id: number }>;

  assert.deepEqual(
    matchResults.map((ticket) => ticket.id),
    [8],
  );
  assert.deepEqual(noMatchResults, []);
  assert.deepEqual(
    combinedSearchResults.map((ticket) => ticket.id),
    [7],
  );
});

// Filtra responsable por ID, tickets asignados al usuario autenticado y tickets sin asignar.
test("GET /api/tickets filtra responsable, mis tickets y sin asignar", async () => {
  const byAssignee = await fetch(`${baseUrl}/api/tickets?assigneeId=${user.id}`, {
    headers: authorizationHeaders(),
  });
  const assigneeResults = (await byAssignee.json()) as Array<{ id: number }>;
  const mine = await fetch(`${baseUrl}/api/tickets?mine=true`, { headers: authorizationHeaders() });
  const mineResults = (await mine.json()) as Array<{ id: number }>;
  const unassigned = await fetch(`${baseUrl}/api/tickets?unassigned=true`, {
    headers: authorizationHeaders(),
  });
  const unassignedResults = (await unassigned.json()) as Array<{ id: number }>;

  assert.deepEqual(
    assigneeResults.map((ticket) => ticket.id),
    [7],
  );
  assert.deepEqual(
    mineResults.map((ticket) => ticket.id),
    [7],
  );
  assert.deepEqual(
    unassignedResults.map((ticket) => ticket.id),
    [8, 9],
  );
});

// Rechaza términos repetidos o demasiado largos en lugar de interpretarlos ambiguamente.
test("GET /api/tickets valida el parámetro search", async () => {
  const repeated = await fetch(`${baseUrl}/api/tickets?search=uno&search=dos`, {
    headers: authorizationHeaders(),
  });
  const tooLong = await fetch(`${baseUrl}/api/tickets?search=${"a".repeat(201)}`, {
    headers: authorizationHeaders(),
  });
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
    const response = await fetch(`${baseUrl}/api/tickets?${query}`, {
      headers: authorizationHeaders(),
    });
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(response.status, 400);
    assert.equal(body.error.code, "FILTRO_INVALIDO");
  }
});
