require("dotenv/config");

// Separa las conexiones de desarrollo y pruebas usando sus variables de entorno respectivas.
module.exports = {
  development: {
    use_env_variable: "DATABASE_URL",
    dialect: "postgres",
    seederStorage: "sequelize",
  },
  test: {
    use_env_variable: "DATABASE_URL_TEST",
    dialect: "postgres",
    seederStorage: "sequelize",
  },
};
