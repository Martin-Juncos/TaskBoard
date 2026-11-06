import { Op, type ModelStatic, type WhereOptions } from "sequelize";
import type { Ticket } from "../models/ticket";
import type { TicketRepositoryFilters } from "../types/ticket-filters";

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

// Excluye el autor para impedir que una actualización cambie la autoría del ticket.
export type UpdateTicketRecord = Partial<Omit<CreateTicketRecord, "createdById">>;

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

  // Persiste solo los campos editables recibidos sobre el ticket ya encontrado.
  update(ticket: Ticket, changes: UpdateTicketRecord): Promise<Ticket> {
    return ticket.update(changes);
  }

  // Elimina de la base el ticket cargado por el servicio.
  delete(ticket: Ticket): Promise<void> {
    return ticket.destroy();
  }

  // Busca en título o descripción sin distinguir mayúsculas y devuelve resultados ordenados por ID.
  findAll(filters: TicketRepositoryFilters = {}): Promise<Ticket[]> {
    const escapedSearch = filters.search?.replace(/[\\%_]/g, "\\$&");
    const conditions: WhereOptions<Ticket>[] = [];
    if (filters.status) conditions.push({ status: filters.status });
    if (filters.priority) conditions.push({ priority: filters.priority });
    if (filters.type) conditions.push({ type: filters.type });
    if (filters.assigneeId !== undefined) conditions.push({ assigneeId: filters.assigneeId });
    if (filters.mineUserId !== undefined) conditions.push({ assigneeId: filters.mineUserId });
    if (filters.unassigned) conditions.push({ assigneeId: null });
    if (escapedSearch) {
      conditions.push({
        [Op.or]: [
          { title: { [Op.iLike]: `%${escapedSearch}%` } },
          { description: { [Op.iLike]: `%${escapedSearch}%` } },
        ],
      });
    }

    const where: WhereOptions<Ticket> | undefined =
      conditions.length > 0 ? { [Op.and]: conditions } : undefined;
    return this.ticketModel.findAll({ where, order: [["id", "ASC"]] });
  }
}
