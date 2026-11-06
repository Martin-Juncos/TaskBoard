import { readConfig } from "./config/env";
import { sequelize } from "./database/sequelize";
import { createApplication } from "./create-application";

const config = readConfig();

// Conecta la base, inicia HTTP y cierra ambos recursos al detener el proceso.
async function startServer(): Promise<void> {
  try {
    await sequelize.authenticate();

    const app = createApplication(config);
    const server = app.listen(config.port, () => {
      console.log(`Servidor escuchando en el puerto ${config.port}`);
    });

    // Espera a que terminen las solicitudes activas antes de cerrar Sequelize.
    const shutdown = (signal: NodeJS.Signals): void => {
      console.log(`Señal ${signal} recibida; cerrando el servidor...`);

      server.close((error) => {
        if (error) {
          console.error("No se pudo cerrar correctamente el servidor HTTP.");
          process.exitCode = 1;
        }

        void sequelize
          .close()
          .then(() => console.log("Conexión con PostgreSQL cerrada correctamente."))
          .catch(() => {
            console.error("No se pudo cerrar correctamente la conexión con PostgreSQL.");
            process.exitCode = 1;
          });
      });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  } catch {
    console.error("No se pudo iniciar el servidor porque falló la conexión con PostgreSQL.");
    await sequelize.close().catch(() => undefined);
    process.exitCode = 1;
  }
}

// Espera la conexión a PostgreSQL antes de aceptar solicitudes HTTP.
void startServer();
