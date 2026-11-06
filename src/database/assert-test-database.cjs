require("dotenv/config");

// Evita que el comando de pruebas migre por accidente la base de desarrollo.
function assertIsolatedTestDatabase() {
  const testDatabaseUrl = process.env.DATABASE_URL_TEST?.trim();
  const developmentDatabaseUrl = process.env.DATABASE_URL?.trim();
  if (!testDatabaseUrl) {
    throw new Error(
      "Falta DATABASE_URL_TEST; no se ejecutarán migraciones ni pruebas de base de datos.",
    );
  }

  const testIdentity = databaseIdentity(testDatabaseUrl);
  const testName = databaseName(testDatabaseUrl);
  if (!/_test$/i.test(testName)) {
    throw new Error("DATABASE_URL_TEST debe apuntar a una base cuyo nombre termine en _test.");
  }
  if (developmentDatabaseUrl) {
    const developmentName = databaseName(developmentDatabaseUrl).toLowerCase();
    if (
      testName.toLowerCase() === developmentName ||
      testIdentity === databaseIdentity(developmentDatabaseUrl)
    ) {
      throw new Error("DATABASE_URL_TEST debe apuntar a una base distinta de DATABASE_URL.");
    }
  }
}

// Obtiene el nombre de base sin imprimir ni registrar credenciales.
function databaseName(connectionString) {
  return decodeURIComponent(new URL(connectionString).pathname.replace(/^\//, ""));
}

// Compara protocolo/host/puerto/base sin incluir usuario, password ni parámetros.
function databaseIdentity(connectionString) {
  const url = new URL(connectionString);
  return `${url.protocol}//${url.hostname.toLowerCase()}:${url.port || "5432"}/${databaseName(connectionString).toLowerCase()}`;
}

try {
  assertIsolatedTestDatabase();
} catch (error) {
  console.error(error instanceof Error ? error.message : "La base de pruebas no es segura.");
  process.exitCode = 1;
}
