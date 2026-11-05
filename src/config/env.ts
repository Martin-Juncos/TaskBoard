import "dotenv/config";

export interface AppConfig {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

// Lee las variables de entorno y las reúne en un único objeto para el resto de la aplicación.
export function readConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const requiredVariables = ["DATABASE_URL", "JWT_SECRET", "JWT_EXPIRES_IN"] as const;

  // Reúne todas las variables ausentes para informar el problema completo en un solo mensaje.
  const missingVariables = requiredVariables.filter(
    (variableName) => !environment[variableName]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${missingVariables.join(", ")}`,
    );
  }

  return {
    port: Number(environment.PORT) || 3000,
    databaseUrl: environment.DATABASE_URL!,
    jwtSecret: environment.JWT_SECRET!,
    jwtExpiresIn: environment.JWT_EXPIRES_IN!,
  };
}
