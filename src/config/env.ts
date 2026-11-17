import "dotenv/config";

// Agrupa la configuración validada que necesitan el servidor y las conexiones a la base.
export interface AppConfig {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

// Obtiene solo la URL de PostgreSQL para que los comandos de base de datos no dependan del JWT.
export function readDatabaseUrl(environment: NodeJS.ProcessEnv = process.env): string {
  const databaseUrl = environment.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("Falta la variable de entorno obligatoria: DATABASE_URL");
  }

  return databaseUrl;
}

// Lee las variables de entorno y las reúne en un único objeto para el resto de la aplicación.
export function readConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const requiredVariables = ["DATABASE_URL", "JWT_SECRET", "JWT_EXPIRES_IN"] as const;

  // Reúne todas las variables ausentes para informar el problema completo en un solo mensaje.
  const missingVariables = requiredVariables.filter(
    (variableName) => !environment[variableName]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(`Faltan variables de entorno obligatorias: ${missingVariables.join(", ")}`);
  }

  return {
    port: Number(environment.PORT) || 3000,
    databaseUrl: readDatabaseUrl(environment),
    jwtSecret: environment.JWT_SECRET!,
    jwtExpiresIn: environment.JWT_EXPIRES_IN!,
  };
}
