import { HttpError } from "../errors/http-error";
import type { Ticket } from "../models/ticket";
import type { TicketRepository } from "../repositories/ticket-repository";
import type { AuthenticatedUser } from "../types/authenticated-user";
import type { BranchType, CommitType, TicketPriority, TicketStatus, TicketType } from "../types/ticket-enums";
import { calculateAlert, calculateCompleted } from "../utils/ticket-derived-fields";
import { suggestBranchName, suggestBranchType, suggestCommitType } from "../utils/ticket-suggestions";
import { validateCreateTicketInput, validateTicketStatusInput, validateUpdateTicketInput } from "../validation/ticket";
import { validateTicketListFilters } from "../validation/ticket-search";
import type { TicketRepositoryFilters } from "../types/ticket-filters";

// Define los campos públicos de ticket y agrega las propiedades que se calculan al consultar.
export interface TicketResponse {
  id: number;
  title: string;
  description: string | null;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  dueDate: string;
  createdById: number;
  assigneeId: number | null;
  branchType: BranchType | null;
  branchName: string | null;
  commitType: CommitType | null;
  commitScope: string | null;
  commitDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  completed: boolean;
  alert: boolean;
}

// Mantiene una columna por estado, incluso cuando no hay tickets en alguna de ellas.
export type TicketsByStatus = Record<TicketStatus, TicketResponse[]>;

type TicketCreationRepository = Pick<TicketRepository, "create">;
type TicketReadRepository = Pick<TicketRepository, "findById" | "findAll">;

// Convierte el registro guardado en una respuesta que incluye sus propiedades calculadas.
function toTicketResponse(ticket: Ticket): TicketResponse {
  const values = ticket.get({ plain: true });
  return {
    ...values,
    completed: calculateCompleted(values.status),
    alert: calculateAlert(values.dueDate, values.status),
  };
}

// Valida la solicitud, agrega el autor autenticado y completa las sugerencias que no envió el cliente.
export class CreateTicketService {
  constructor(private readonly ticketRepository: TicketCreationRepository) {}

  async execute(input: unknown, createdById: number): Promise<TicketResponse> {
    if (!Number.isSafeInteger(createdById) || createdById <= 0) {
      throw new HttpError(401, "USUARIO_NO_AUTENTICADO", "Se requiere iniciar sesión para crear tickets.");
    }

    const ticketInput = validateCreateTicketInput(input);
    const ticket = await this.ticketRepository.create({
      ...ticketInput,
      createdById,
      branchType: ticketInput.branchType === undefined ? suggestBranchType(ticketInput.type) : ticketInput.branchType,
      branchName: ticketInput.branchName === undefined ? suggestBranchName(ticketInput.type, ticketInput.title) : ticketInput.branchName,
      commitType: ticketInput.commitType === undefined ? suggestCommitType(ticketInput.type) : ticketInput.commitType,
      commitScope: ticketInput.commitScope ?? null,
      commitDescription: ticketInput.commitDescription === undefined ? ticketInput.title : ticketInput.commitDescription,
    });
    return toTicketResponse(ticket);
  }
}

// Actualiza un ticket existente sin recalcular las sugerencias que ya fueron guardadas.
export class UpdateTicketService {
  constructor(private readonly ticketRepository: Pick<TicketRepository, "findById" | "update">) {}

  async execute(idValue: unknown, input: unknown, actor: AuthenticatedUser): Promise<TicketResponse> {
    const id = parseTicketId(idValue);
    const changes = validateUpdateTicketInput(input);
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) throw new HttpError(404, "TICKET_NO_ENCONTRADO", "No se encontró el ticket solicitado.");

    // Los desarrolladores editan solo tickets propios/asignados o toman uno libre para sí mismos.
    if (actor.role !== "admin") {
      const ownsTicket = ticket.createdById === actor.id;
      const isAssignee = ticket.assigneeId === actor.id;
      const takesTicket = ticket.assigneeId === null && changes.assigneeId === actor.id;
      if (!ownsTicket && !isAssignee && !takesTicket) throw permissionError();

      // Cambiar el responsable solo permite que un desarrollador tome un ticket sin asignar.
      if (changes.assigneeId !== undefined && changes.assigneeId !== ticket.assigneeId && !takesTicket) {
        throw permissionError();
      }
      // Cambiar el estado exige estar asignado o tomar el ticket en esta misma solicitud.
      if (changes.status !== undefined && changes.status !== ticket.status && !isAssignee && !takesTicket) {
        throw permissionError();
      }
    }

    const updated = await this.ticketRepository.update(ticket, changes);
    return toTicketResponse(updated);
  }
}

// Regenera las sugerencias solo cuando se invoca esta operación explícita.
export class RegenerateTicketSuggestionsService {
  constructor(private readonly ticketRepository: Pick<TicketRepository, "findById" | "update">) {}

  async execute(idValue: unknown, actor: AuthenticatedUser): Promise<TicketResponse> {
    const id = parseTicketId(idValue);
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) throw new HttpError(404, "TICKET_NO_ENCONTRADO", "No se encontró el ticket solicitado.");

    // Reutiliza la regla de edición: administrador, autor o responsable del ticket.
    if (actor.role !== "admin" && ticket.createdById !== actor.id && ticket.assigneeId !== actor.id) {
      throw permissionError();
    }

    // Calcula a partir del tipo y título actuales; conserva commitScope y los demás campos.
    const updated = await this.ticketRepository.update(ticket, {
      branchType: suggestBranchType(ticket.type),
      branchName: suggestBranchName(ticket.type, ticket.title),
      commitType: suggestCommitType(ticket.type),
      commitDescription: ticket.title,
    });
    return toTicketResponse(updated);
  }
}

// Cambia solo el estado; si un desarrollador toma un ticket libre, también queda asignado a sí mismo.
export class UpdateTicketStatusService {
  constructor(private readonly ticketRepository: Pick<TicketRepository, "findById" | "update">) {}

  async execute(idValue: unknown, input: unknown, actor: AuthenticatedUser): Promise<TicketResponse> {
    const id = parseTicketId(idValue);
    const status = validateTicketStatusInput(input);
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) throw new HttpError(404, "TICKET_NO_ENCONTRADO", "No se encontró el ticket solicitado.");

    // Un administrador cambia cualquier estado; un desarrollador solo uno asignado o sin responsable.
    if (actor.role !== "admin" && ticket.assigneeId !== actor.id && ticket.assigneeId !== null) {
      throw permissionError();
    }

    // Al actuar sobre un ticket libre, el desarrollador autenticado lo toma además de cambiar su estado.
    const changes = {
      status,
      ...(actor.role !== "admin" && ticket.assigneeId === null ? { assigneeId: actor.id } : {}),
    };
    const updated = await this.ticketRepository.update(ticket, changes);
    return toTicketResponse(updated);
  }
}

// Mantiene uniforme el error de autorización en las operaciones de edición.
function permissionError(): HttpError {
  return new HttpError(403, "PERMISO_DENEGADO", "No tenés permiso para editar este ticket.");
}

// Devuelve un ticket por ID y responde con 404 cuando no existe.
export class GetTicketService {
  constructor(private readonly ticketRepository: Pick<TicketReadRepository, "findById">) {}

  async execute(idValue: unknown): Promise<TicketResponse> {
    const id = parseTicketId(idValue);
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) throw new HttpError(404, "TICKET_NO_ENCONTRADO", "No se encontró el ticket solicitado.");
    return toTicketResponse(ticket);
  }
}

// Valida búsqueda/filtros y calcula las propiedades derivadas de cada resultado.
export class ListTicketsService {
  constructor(private readonly ticketRepository: Pick<TicketReadRepository, "findAll">) {}

  async execute(filtersValue?: unknown, currentUserId?: number): Promise<TicketResponse[] | TicketsByStatus> {
    const filters = validateTicketListFilters(filtersValue);
    if (filters.mine && (!Number.isSafeInteger(currentUserId) || !currentUserId || currentUserId <= 0)) {
      throw new HttpError(401, "USUARIO_NO_AUTENTICADO", "Se requiere iniciar sesión para consultar mis tickets.");
    }

    const { mine, groupBy, ...repositoryFilters } = filters;
    const resolvedFilters: TicketRepositoryFilters = {
      ...repositoryFilters,
      ...(mine ? { mineUserId: currentUserId } : {}),
    };
    const tickets = await this.ticketRepository.findAll(resolvedFilters);
    const response = tickets.map(toTicketResponse);
    if (groupBy !== "status") return response;

    // Agrupa después de filtrar para conservar el contrato del repositorio y todas las columnas Kanban.
    const grouped: TicketsByStatus = {
      pending: [],
      in_progress: [],
      in_review: [],
      completed: [],
      blocked: [],
    };
    for (const ticket of response) grouped[ticket.status].push(ticket);
    return grouped;
  }
}

// Acepta solo identificadores decimales positivos para no ocultar rutas malformadas.
function parseTicketId(value: unknown): number {
  const id = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new HttpError(400, "ID_INVALIDO", "El ID del ticket debe ser un entero positivo.");
  }
  return id;
}
