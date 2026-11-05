import express from "express";

const app = express();

// Convierte automáticamente los cuerpos JSON de las solicitudes en objetos de JavaScript.
app.use(express.json());

// Permite comprobar rápidamente que la API está encendida y responde correctamente.
app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

export default app;
