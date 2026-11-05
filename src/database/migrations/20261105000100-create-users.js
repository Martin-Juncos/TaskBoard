"use strict";

const { DataTypes } = require("sequelize");

module.exports = {
  // Crea la tabla de usuarios con los datos necesarios para identificar y autenticar cada cuenta.
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "users",
        {
          id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          email: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          passwordHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          role: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "developer",
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction },
      );

      // Evita que dos cuentas usen la misma dirección de correo.
      await queryInterface.addIndex("users", ["email"], {
        name: "users_email_unique_idx",
        unique: true,
        transaction,
      });
    });
  },

  // Revierte la creación de usuarios al deshacer esta migración.
  async down(queryInterface) {
    await queryInterface.dropTable("users");
  },
};
