import express from "express";
import type { RequestHandler } from "express";
import errorHandler from "./middleware/error-handler";
import notFoundHandler from "./middleware/not-found-handler";
import { createAuthRouter } from "./routes/auth-routes";

// Crea una aplicación con las rutas disponibles y permite inyectar el controlador de registro.
export function createApp(registerUserController?: RequestHandler) {
  const app = express();

  // Convierte automáticamente los cuerpos JSON de las solicitudes en objetos de JavaScript.
  app.use(express.json());

  // Permite comprobar rápidamente que la API está encendida y responde correctamente.
  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  // Agrega las rutas de autenticación cuando el punto de entrada inyecta el controlador real.
  if (registerUserController) {
    app.use("/api/auth", createAuthRouter(registerUserController));
  }

  // Convierte rutas no registradas en HttpError antes de que se ejecute el manejador global.
  app.use(notFoundHandler);

  // Registra el manejador al final para que reciba errores de las rutas y middlewares anteriores.
  app.use(errorHandler);

  return app;
}
