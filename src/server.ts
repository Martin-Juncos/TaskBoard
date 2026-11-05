import app from "./app";
import { readConfig } from "./config/env";

// Carga y valida la configuración antes de intentar iniciar el servidor.
const config = readConfig();

// Inicia el servidor usando el puerto centralizado en el módulo de configuración.
app.listen(config.port, () => {
  console.log(`Servidor escuchando en el puerto ${config.port}`);
});
