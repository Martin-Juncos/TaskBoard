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

// La regeneración necesita autenticación, permisos de edición y un ticket existente.
test("POST /api/tickets/:id/regenerate-suggestions controla acceso e ID", async () => {
  const withoutToken = await fetch(`${baseUrl}/api/tickets/7/regenerate-suggestions`, {
    method: "POST",
  });
  assert.equal(withoutToken.status, 401);

  for (const [id, currentUser, expectedStatus, expectedCode] of [
    ["7", otherDeveloper, 403, "PERMISO_DENEGADO"],
    ["abc", user, 400, "ID_INVALIDO"],
    ["999", user, 404, "TICKET_NO_ENCONTRADO"],
  ] as const) {
    const response = await fetch(`${baseUrl}/api/tickets/${id}/regenerate-suggestions`, {
      method: "POST",
      headers: authorizationHeaders(currentUser),
    });
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(response.status, expectedStatus);
    assert.equal(body.error.code, expectedCode);
  }
});

// Usa título y tipo actuales para reemplazar sugerencias manuales, sin tocar el scope ni otros campos.
test("POST /api/tickets/:id/regenerate-suggestions actualiza las sugerencias explícitamente", async () => {
  const edit = await fetch(`${baseUrl}/api/tickets/7`, {
    method: "PUT",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Nueva función", type: "feature", commitScope: "api" }),
  });
  const before = (await edit.json()) as Record<string, unknown>;
  assert.equal(edit.status, 200);
  assert.equal(before.branchName, "chore/rama-manual");
  assert.equal(before.commitDescription, "Cambio manual");

  const response = await fetch(`${baseUrl}/api/tickets/7/regenerate-suggestions`, {
    method: "POST",
    headers: authorizationHeaders(),
  });
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(response.status, 200);
  assert.equal(body.branchType, "feature");
  assert.equal(body.branchName, "feature/nueva-funcion");
  assert.equal(body.commitType, "feat");
  assert.equal(body.commitDescription, "Nueva función");
  assert.equal(body.commitScope, "api");
  assert.equal(body.createdById, user.id);
  assert.equal(body.priority, "high");
});

// Un administrador puede regenerar sugerencias aunque no sea autor ni responsable.
test("POST /api/tickets/:id/regenerate-suggestions permite administrador", async () => {
  const response = await fetch(`${baseUrl}/api/tickets/9/regenerate-suggestions`, {
    method: "POST",
    headers: authorizationHeaders(admin),
  });
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(response.status, 200);
  assert.equal(body.branchType, "bugfix");
  assert.equal(body.commitType, "fix");
});

// Distingue propiedad y asignación: cualquiera de las dos habilita al developer, pero ninguna otra relación.
test("PUT /api/tickets/:id permite al developer editar solo tickets propios o asignados", async () => {
  const makeRecord = (createdById: number, assigneeId: number | null): CreateTicketRecord => ({
    title: "Ticket para verificar permisos",
    description: null,
    type: "task",
    priority: "medium",
    status: "pending",
    dueDate: "2099-01-01",
    createdById,
    assigneeId,
    branchType: "chore",
    branchName: "chore/verificar-permisos",
    commitType: "chore",
    commitScope: null,
    commitDescription: "Ticket para verificar permisos",
  });
  tickets.set(90, makeTicket(90, makeRecord(user.id, otherDeveloper.id)));
  tickets.set(91, makeTicket(91, makeRecord(otherDeveloper.id, user.id)));
  tickets.set(92, makeTicket(92, makeRecord(user.id, admin.id)));

  const ownerEdit = await fetch(`${baseUrl}/api/tickets/90`, {
    method: "PUT",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Editado por ser propio" }),
  });
  assert.equal(ownerEdit.status, 200);

  const assigneeEdit = await fetch(`${baseUrl}/api/tickets/91`, {
    method: "PUT",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Editado por estar asignado" }),
  });
  assert.equal(assigneeEdit.status, 200);

  const unrelatedEdit = await fetch(`${baseUrl}/api/tickets/92`, {
    method: "PUT",
    headers: { ...authorizationHeaders(otherDeveloper), "Content-Type": "application/json" },
    body: JSON.stringify({ title: "No autorizado" }),
  });
  const deniedBody = (await unrelatedEdit.json()) as { error: { code: string } };
  assert.equal(unrelatedEdit.status, 403);
  assert.equal(deniedBody.error.code, "PERMISO_DENEGADO");

  const adminEdit = await fetch(`${baseUrl}/api/tickets/92`, {
    method: "PUT",
    headers: { ...authorizationHeaders(admin), "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Editado por admin" }),
  });
  assert.equal(adminEdit.status, 200);

  tickets.delete(90);
  tickets.delete(91);
  tickets.delete(92);
});
