import assert from "node:assert/strict";
import { test } from "node:test";
import { UserRepository, type UserLookupModel } from "../src/repositories/user-repository";
import type { User } from "../src/models/user";

// Usa un usuario simulado para probar las consultas sin abrir una conexión a PostgreSQL.
const testUser = {
  id: 7,
  name: "Ana Pérez",
  email: "ana@example.com",
  passwordHash: "hash-de-prueba",
  role: "developer",
} as User;

// Comprueba que el repositorio delega cada búsqueda en el método Sequelize correspondiente.
test("busca usuarios por ID y email", async () => {
  const calls: string[] = [];
  const userModel = {
    findByPk: async (id: number) => {
      calls.push(`id:${id}`);
      return testUser;
    },
    findOne: async ({ where }: { where: { email: string } }) => {
      calls.push(`email:${where.email}`);
      return testUser;
    },
  } as unknown as UserLookupModel;
  const repository = new UserRepository(userModel);

  assert.equal(await repository.findById(7), testUser);
  assert.equal(await repository.findByEmail("ana@example.com"), testUser);
  assert.deepEqual(calls, ["id:7", "email:ana@example.com"]);
});
