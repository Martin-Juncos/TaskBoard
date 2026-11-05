import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_USER_ROLE, USER_ROLES } from "../src/types/user-role";

// Mantiene los únicos roles admitidos y el rol predeterminado acordado para registros públicos.
test("define admin y developer, y asigna developer por defecto", () => {
  assert.deepEqual(USER_ROLES, ["admin", "developer"]);
  assert.equal(DEFAULT_USER_ROLE, "developer");
});
