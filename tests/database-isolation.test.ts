import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import type { Sequelize } from "sequelize";
import type { User as UserModelType } from "../src/models/user";
import type { Ticket as TicketModelType } from "../src/models/ticket";

let sequelize: Sequelize;
let User: typeof UserModelType;
let Ticket: typeof TicketModelType;

// Verifica y prepara una conexión exclusiva a la base de pruebas antes de cargar modelos.
before(async () => {
  const testDatabaseUrl = process.env.DATABASE_URL_TEST?.trim();
  assert.ok(testDatabaseUrl, "Falta DATABASE_URL_TEST para ejecutar las pruebas de PostgreSQL.");

  const testDatabaseName = databaseName(testDatabaseUrl);
  assert.match(testDatabaseName, /_test$/i, "La base de pruebas debe terminar en _test.");
  const developmentDatabaseUrl = process.env.DATABASE_URL?.trim();
  if (developmentDatabaseUrl) {
    assert.notEqual(
      testDatabaseName.toLowerCase(),
      databaseName(developmentDatabaseUrl).toLowerCase(),
      "DATABASE_URL_TEST debe usar un nombre de base distinto al de DATABASE_URL.",
    );
    assert.notEqual(
      databaseIdentity(testDatabaseUrl),
      databaseIdentity(developmentDatabaseUrl),
      "DATABASE_URL_TEST no puede apuntar a la misma base que DATABASE_URL.",
    );
  }

  // Hace que el singleton de Sequelize usado por los modelos apunte a taskboard_test.
  process.env.DATABASE_URL = testDatabaseUrl;
  const databaseModule = await import("../src/database/sequelize");
  sequelize = databaseModule.sequelize;
  User = (await import("../src/models/user")).User;
  Ticket = (await import("../src/models/ticket")).Ticket;
  await sequelize.authenticate();
});

// Vacía ambas tablas y reinicia IDs para aislar cada caso de base de datos.
beforeEach(async () => {
  await sequelize.query('TRUNCATE TABLE "tickets", "users" RESTART IDENTITY CASCADE');
});

// Cierra la conexión a la base aislada después de ejecutar todos los casos.
after(async () => {
  await sequelize?.close();
});

// Inserta datos reales en PostgreSQL para comprobar que el siguiente caso recibe tablas vacías.
test("guarda fixtures en la base de pruebas aislada", async () => {
  const user = await User.create({
    name: "Usuario de prueba aislada",
    email: "aislamiento@example.com",
    passwordHash: "hash-de-prueba",
  });
  await Ticket.create({
    title: "Ticket de prueba aislada",
    description: null,
    type: "task",
    priority: "medium",
    status: "pending",
    dueDate: "2099-01-01",
    createdById: user.id,
    assigneeId: null,
    branchType: "chore",
    branchName: "chore/ticket-de-prueba-aislada",
    commitType: "chore",
    commitScope: null,
    commitDescription: "Ticket de prueba aislada",
  });

  assert.equal(await User.count(), 1);
  assert.equal(await Ticket.count(), 1);
});

// Confirma que el hook limpió usuarios y tickets insertados por el caso anterior.
test("empieza con usuarios y tickets vacíos en cada caso", async () => {
  assert.equal(await User.count(), 0);
  assert.equal(await Ticket.count(), 0);
});

// Extrae el nombre de la base de una URI sin mostrar credenciales ni otros datos de conexión.
function databaseName(connectionString: string): string {
  return decodeURIComponent(new URL(connectionString).pathname.replace(/^\//, ""));
}

// Compara servidor y base, sin incluir usuario, contraseña ni parámetros de la URI.
function databaseIdentity(connectionString: string): string {
  const url = new URL(connectionString);
  return `${url.protocol}//${url.hostname.toLowerCase()}:${url.port || "5432"}/${databaseName(connectionString).toLowerCase()}`;
}
