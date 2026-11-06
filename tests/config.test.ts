import assert from "node:assert/strict";
import { test } from "node:test";
import { readConfig } from "../src/config/env";

// Comprueba que el módulo transforma las variables de entorno en la configuración esperada.
test("lee la configuración desde las variables de entorno", () => {
  const config = readConfig({
    PORT: "4000",
    DATABASE_URL: "postgres://localhost/taskboard",
    DATABASE_URL_TEST: "postgres://localhost/taskboard_test",
    JWT_SECRET: "secreto-de-prueba",
    JWT_EXPIRES_IN: "1h",
  });

  assert.deepEqual(config, {
    port: 4000,
    databaseUrl: "postgres://localhost/taskboard",
    databaseUrlTest: "postgres://localhost/taskboard_test",
    jwtSecret: "secreto-de-prueba",
    jwtExpiresIn: "1h",
  });
});

// Conserva el comportamiento anterior: si PORT no está definido, utiliza el puerto 3000.
test("usa el puerto 3000 cuando PORT no está definido", () => {
  const config = readConfig({
    DATABASE_URL: "postgres://localhost/taskboard",
    JWT_SECRET: "secreto-de-prueba",
    JWT_EXPIRES_IN: "1h",
  });

  assert.equal(config.port, 3000);
});

// Explica exactamente cuál variable obligatoria falta para facilitar la configuración local.
test("informa cuando falta una variable obligatoria", () => {
  assert.throws(
    () =>
      readConfig({
        DATABASE_URL: "postgres://localhost/taskboard",
        JWT_EXPIRES_IN: "1h",
      }),
    {
      message: "Faltan variables de entorno obligatorias: JWT_SECRET",
    },
  );
});

// Informa todas las ausencias juntas para evitar corregirlas de una en una.
test("informa todas las variables obligatorias ausentes", () => {
  assert.throws(() => readConfig({}), {
    message: "Faltan variables de entorno obligatorias: DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN",
  });
});
