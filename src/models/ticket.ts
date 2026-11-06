import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../database/sequelize";
import {
  BRANCH_TYPES,
  COMMIT_TYPES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TYPES,
  type BranchType,
  type CommitType,
  type TicketPriority,
  type TicketStatus,
  type TicketType,
} from "../types/ticket-enums";
import { User } from "./user";

// Representa un ticket del tablero con sus datos de trabajo, relaciones y sugerencias Git.
export class Ticket extends Model<InferAttributes<Ticket>, InferCreationAttributes<Ticket>> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare type: TicketType;
  declare priority: TicketPriority;
  declare status: TicketStatus;
  declare dueDate: string;
  declare createdById: number;
  declare assigneeId: CreationOptional<number | null>;
  declare branchType: CreationOptional<BranchType | null>;
  declare branchName: CreationOptional<string | null>;
  declare commitType: CreationOptional<CommitType | null>;
  declare commitScope: CreationOptional<string | null>;
  declare commitDescription: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

// Vincula el modelo con la tabla existente y valida los valores de los enums del dominio.
Ticket.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: { isIn: [Array.from(TICKET_TYPES)] },
    },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [Array.from(TICKET_PRIORITIES)] },
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: { isIn: [Array.from(TICKET_STATUSES)] },
    },
    dueDate: { type: DataTypes.DATEONLY, allowNull: false },
    createdById: { type: DataTypes.INTEGER, allowNull: false },
    assigneeId: { type: DataTypes.INTEGER, allowNull: true },
    branchType: {
      type: DataTypes.STRING(30),
      allowNull: true,
      validate: { isIn: [Array.from(BRANCH_TYPES)] },
    },
    branchName: { type: DataTypes.STRING(255), allowNull: true },
    commitType: {
      type: DataTypes.STRING(30),
      allowNull: true,
      validate: { isIn: [Array.from(COMMIT_TYPES)] },
    },
    commitScope: { type: DataTypes.STRING(100), allowNull: true },
    commitDescription: { type: DataTypes.STRING(255), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: "Ticket", tableName: "tickets", timestamps: true },
);

// Declara las dos relaciones de usuario sin duplicar la propiedad de las claves foráneas.
Ticket.belongsTo(User, { as: "author", foreignKey: "createdById" });
Ticket.belongsTo(User, { as: "assignee", foreignKey: "assigneeId" });
User.hasMany(Ticket, { as: "createdTickets", foreignKey: "createdById" });
User.hasMany(Ticket, { as: "assignedTickets", foreignKey: "assigneeId" });
