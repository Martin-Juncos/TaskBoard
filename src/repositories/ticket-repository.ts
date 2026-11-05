import type { ModelStatic } from "sequelize";
import type { Ticket } from "../models/ticket";

// Expone la consulta mínima del modelo que necesita el repositorio de tickets.
export type TicketRepositoryModel = ModelStatic<Ticket>;

// Describe los campos que el servicio puede persistir al crear un ticket.
export type CreateTicketRecord = Pick<
  Ticket,
  | "title"
  | "description"
  | "type"
  | "priority"
  | "status"
  | "dueDate"
  | "createdById"
  | "assigneeId"
  | "branchType"
  | "branchName"
  | "commitType"
  | "commitScope"
  | "commitDescription"
>;

// Encapsula la búsqueda por ID para que los servicios no consulten Sequelize directamente.
export class TicketRepository {
  constructor(private readonly ticketModel: TicketRepositoryModel) {}

  // Busca un ticket por su clave primaria y devuelve null cuando no existe.
  findById(id: number): Promise<Ticket | null> {
    return this.ticketModel.findByPk(id);
  }

  // Guarda los campos ya validados y devuelve el ticket creado por Sequelize.
  create(ticket: CreateTicketRecord): Promise<Ticket> {
    return this.ticketModel.create(ticket);
  }

  // Devuelve todos los tickets ordenados por ID para la primera versión del listado.
  findAll(): Promise<Ticket[]> {
    return this.ticketModel.findAll({ order: [["id", "ASC"]] });
  }
}
