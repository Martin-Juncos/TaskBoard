"use strict";

const { DataTypes } = require("sequelize");

module.exports = {
  // Agrega el nombre obligatorio sin modificar una migración que ya fue aplicada.
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "users",
        "name",
        {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        { transaction },
      );
    });
  },

  // Quita el nombre si se necesita revertir este cambio de esquema.
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("users", "name", { transaction });
    });
  },
};
