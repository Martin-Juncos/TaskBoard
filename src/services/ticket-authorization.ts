import { HttpError } from "../errors/http-error";
import type { Ticket } from "../models/ticket";
import type { AuthenticatedUser } from "../types/authenticated-user";
import type { UpdateTicketInput } from "../validation/ticket";

type EditableTicket = Pick<Ticket, "createdById" | "assigneeId" | "status">;
type AssignableTicket = Pick<Ticket, "createdById" | "assigneeId">;

// Aplica las reglas de autoría y autoasignación antes de editar un ticket.
export function assertCanUpdateTicket(
  ticket: EditableTicket,
  changes: UpdateTicketInput,
  actor: AuthenticatedUser,
): void {
  if (actor.role === "admin") return;

  const ownsTicket = ticket.createdById === actor.id;
  const isAssignee = ticket.assigneeId === actor.id;
  const takesTicket = ticket.assigneeId === null && changes.assigneeId === actor.id;
  if (!ownsTicket && !isAssignee && !takesTicket) throw editPermissionError();

  if (
    changes.assigneeId !== undefined &&
    changes.assigneeId !== ticket.assigneeId &&
    !takesTicket
  ) {
    throw editPermissionError();
  }

  if (
    changes.status !== undefined &&
    changes.status !== ticket.status &&
    !isAssignee &&
    !takesTicket
  ) {
    throw editPermissionError();
  }
}

// Solo permite regenerar sugerencias a quien administra, crea o tiene asignado el ticket.
export function assertCanRegenerateTicketSuggestions(
  ticket: AssignableTicket,
  actor: AuthenticatedUser,
): void {
  if (actor.role !== "admin" && ticket.createdById !== actor.id && ticket.assigneeId !== actor.id) {
    throw editPermissionError();
  }
}

// Solo el responsable actual o un administrador puede cambiar el estado.
export function assertCanUpdateTicketStatus(
  ticket: Pick<Ticket, "assigneeId">,
  actor: AuthenticatedUser,
): void {
  if (actor.role !== "admin" && ticket.assigneeId !== actor.id && ticket.assigneeId !== null) {
    throw editPermissionError();
  }
}

// Restringe la eliminación de tickets a administradores.
export function assertCanDeleteTicket(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") {
    throw new HttpError(403, "PERMISO_DENEGADO", "Solo un administrador puede eliminar tickets.");
  }
}

// Mantiene uniforme el error HTTP para los permisos de edición de tickets.
function editPermissionError(): HttpError {
  return new HttpError(403, "PERMISO_DENEGADO", "No tenés permiso para editar este ticket.");
}
