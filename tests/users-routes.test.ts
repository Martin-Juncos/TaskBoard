import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createApp } from "../src/app";
import { createChangeUserRoleController, createListUsersController } from "../src/controllers/user-controller";
import { createAuthenticationMiddleware } from "../src/middleware/authentication";
import { createRoleAuthorizationMiddleware } from "../src/middleware/authorize-role";
import type { User } from "../src/models/user";
import { ChangeUserRoleService, ListUsersService } from "../src/services/user-service";
import { signAccessToken } from "../src/utils/jwt";

const settings = { jwtSecret: "secreto-local-de-pruebas", jwtExpiresIn: "1h" };
const users = new Map<number, User>([
  [1, { id: 1, name: "Admin", email: "admin@example.com", passwordHash: "hash-admin", role: "admin" } as User],
  [2, { id: 2, name: "Dev", email: "dev@example.com", passwordHash: "hash-dev", role: "developer" } as User],
]);
let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;

// Monta el flujo completo de rutas con repositorio en memoria, sin conectar una base real.
before(async () => {
  const repository = {
    findById: async (id: number) => users.get(id) ?? null,
    findAll: async () => [...users.values()].sort((a, b) => a.id - b.id),
    updateRole: async (id: number, role: "admin" | "developer") => {
      const user = users.get(id);
      if (!user) return null;
      user.role = role;
      return user;
    },
  };
  const app = createApp({
    users: {
      authenticate: createAuthenticationMiddleware(repository, settings),
      requireAdmin: createRoleAuthorizationMiddleware("admin"),
      list: createListUsersController(new ListUsersService(repository)),
      updateRole: createChangeUserRoleController(new ChangeUserRoleService(repository)),
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

// Cierra el servidor local de pruebas al terminar los casos.
after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

// Rechaza la lista de usuarios si la solicitud no tiene una identidad autenticada.
test("GET /api/users requiere token", async () => {
  const response = await fetch(`${baseUrl}/api/users`);
  assert.equal(response.status, 401);
});

// Devuelve solo campos públicos a cualquier usuario autenticado.
test("GET /api/users lista datos sin hashes de contraseña", async () => {
  const token = signAccessToken({ userId: 2, role: "developer" }, settings);
  const response = await fetch(`${baseUrl}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
  const body = (await response.json()) as Array<Record<string, unknown>>;
  assert.equal(response.status, 200);
  assert.equal(body.length, 2);
  assert.equal("passwordHash" in body[0], false);
  assert.deepEqual(Object.keys(body[0]).sort(), ["email", "id", "name", "role"]);
});

// Impide que un developer cambie roles aunque tenga un token válido.
test("PATCH /api/users/:id/role es exclusivo de administradores", async () => {
  const token = signAccessToken({ userId: 2, role: "developer" }, settings);
  const response = await fetch(`${baseUrl}/api/users/2/role`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "admin" }),
  });
  assert.equal(response.status, 403);
});

// Permite al administrador actualizar un rol y devuelve únicamente datos públicos.
test("PATCH /api/users/:id/role actualiza el rol con admin", async () => {
  const token = signAccessToken({ userId: 1, role: "admin" }, settings);
  const response = await fetch(`${baseUrl}/api/users/2/role`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "admin" }),
  });
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(response.status, 200);
  assert.equal(body.role, "admin");
  assert.equal("passwordHash" in body, false);
});

// Rechaza roles fuera del catálogo admitido y usuarios inexistentes.
test("PATCH /api/users/:id/role valida rol e ID existente", async () => {
  const token = signAccessToken({ userId: 1, role: "admin" }, settings);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const invalidRole = await fetch(`${baseUrl}/api/users/2/role`, {
    method: "PATCH", headers, body: JSON.stringify({ role: "owner" }),
  });
  const missingUser = await fetch(`${baseUrl}/api/users/999/role`, {
    method: "PATCH", headers, body: JSON.stringify({ role: "developer" }),
  });
  assert.equal(invalidRole.status, 400);
  assert.equal(missingUser.status, 404);
});
