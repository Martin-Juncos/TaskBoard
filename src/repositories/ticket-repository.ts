import { Op, type ModelStatic, type WhereOptions } from "sequelize";
import type { Ticket } from "../models/ticket";
import type { TicketListFilters } from "../types/ticket-filters";

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

  // Busca en título o descripción sin distinguir mayúsculas y devuelve resultados ordenados por ID.
  findAll(filters: TicketListFilters = {}): Promise<Ticket[]> {
    const escapedSearch = filters.search?.replace(/[\\%_]/g, "\\$&");
    const hasFilters = Boolean(escapedSearch || filters.status || filters.priority || filters.type);
    const where: WhereOptions<Ticket> = {};

    if (filters.status) Object.assign(where, { status: filters.status });
    if (filters.priority) Object.assign(where, { priority: filters.priority });
    if (filters.type) Object.assign(where, { type: filters.type });
    if (escapedSearch) {
      Object.assign(where, {
        [Op.or]: [
          { title: { [Op.iLike]: `%${escapedSearch}%` } },
          { description: { [Op.iLike]: `%${escapedSearch}%` } },
        ],
      });
    }

    return this.ticketModel.findAll({ where: hasFilters ? where : undefined, order: [["id", "ASC"]] });
  }
}
