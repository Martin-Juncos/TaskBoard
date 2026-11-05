import { createLoginUserController, createRegisterUserController } from "./controllers/auth-controller";
import { createApp } from "./app";
import { readConfig } from "./config/env";
import { sequelize } from "./database/sequelize";
import { User } from "./models/user";
import "./models/ticket";
import { UserRepository } from "./repositories/user-repository";
import { createAuthenticationMiddleware } from "./middleware/authentication";
import { createRoleAuthorizationMiddleware } from "./middleware/authorize-role";
import { createChangeUserRoleController, createListUsersController } from "./controllers/user-controller";
import { ChangeUserRoleService, ListUsersService } from "./services/user-service";
import { LoginUserService } from "./services/login-user-service";
import { RegisterUserService } from "./services/register-user-service";

// Carga y valida la configuración antes de intentar iniciar el servidor.
const config = readConfig();

// Espera la conexión a PostgreSQL y libera los recursos al detener el servidor.
async function startServer(): Promise<void> {
  try {
    // Confirma la conexión a PostgreSQL antes de aceptar solicitudes HTTP.
    await sequelize.authenticate();

    // Conecta modelo, repositorio y servicios para habilitar registro e inicio de sesión.
    const userRepository = new UserRepository(User);
    const registerUserService = new RegisterUserService(userRepository);
    const loginUserService = new LoginUserService(userRepository, config);
    const listUsersService = new ListUsersService(userRepository);
    const changeUserRoleService = new ChangeUserRoleService(userRepository);
    const app = createApp({
      register: createRegisterUserController(registerUserService),
      login: createLoginUserController(loginUserService),
      users: {
        authenticate: createAuthenticationMiddleware(userRepository, config),
        requireAdmin: createRoleAuthorizationMiddleware("admin"),
        list: createListUsersController(listUsersService),
        updateRole: createChangeUserRoleController(changeUserRoleService),
      },
    });

    // Inicia el servidor usando el puerto centralizado en el módulo de configuración.
    const server = app.listen(config.port, () => {
      console.log(`Servidor escuchando en el puerto ${config.port}`);
    });

    // Cierra primero el servidor HTTP y después el pool de conexiones de Sequelize.
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

    // Atiende las señales comunes de detención en terminales y servicios.
    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  } catch {
    // Evita iniciar HTTP si PostgreSQL no está disponible y no expone detalles internos.
    console.error("No se pudo iniciar el servidor porque falló la conexión con PostgreSQL.");

    await sequelize.close().catch(() => undefined);
    process.exitCode = 1;
  }
}

// Inicia el servidor de forma asíncrona para completar primero la conexión a la base.
void startServer();
