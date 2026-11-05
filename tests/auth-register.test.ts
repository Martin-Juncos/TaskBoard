import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createRegisterUserController } from "../src/controllers/auth-controller";
import type { User } from "../src/models/user";
import type { CreateUserRecord } from "../src/repositories/user-repository";
import { RegisterUserService } from "../src/services/register-user-service";
import { createApp } from "../src/app";

// Usa un repositorio en memoria para probar el contrato HTTP sin una base de datos.
const usersByEmail = new Map<string, User>();
let nextUserId = 1;
const repository = {
  findByEmail: async (email: string) => usersByEmail.get(email) ?? null,
  create: async (input: CreateUserRecord) => {
    const now = new Date();
    const user = {
      id: nextUserId++,
      ...input,
      createdAt: now,
      updatedAt: now,
    } as unknown as User;

    usersByEmail.set(user.email, user);
    return user;
  },
};

// Monta la ruta real con el servicio de registro y el middleware de errores de la aplicación.
const service = new RegisterUserService(repository, async (_password, _rounds) => "hash-de-prueba");
const app = createApp(createRegisterUserController(service));
let baseUrl: string;
let server: ReturnType<typeof app.listen>;

// Inicia la aplicación de prueba en un puerto disponible para hacer solicitudes HTTP reales.
before(async () => {
  usersByEmail.set("duplicado@example.com", {
    id: 99,
    name: "Cuenta existente",
    email: "duplicado@example.com",
    passwordHash: "hash-privado",
    role: "developer",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User);

  server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;
});

// Cierra el servidor de prueba para no dejar conexiones abiertas después de los tests.
after(async () => {
  if (!server) return;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

// Comprueba que POST /api/auth/register crea una cuenta y devuelve solo datos públicos.
test("registra un usuario y responde 201", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "  Julia  ",
      email: " Julia@Example.com ",
      password: "clave de prueba",
      role: "admin",
    }),
  });
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 201);
  assert.equal(body.name, "Julia");
  assert.equal(body.email, "julia@example.com");
  assert.equal(body.role, "developer");
  assert.equal("passwordHash" in body, false);
});

// Comprueba que los datos obligatorios se validan y usan el formato JSON de error acordado.
test("rechaza datos inválidos con HTTP 400", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "", email: "", password: "" }),
  });
  const body = (await response.json()) as { error: { code: string; message: string } };

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "VALIDACION_REGISTRO");
});

// Comprueba que un email registrado se rechaza antes de volver a guardarlo.
test("rechaza un email duplicado con HTTP 400", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Otra persona",
      email: "duplicado@example.com",
      password: "clave de prueba",
    }),
  });
  const body = (await response.json()) as { error: { code: string; message: string } };

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "EMAIL_DUPLICADO");
});
