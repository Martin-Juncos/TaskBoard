import app from "./app";
import { config } from "./config/env";

// Inicia el servidor usando el puerto centralizado en el módulo de configuración.
app.listen(config.port, () => {
  console.log(`Servidor escuchando en el puerto ${config.port}`);
});
