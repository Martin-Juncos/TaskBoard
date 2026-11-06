import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import {
  authorizationHeaders,
  admin,
  makeTicket,
  otherDeveloper,
  startTicketTestServer,
  stopTicketTestServer,
  tickets,
  user,
} from "./helpers/ticket-routes";
import type { CreateTicketRecord } from "../src/repositories/ticket-repository";

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

// Protege la ruta, valida el estado y responde errores claros para ID o ticket ausentes.
test("PATCH /api/tickets/:id/status requiere JWT y valida entrada", async () => {
  const withoutToken = await fetch(`${baseUrl}/api/tickets/7/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "completed" }),
  });
  assert.equal(withoutToken.status, 401);

  for (const [id, input, expectedStatus, expectedCode] of [
    ["999", { status: "completed" }, 404, "TICKET_NO_ENCONTRADO"],
    ["abc", { status: "completed" }, 400, "ID_INVALIDO"],
    ["7", {}, 400, "VALIDACION_TICKET"],
    ["7", { status: "queued" }, 400, "VALIDACION_TICKET"],
  ] as const) {
    const response = await fetch(`${baseUrl}/api/tickets/${id}/status`, {
      method: "PATCH",
      headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(response.status, expectedStatus);
    assert.equal(body.error.code, expectedCode);
  }
});

// El responsable puede cambiar su estado y un desarrollador que toma uno libre queda asignado.
test("PATCH /api/tickets/:id/status actualiza el estado y asigna tickets libres", async () => {
  const assigned = await fetch(`${baseUrl}/api/tickets/7/status`, {
    method: "PATCH",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ status: "in_review" }),
  });
  const assignedBody = (await assigned.json()) as Record<string, unknown>;
  assert.equal(assigned.status, 200);
  assert.equal(assignedBody.status, "in_review");
  assert.equal(assignedBody.assigneeId, user.id);

  const created = await fetch(`${baseUrl}/api/tickets`, {
    method: "POST",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Ticket libre para asignar",
      type: "task",
      priority: "medium",
      status: "pending",
      dueDate: "2099-01-01",
    }),
  });
  const createdBody = (await created.json()) as { id: number };
  assert.equal(created.status, 201);

  const unassigned = await fetch(`${baseUrl}/api/tickets/${createdBody.id}/status`, {
    method: "PATCH",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ status: "in_progress" }),
  });
  const unassignedBody = (await unassigned.json()) as Record<string, unknown>;
  assert.equal(unassigned.status, 200);
  assert.equal(unassignedBody.status, "in_progress");
  assert.equal(unassignedBody.assigneeId, user.id);
});

// Un desarrollador no cambia el estado ajeno; el administrador puede cambiar cualquier ticket.
test("PATCH /api/tickets/:id/status respeta permisos", async () => {
  const denied = await fetch(`${baseUrl}/api/tickets/7/status`, {
    method: "PATCH",
    headers: { ...authorizationHeaders(otherDeveloper), "Content-Type": "application/json" },
    body: JSON.stringify({ status: "blocked" }),
  });
  const deniedBody = (await denied.json()) as { error: { code: string } };
  assert.equal(denied.status, 403);
  assert.equal(deniedBody.error.code, "PERMISO_DENEGADO");

  const allowed = await fetch(`${baseUrl}/api/tickets/7/status`, {
    method: "PATCH",
    headers: { ...authorizationHeaders(admin), "Content-Type": "application/json" },
    body: JSON.stringify({ status: "completed" }),
  });
  const allowedBody = (await allowed.json()) as Record<string, unknown>;
  assert.equal(allowed.status, 200);
  assert.equal(allowedBody.status, "completed");
  assert.equal(allowedBody.completed, true);
});

// Solo el responsable actual cambia estado; un ticket libre pasa a estar asignado a quien lo toma.
test("PATCH /api/tickets/:id/status limita el cambio al responsable o al admin", async () => {
  const makeRecord = (createdById: number, assigneeId: number | null): CreateTicketRecord => ({
    title: "Ticket para validar estado",
    description: null,
    type: "task",
    priority: "medium",
    status: "pending",
    dueDate: "2099-01-01",
    createdById,
    assigneeId,
    branchType: "chore",
    branchName: "chore/validar-estado",
    commitType: "chore",
    commitScope: null,
    commitDescription: "Ticket para validar estado",
  });
  tickets.set(93, makeTicket(93, makeRecord(user.id, otherDeveloper.id)));
  tickets.set(94, makeTicket(94, makeRecord(otherDeveloper.id, user.id)));

  // Ser autor no autoriza a cambiar el estado si el ticket está asignado a otro desarrollador.
  const ownerDenied = await fetch(`${baseUrl}/api/tickets/93/status`, {
    method: "PATCH",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ status: "blocked" }),
  });
  assert.equal(ownerDenied.status, 403);

  // El responsable puede cambiarlo aunque otra persona haya creado el ticket.
  const assigneeAllowed = await fetch(`${baseUrl}/api/tickets/94/status`, {
    method: "PATCH",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ status: "in_review" }),
  });
  assert.equal(assigneeAllowed.status, 200);

  // El administrador puede cambiar el estado incluso si no es autor ni responsable.
  const adminAllowed = await fetch(`${baseUrl}/api/tickets/93/status`, {
    method: "PATCH",
    headers: { ...authorizationHeaders(admin), "Content-Type": "application/json" },
    body: JSON.stringify({ status: "blocked" }),
  });
  assert.equal(adminAllowed.status, 200);
  tickets.delete(93);
  tickets.delete(94);
});

// Un developer puede tomar un ticket libre para sí mismo, pero no asignárselo a otra persona.
test("PUT /api/tickets/:id permite autoasignación y rechaza asignación arbitraria", async () => {
  const makeRecord = (createdById: number): CreateTicketRecord => ({
    title: "Ticket libre",
    description: null,
    type: "task",
    priority: "medium",
    status: "pending",
    dueDate: "2099-01-01",
    createdById,
    assigneeId: null,
    branchType: "chore",
    branchName: "chore/ticket-libre",
    commitType: "chore",
    commitScope: null,
    commitDescription: "Ticket libre",
  });
  tickets.set(96, makeTicket(96, makeRecord(otherDeveloper.id)));
  tickets.set(97, makeTicket(97, makeRecord(otherDeveloper.id)));

  const denied = await fetch(`${baseUrl}/api/tickets/96`, {
    method: "PUT",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ assigneeId: otherDeveloper.id }),
  });
  assert.equal(denied.status, 403);

  const allowed = await fetch(`${baseUrl}/api/tickets/97`, {
    method: "PUT",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ assigneeId: user.id }),
  });
  const body = (await allowed.json()) as Record<string, unknown>;
  assert.equal(allowed.status, 200);
  assert.equal(body.assigneeId, user.id);
  tickets.delete(96);
  tickets.delete(97);
});
