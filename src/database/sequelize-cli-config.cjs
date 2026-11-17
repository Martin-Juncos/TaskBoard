require("dotenv/config");

// Configura la conexión que Sequelize CLI usa para migraciones y seeders.
module.exports = {
  development: {
    use_env_variable: "DATABASE_URL",
    dialect: "postgres",
    seederStorage: "sequelize",
  },
};
