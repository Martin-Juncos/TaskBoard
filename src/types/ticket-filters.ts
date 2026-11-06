import type { TicketPriority, TicketStatus, TicketType } from "./ticket-enums";

// Representa los filtros combinables disponibles en el listado de tickets.
export interface TicketListFilters {
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
}
