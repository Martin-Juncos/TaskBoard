import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpError } from "../src/errors/http-error";
import type { User } from "../src/models/user";
import type { UserRepository } from "../src/repositories/user-repository";
import { ChangeUserRoleService } from "../src/services/user-service";

// Impide cambiar roles desde el servicio para un developer, aun si se omite el middleware de ruta.
test("ChangeUserRoleService exige admin antes de persistir", async () => {
  let updateCalled = false;
  const service = new ChangeUserRoleService({
    updateRole: async () => {
      updateCalled = true;
      return { id: 2, name: "Dev", email: "dev@example.com", role: "admin" } as User;
    },
  } as Pick<UserRepository, "updateRole">);

  await assert.rejects(
    service.execute("2", "admin", { id: 2, role: "developer" }),
    (error: unknown) => error instanceof HttpError && error.statusCode === 403 && error.code === "PERMISO_DENEGADO",
  );
  assert.equal(updateCalled, false);
});

// Permite al administrador continuar con la validación y el cambio de rol existente.
test("ChangeUserRoleService permite admin", async () => {
  const service = new ChangeUserRoleService({
    updateRole: async (id: number, role: "admin" | "developer") => ({
      id,
      name: "Dev",
      email: "dev@example.com",
      role,
    }) as User,
  } as Pick<UserRepository, "updateRole">);

  const user = await service.execute("2", "admin", { id: 1, role: "admin" });
  assert.equal(user.role, "admin");
});
