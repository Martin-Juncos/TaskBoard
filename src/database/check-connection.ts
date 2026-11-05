import type { Sequelize } from "sequelize";

// Comprueba el acceso real a PostgreSQL sin iniciar el servidor ni definir modelos.
async function checkDatabaseConnection(): Promise<void> {
  let sequelize: Sequelize | undefined;

  try {
    const database = await import("./sequelize.js");
    sequelize = database.sequelize;
    await database.sequelize.authenticate();
    console.log("Conexión con PostgreSQL establecida correctamente.");
  } catch (error) {
    // Muestra el problema de configuración directamente y evita imprimir detalles internos del driver.
    if (error instanceof Error && error.message.startsWith("Falta la variable de entorno obligatoria:")) {
      console.error(error.message);
    } else {
      console.error(
        "No se pudo conectar con PostgreSQL. Revisá DATABASE_URL y que el servidor esté disponible.",
      );
    }
    process.exitCode = 1;
  } finally {
    await sequelize?.close();
  }
}

void checkDatabaseConnection();
