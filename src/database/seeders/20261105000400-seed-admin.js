"use strict";

const bcrypt = require("bcrypt");
const { QueryTypes } = require("sequelize");

// Crea el administrador inicial usando credenciales locales definidas en el entorno.
module.exports = {
  async up(queryInterface) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      throw new Error("Definí ADMIN_EMAIL y ADMIN_PASSWORD para ejecutar el seeder de administrador.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("ADMIN_EMAIL debe ser una dirección de correo válida.");
    }

    const existingUsers = await queryInterface.sequelize.query(
      'SELECT "id" FROM "users" WHERE "email" = :email LIMIT 1',
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    if (existingUsers.length > 0) {
      throw new Error("Ya existe un usuario con ADMIN_EMAIL; el seeder no modifica cuentas existentes.");
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(password, 12);
    await queryInterface.bulkInsert("users", [{
      name: "Administrador inicial",
      email,
      passwordHash,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    }]);
  },

  // Elimina únicamente la cuenta administradora indicada al ejecutar la reversión.
  async down(queryInterface) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!email) throw new Error("Definí ADMIN_EMAIL para revertir el seeder de administrador.");
    await queryInterface.bulkDelete("users", { email, role: "admin" });
  },
};
