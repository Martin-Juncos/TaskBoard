import express from "express";
import errorHandler from "./middleware/error-handler";

const app = express();

// Convierte automáticamente los cuerpos JSON de las solicitudes en objetos de JavaScript.
app.use(express.json());

// Permite comprobar rápidamente que la API está encendida y responde correctamente.
app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

// Registra el manejador al final para que reciba errores de las rutas y middlewares anteriores.
app.use(errorHandler);

export default app;
