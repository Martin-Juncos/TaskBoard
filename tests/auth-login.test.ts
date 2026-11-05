import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createApp } from "../src/app";
import { createLoginUserController } from "../src/controllers/auth-controller";
import type { User } from "../src/models/user";
import { LoginUserService } from "../src/services/login-user-service";
import { verifyAccessToken } from "../src/utils/jwt";

const testSettings = {
  jwtSecret: "clave-de-prueba-larga-y-local",
  jwtExpiresIn: "1h",
};

let storedUser: User;
let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;

// Prepara un hash real y monta la ruta de login con un repositorio aislado en memoria.
before(async () => {
  storedUser = {
    id: 41,
    name: "Usuario de prueba",
    email: "login@example.com",
    passwordHash: await bcrypt.hash("clave-correcta", 10),
    role: "developer",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as User;

  const repository = {
    findByEmail: async (email: string) => (email === storedUser.email ? storedUser : null),
  };
  const loginService = new LoginUserService(repository, testSettings);
  const app = createApp({ login: createLoginUserController(loginService) });
  server = app.listen(0);

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;
});

// Cierra el servidor de prueba para no dejar conexiones abiertas.
after(async () => {
  if (!server) return;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

// Comprueba que las credenciales correctas devuelven un token firmado con el ID y rol actuales.
test("inicia sesión con email y contraseña correctos", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: " LOGIN@EXAMPLE.COM ", password: "clave-correcta" }),
  });
  const body = (await response.json()) as { token: string };

  assert.equal(response.status, 200);
  assert.equal(typeof body.token, "string");
  assert.deepEqual(verifyAccessToken(body.token, testSettings), {
    userId: storedUser.id,
    role: storedUser.role,
  });
});

// Responde con el mismo error genérico cuando el email no existe.
test("rechaza un email inexistente", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "no-existe@example.com", password: "clave-correcta" }),
  });
  const body = (await response.json()) as { error: { code: string; message: string } };

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "CREDENCIALES_INVALIDAS");
  assert.equal(body.error.message, "El email o la contraseña son incorrectos.");
});

// Responde igual si el email existe pero la contraseña no coincide.
test("rechaza una contraseña incorrecta", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "login@example.com", password: "clave-incorrecta" }),
  });
  const body = (await response.json()) as { error: { code: string; message: string } };

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "CREDENCIALES_INVALIDAS");
  assert.equal(body.error.message, "El email o la contraseña son incorrectos.");
});
