import assert from "node:assert/strict";
import { test } from "node:test";
import { readConfig } from "../src/config/env";

// Comprueba que el módulo transforma las variables de entorno en la configuración esperada.
test("lee la configuración desde las variables de entorno", () => {
  const config = readConfig({
    PORT: "4000",
    DATABASE_URL: "postgres://localhost/taskboard",
    JWT_SECRET: "secreto-de-prueba",
    JWT_EXPIRES_IN: "1h",
  });

  assert.deepEqual(config, {
    port: 4000,
    databaseUrl: "postgres://localhost/taskboard",
    jwtSecret: "secreto-de-prueba",
    jwtExpiresIn: "1h",
  });
});

// Conserva el comportamiento anterior: si PORT no está definido, utiliza el puerto 3000.
test("usa el puerto 3000 cuando PORT no está definido", () => {
  const config = readConfig({});

  assert.equal(config.port, 3000);
});
