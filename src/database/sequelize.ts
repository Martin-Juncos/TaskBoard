import { Sequelize } from "sequelize";
import { readDatabaseUrl } from "../config/env";

// Crea una única conexión reutilizable a PostgreSQL; los modelos se agregarán en otro paso.
export const sequelize = new Sequelize(readDatabaseUrl(), {
  dialect: "postgres",
  logging: false,
});
