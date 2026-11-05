import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { test } from "node:test";
import { UniqueConstraintError } from "sequelize";
import { HttpError } from "../src/errors/http-error";
import type { User } from "../src/models/user";
import type { CreateUserRecord } from "../src/repositories/user-repository";
import { RegisterUserService } from "../src/services/register-user-service";

// Construye un usuario falso para probar el servicio sin abrir una conexión a PostgreSQL.
function createFakeUser(input: CreateUserRecord): User {
  return {
    id: 12,
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    role: input.role,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  } as unknown as User;
}

// Confirma que el hash se calcula antes de guardar y que la respuesta nunca contiene el hash.
test("hashea la contraseña antes de crear el usuario", async () => {
  const steps: string[] = [];
  const repository = {
    findByEmail: async (email: string) => {
      steps.push(`buscar:${email}`);
      return null;
    },
    create: async (input: CreateUserRecord) => {
      steps.push("guardar");
      assert.equal(input.passwordHash, "hash-seguro");
      assert.equal(input.role, "developer");
      return createFakeUser(input);
    },
  };
  const service = new RegisterUserService(repository, async (password, rounds) => {
    steps.push("hashear");
    assert.equal(password, "clave de prueba");
    assert.equal(rounds, 10);
    return "hash-seguro";
  });

  const registeredUser = await service.execute({
    name: "Ana",
    email: "ana@example.com",
    password: "clave de prueba",
    role: "admin",
  });

  assert.deepEqual(steps, ["buscar:ana@example.com", "hashear", "guardar"]);
  assert.deepEqual(registeredUser, {
    id: 12,
    name: "Ana",
    email: "ana@example.com",
    role: "developer",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  assert.equal("passwordHash" in registeredUser, false);
});

// Comprueba que el servicio usa bcrypt real si no se inyecta un hasher alternativo.
test("guarda una contraseña con hash bcrypt", async () => {
  let savedUser: User | undefined;
  const repository = {
    findByEmail: async () => null,
    create: async (input: CreateUserRecord) => {
      savedUser = createFakeUser(input);
      return savedUser;
    },
  };
  const service = new RegisterUserService(repository);

  await service.execute({ name: "Luis", email: "luis@example.com", password: "mi-clave" });

  assert.ok(savedUser);
  assert.match(savedUser.passwordHash, /^\$2[aby]\$10\$/);
  assert.equal(await bcrypt.compare("mi-clave", savedUser.passwordHash), true);
});

// Rechaza emails ya existentes antes de hacer el hash o llamar al guardado.
test("responde HTTP 400 si el email ya existe", async () => {
  let hashCalls = 0;
  let createCalls = 0;
  const repository = {
    findByEmail: async () => createFakeUser({
      name: "Ana",
      email: "ana@example.com",
      passwordHash: "hash-existente",
      role: "developer",
    }),
    create: async (input: CreateUserRecord) => {
      createCalls += 1;
      return createFakeUser(input);
    },
  };
  const service = new RegisterUserService(repository, async () => {
    hashCalls += 1;
    return "hash";
  });

  await assert.rejects(
    service.execute({ name: "Ana", email: "ana@example.com", password: "clave" }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, "EMAIL_DUPLICADO");
      return true;
    },
  );
  assert.equal(hashCalls, 0);
  assert.equal(createCalls, 0);
});

// Convierte también la colisión UNIQUE de PostgreSQL en el mismo error HTTP 400.
test("responde HTTP 400 si otro registro crea el email durante la operación", async () => {
  const repository = {
    findByEmail: async () => null,
    create: async () => {
      throw new UniqueConstraintError({ fields: { email: "ana@example.com" } });
    },
  };
  const service = new RegisterUserService(repository, async () => "hash");

  await assert.rejects(
    service.execute({ name: "Ana", email: "ana@example.com", password: "clave" }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, "EMAIL_DUPLICADO");
      return true;
    },
  );
});
