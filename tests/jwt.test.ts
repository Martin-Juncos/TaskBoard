import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { test } from "node:test";
import { HttpError } from "../src/errors/http-error";
import { signAccessToken, verifyAccessToken } from "../src/utils/jwt";

const testSettings = {
  jwtSecret: "clave-de-prueba-larga-y-local",
  jwtExpiresIn: "1h",
};

// Comprueba que los claims admitidos se conservan en un token firmado y verificado.
test("firma y verifica el ID y rol del usuario", () => {
  const token = signAccessToken({ userId: 42, role: "developer" }, testSettings);

  assert.deepEqual(verifyAccessToken(token, testSettings), {
    userId: 42,
    role: "developer",
  });
});

// Devuelve el error HTTP 401 esperado si un token fue alterado o firmado con otra clave.
test("rechaza tokens con firma inválida", () => {
  const token = signAccessToken({ userId: 42, role: "admin" }, testSettings);

  assert.throws(
    () => verifyAccessToken(token, { ...testSettings, jwtSecret: "otra-clave-secreta" }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 401);
      assert.equal(error.code, "TOKEN_INVALIDO");
      return true;
    },
  );
});

// Verifica que la expiración configurada también se aplica durante la verificación.
test("rechaza tokens vencidos", () => {
  const expiredToken = signAccessToken(
    { userId: 42, role: "developer" },
    { ...testSettings, jwtExpiresIn: "-1s" },
  );

  assert.throws(() => verifyAccessToken(expiredToken, testSettings), {
    code: "TOKEN_INVALIDO",
    statusCode: 401,
  });
});

// No acepta roles ajenos al contrato aunque el token tenga una firma válida.
test("rechaza claims con roles no reconocidos", () => {
  const invalidRoleToken = jwt.sign({ role: "owner" }, testSettings.jwtSecret, {
    algorithm: "HS256",
    subject: "42",
    expiresIn: "1h",
  });

  assert.throws(() => verifyAccessToken(invalidRoleToken, testSettings), {
    code: "TOKEN_INVALIDO",
    statusCode: 401,
  });
});
