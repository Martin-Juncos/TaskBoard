import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import { after, before, test } from "node:test";
import { HttpError } from "../src/errors/http-error";
import errorHandler from "../src/middleware/error-handler";

// Usa una aplicación aislada para probar el manejador sin agregar rutas auxiliares a producción.
const testApp = express();

// Crea rutas de prueba que provocan errores sin agregar endpoints de prueba a la aplicación real.
testApp.get("/error-conocido", () => {
  throw new HttpError(409, "CONFLICTO", "La operación no se puede completar");
});
testApp.get("/error-inesperado", () => {
  throw new Error("Este detalle interno no debe llegar al cliente");
});

// Instala el middleware después de las rutas para probar el flujo de manejo global de Express.
testApp.use(errorHandler);

let baseUrl: string;
let server: ReturnType<typeof testApp.listen>;

// Abre el servidor de pruebas en un puerto libre para ejecutar solicitudes HTTP reales.
before(async () => {
  server = testApp.listen(0);

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;
});

// Cierra el servidor de pruebas para que no queden conexiones abiertas al terminar.
after(async () => {
  if (!server) return;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

// Verifica que HttpError conserva su estado y entrega el formato acordado.
test("responde errores HTTP conocidos con código y mensaje", async () => {
  const response = await fetch(`${baseUrl}/error-conocido`);

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: {
      code: "CONFLICTO",
      message: "La operación no se puede completar",
    },
  });
});

// Evita revelar detalles internos cuando ocurre una excepción no prevista.
test("oculta detalles de errores inesperados y responde 500", async () => {
  const response = await fetch(`${baseUrl}/error-inesperado`);

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: {
      code: "ERROR_INTERNO",
      message: "Ocurrió un error inesperado.",
    },
  });
});
