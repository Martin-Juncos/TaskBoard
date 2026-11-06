import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import { after, before, test } from "node:test";
import errorHandler from "../src/middleware/error-handler";
import { createAuthenticationMiddleware } from "../src/middleware/authentication";
import type { User } from "../src/models/user";
import { signAccessToken } from "../src/utils/jwt";

const testSettings = {
  jwtSecret: "clave-de-prueba-larga-y-local",
  jwtExpiresIn: "1h",
};
const users = new Map<number, User>([
  [
    7,
    {
      id: 7,
      name: "Admin actual",
      email: "admin@example.com",
      passwordHash: "hash-privado",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User,
  ],
]);

// Inyecta una búsqueda falsa para probar el middleware sin conectarse a PostgreSQL.
const repository = {
  findById: async (id: number) => users.get(id) ?? null,
};
const app = express();
app.get(
  "/privado",
  createAuthenticationMiddleware(repository, testSettings),
  (request, response) => {
    response.json(request.user);
  },
);
app.use(errorHandler);

let baseUrl: string;
let server: ReturnType<typeof app.listen>;

// Inicia el servidor de pruebas en un puerto libre.
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

// Cierra el servidor para no dejar conexiones abiertas al terminar las pruebas.
after(async () => {
  if (!server) return;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

// Rechaza solicitudes sin un token Bearer.
test("rechaza solicitudes sin token", async () => {
  const response = await fetch(`${baseUrl}/privado`);
  const body = (await response.json()) as { error: { code: string } };

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "TOKEN_REQUERIDO");
});

// Adjunta a la solicitud la identidad vigente recuperada desde el repositorio.
test("verifica el token y coloca el usuario en la solicitud", async () => {
  const token = signAccessToken({ userId: 7, role: "developer" }, testSettings);
  const response = await fetch(`${baseUrl}/privado`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await response.json()) as { id: number; role: string };

  assert.equal(response.status, 200);
  assert.deepEqual(body, { id: 7, role: "admin" });
  assert.equal("passwordHash" in body, false);
});

// Rechaza tokens vencidos antes de continuar hacia la ruta protegida.
test("rechaza un token vencido", async () => {
  const expiredToken = signAccessToken(
    { userId: 7, role: "admin" },
    { ...testSettings, jwtExpiresIn: "-1s" },
  );
  const response = await fetch(`${baseUrl}/privado`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  const body = (await response.json()) as { error: { code: string } };

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "TOKEN_INVALIDO");
});

// Rechaza un token cuya firma no corresponde al secreto configurado.
test("rechaza un token con firma inválida", async () => {
  const token = signAccessToken(
    { userId: 7, role: "admin" },
    {
      ...testSettings,
      jwtSecret: "otro-secreto-distinto",
    },
  );
  const response = await fetch(`${baseUrl}/privado`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await response.json()) as { error: { code: string } };

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "TOKEN_INVALIDO");
});

// Rechaza un token válido en firma si el usuario fue eliminado de la base.
test("rechaza tokens de usuarios que ya no existen", async () => {
  const token = signAccessToken({ userId: 99, role: "developer" }, testSettings);
  const response = await fetch(`${baseUrl}/privado`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await response.json()) as { error: { code: string } };

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "TOKEN_INVALIDO");
});
