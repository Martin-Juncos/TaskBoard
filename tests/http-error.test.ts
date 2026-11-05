import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpError } from "../src/errors/http-error";

// Comprueba que el error conserva todos los datos que luego necesitará el middleware HTTP.
test("crea un error HTTP con estado, código y mensaje", () => {
  const error = new HttpError(404, "RECURSO_NO_ENCONTRADO", "El recurso no existe");

  assert.ok(error instanceof Error);
  assert.ok(error instanceof HttpError);
  assert.equal(error.name, "HttpError");
  assert.equal(error.statusCode, 404);
  assert.equal(error.code, "RECURSO_NO_ENCONTRADO");
  assert.equal(error.message, "El recurso no existe");
});
