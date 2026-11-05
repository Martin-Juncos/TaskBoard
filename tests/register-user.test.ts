import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpError } from "../src/errors/http-error";
import { validateRegisterUserInput } from "../src/validation/register-user";

// Acepta datos válidos, normaliza nombre/email y no devuelve un rol controlado por el cliente.
test("valida y normaliza los datos obligatorios de registro", () => {
  const result = validateRegisterUserInput({
    name: "  Ana Pérez  ",
    email: "  Ana@Example.com ",
    password: "  clave de prueba  ",
    role: "admin",
  });

  assert.deepEqual(result, {
    name: "Ana Pérez",
    email: "ana@example.com",
    password: "  clave de prueba  ",
  });
});

// Devuelve un error HTTP 400 que identifica los datos obligatorios ausentes.
test("rechaza un registro sin nombre, email ni contraseña", () => {
  assert.throws(
    () => validateRegisterUserInput({}),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, "VALIDACION_REGISTRO");
      assert.equal(error.message, "Los campos obligatorios son: name, email, password.");
      return true;
    },
  );
});

// Rechaza un email que no puede corresponder a una dirección válida.
test("rechaza un email con formato inválido", () => {
  assert.throws(
    () =>
      validateRegisterUserInput({
        name: "Ana",
        email: "no-es-un-email",
        password: "clave",
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, "EMAIL_INVALIDO");
      return true;
    },
  );
});
