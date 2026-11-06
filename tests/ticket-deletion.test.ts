import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import {
  authorizationHeaders,
  admin,
  startTicketTestServer,
  stopTicketTestServer,
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

// Solo un administrador puede borrar; distingue credenciales, ID inválido y ticket ausente.
test("DELETE /api/tickets/:id controla autenticación, rol y errores", async () => {
  const withoutToken = await fetch(`${baseUrl}/api/tickets/7`, { method: "DELETE" });
  assert.equal(withoutToken.status, 401);

  const forbidden = await fetch(`${baseUrl}/api/tickets/7`, {
    method: "DELETE",
    headers: authorizationHeaders(),
  });
  const forbiddenBody = (await forbidden.json()) as { error: { code: string } };
  assert.equal(forbidden.status, 403);
  assert.equal(forbiddenBody.error.code, "PERMISO_DENEGADO");

  for (const [id, expectedStatus, expectedCode] of [
    ["abc", 400, "ID_INVALIDO"],
    ["999", 404, "TICKET_NO_ENCONTRADO"],
  ] as const) {
    const response = await fetch(`${baseUrl}/api/tickets/${id}`, {
      method: "DELETE",
      headers: authorizationHeaders(admin),
    });
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(response.status, expectedStatus);
    assert.equal(body.error.code, expectedCode);
  }
});

// Recorre el ciclo crear, consultar, actualizar y borrar usando los endpoints HTTP reales.
test("CRUD de tickets completa el ciclo con 201, 200 y 404 final", async () => {
  const createdResponse = await fetch(`${baseUrl}/api/tickets`, {
    method: "POST",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "CRUD de extremo a extremo",
      type: "task",
      priority: "medium",
      status: "pending",
      dueDate: "2099-01-01",
    }),
  });
  const created = (await createdResponse.json()) as Record<string, unknown>;
  assert.equal(createdResponse.status, 201);
  assert.equal(typeof created.id, "number");
  const id = created.id as number;

  const foundResponse = await fetch(`${baseUrl}/api/tickets/${id}`, {
    headers: authorizationHeaders(),
  });
  const found = (await foundResponse.json()) as Record<string, unknown>;
  assert.equal(foundResponse.status, 200);
  assert.equal(found.title, "CRUD de extremo a extremo");

  const updatedResponse = await fetch(`${baseUrl}/api/tickets/${id}`, {
    method: "PUT",
    headers: { ...authorizationHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ title: "CRUD actualizado" }),
  });
  const updated = (await updatedResponse.json()) as Record<string, unknown>;
  assert.equal(updatedResponse.status, 200);
  assert.equal(updated.title, "CRUD actualizado");

  const deletedResponse = await fetch(`${baseUrl}/api/tickets/${id}`, {
    method: "DELETE",
    headers: authorizationHeaders(admin),
  });
  const deleted = (await deletedResponse.json()) as { message: string };
  assert.equal(deletedResponse.status, 200);
  assert.equal(deleted.message, "Ticket eliminado correctamente.");

  const missingResponse = await fetch(`${baseUrl}/api/tickets/${id}`, {
    headers: authorizationHeaders(),
  });
  const missing = (await missingResponse.json()) as { error: { code: string } };
  assert.equal(missingResponse.status, 404);
  assert.equal(missing.error.code, "TICKET_NO_ENCONTRADO");
});
