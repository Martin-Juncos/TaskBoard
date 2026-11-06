import { HttpError } from "../errors/http-error";
import type { Ticket } from "../models/ticket";
import type { TicketRepository } from "../repositories/ticket-repository";
import type { BranchType, CommitType, TicketPriority, TicketStatus, TicketType } from "../types/ticket-enums";
import { calculateAlert, calculateCompleted } from "../utils/ticket-derived-fields";
import { suggestBranchName, suggestBranchType, suggestCommitType } from "../utils/ticket-suggestions";
import { validateCreateTicketInput } from "../validation/ticket";
import { validateTicketSearch } from "../validation/ticket-search";

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

// Aplica la búsqueda opcional y calcula las propiedades derivadas de cada resultado.
export class ListTicketsService {
  constructor(private readonly ticketRepository: Pick<TicketReadRepository, "findAll">) {}

  async execute(searchValue?: unknown): Promise<TicketResponse[]> {
    const search = validateTicketSearch(searchValue);
    const tickets = await this.ticketRepository.findAll(search);
    return tickets.map(toTicketResponse);
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
