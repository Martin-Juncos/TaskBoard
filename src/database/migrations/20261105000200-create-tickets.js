"use strict";

const { DataTypes } = require("sequelize");

module.exports = {
  // Crea la tabla de tickets y sus relaciones con el usuario autor y el responsable opcional.
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "tickets",
        {
          id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          title: {
            type: DataTypes.STRING(200),
            allowNull: false,
          },
          description: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          type: {
            type: DataTypes.STRING(30),
            allowNull: false,
          },
          priority: {
            type: DataTypes.STRING(20),
            allowNull: false,
          },
          status: {
            type: DataTypes.STRING(30),
            allowNull: false,
          },
          dueDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
          },
          createdById: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          assigneeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          branchType: {
            type: DataTypes.STRING(30),
            allowNull: true,
          },
          branchName: {
            type: DataTypes.STRING(255),
            allowNull: true,
          },
          commitType: {
            type: DataTypes.STRING(30),
            allowNull: true,
          },
          commitScope: {
            type: DataTypes.STRING(100),
            allowNull: true,
          },
          commitDescription: {
            type: DataTypes.STRING(255),
            allowNull: true,
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

      // Acelera los filtros por autor, responsable, estado y prioridad del tablero.
      await queryInterface.addIndex("tickets", ["createdById"], {
        name: "tickets_created_by_id_idx",
        transaction,
      });
      await queryInterface.addIndex("tickets", ["assigneeId"], {
        name: "tickets_assignee_id_idx",
        transaction,
      });
      await queryInterface.addIndex("tickets", ["status"], {
        name: "tickets_status_idx",
        transaction,
      });
      await queryInterface.addIndex("tickets", ["priority"], {
        name: "tickets_priority_idx",
        transaction,
      });
    });
  },

  // Elimina primero los índices y claves foráneas asociados al borrar la tabla de tickets.
  async down(queryInterface) {
    await queryInterface.dropTable("tickets");
  },
};
