import "dotenv/config";

export interface AppConfig {
  port: number;
  databaseUrl: string | undefined;
  jwtSecret: string | undefined;
  jwtExpiresIn: string | undefined;
}

// Lee las variables de entorno y las reúne en un único objeto para el resto de la aplicación.
export function readConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(environment.PORT) || 3000,
    databaseUrl: environment.DATABASE_URL,
    jwtSecret: environment.JWT_SECRET,
    jwtExpiresIn: environment.JWT_EXPIRES_IN,
  };
}

// Esta instancia representa la configuración cargada al iniciar la aplicación.
export const config = readConfig();
