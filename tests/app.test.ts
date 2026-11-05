import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import app from "../src/app";

let baseUrl: string;
let server: ReturnType<typeof app.listen>;

before(async () => {
  server = app.listen(0);

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");

  baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;
});

after(async () => {
  if (!server) return;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

// Comprueba el contrato completo del endpoint de salud: código, formato y contenido.
test("responde el estado de salud de la API", async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("acepta JSON válido y devuelve 404 para una ruta aún no implementada", async () => {
  const response = await fetch(`${baseUrl}/api/no-implementada`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo: "Tarea de prueba" }),
  });

  assert.equal(response.status, 404);
});

// Comprueba que el middleware global traduce el JSON inválido al formato de error acordado.
test("rechaza solicitudes con JSON malformado", async () => {
  const response = await fetch(`${baseUrl}/api/no-implementada`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"titulo":',
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "JSON_INVALIDO",
      message: "El cuerpo de la solicitud contiene JSON inválido.",
    },
  });
});
