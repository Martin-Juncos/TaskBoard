import type { ModelStatic } from "sequelize";
import type { Ticket } from "../models/ticket";

// Expone la consulta mínima del modelo que necesita el repositorio de tickets.
export type TicketRepositoryModel = ModelStatic<Ticket>;

// Encapsula la búsqueda por ID para que los servicios no consulten Sequelize directamente.
export class TicketRepository {
  constructor(private readonly ticketModel: TicketRepositoryModel) {}

  // Busca un ticket por su clave primaria y devuelve null cuando no existe.
  findById(id: number): Promise<Ticket | null> {
    return this.ticketModel.findByPk(id);
  }
}
