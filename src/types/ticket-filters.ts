import type { TicketPriority, TicketStatus, TicketType } from "./ticket-enums";

// Representa los filtros combinables disponibles en el listado de tickets.
export interface TicketListFilters {
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  assigneeId?: number;
  mine?: boolean;
  unassigned?: boolean;
}

// Agrega al filtro de consulta el ID del usuario actual para resolver mine=true.
export interface TicketRepositoryFilters extends Omit<TicketListFilters, "mine"> {
  mineUserId?: number;
}
