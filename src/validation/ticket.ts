import { HttpError } from "../errors/http-error";
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
import { isRecord } from "./is-record";

// Representa el cuerpo de creación después de validar y normalizar sus campos.
export interface CreateTicketInput {
  title: string;
  description: string | null;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  dueDate: string;
  assigneeId: number | null;
  branchType?: BranchType | null;
  branchName?: string | null;
  commitType?: CommitType | null;
  commitScope?: string | null;
  commitDescription?: string | null;
}

// En una actualización solo se modifican los campos editables enviados por el cliente.
export type UpdateTicketInput = Partial<CreateTicketInput>;

// Devuelve solo un estado permitido para la ruta específica de cambio de estado.
export function validateTicketStatusInput(input: unknown): TicketStatus {
  const body = isRecord(input) ? input : {};
  if (!isOneOf(TICKET_STATUSES, body.status))
    throw validationError("El estado del ticket no es válido.");
  return body.status;
}

// Valida los datos públicos del ticket antes de que el servicio intente guardarlos.
export function validateCreateTicketInput(input: unknown): CreateTicketInput {
  const body = isRecord(input) ? input : {};
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 200) {
    throw validationError("El título es obligatorio y debe tener como máximo 200 caracteres.");
  }
  if (!isOneOf(TICKET_TYPES, body.type)) {
    throw validationError("El tipo debe ser feature, bug o task.");
  }
  if (!isOneOf(TICKET_PRIORITIES, body.priority)) {
    throw validationError("La prioridad debe ser low, medium, high o urgent.");
  }
  if (!isOneOf(TICKET_STATUSES, body.status)) {
    throw validationError("El estado del ticket no es válido.");
  }
  if (typeof body.dueDate !== "string" || !isValidDateOnly(body.dueDate)) {
    throw validationError("La fecha límite debe ser una fecha real con formato YYYY-MM-DD.");
  }

  const description = optionalText(body, "description", 10000) ?? null;
  const assigneeId = optionalId(body.assigneeId);

  return {
    title,
    description,
    type: body.type,
    priority: body.priority,
    status: body.status,
    dueDate: body.dueDate,
    assigneeId,
    branchType: optionalEnum(body, "branchType", BRANCH_TYPES),
    branchName: optionalText(body, "branchName", 255),
    commitType: optionalEnum(body, "commitType", COMMIT_TYPES),
    commitScope: optionalText(body, "commitScope", 100),
    commitDescription: optionalText(body, "commitDescription", 255),
  };
}

// Valida una actualización parcial sin rellenar campos omitidos ni aceptar autoría nueva.
export function validateUpdateTicketInput(input: unknown): UpdateTicketInput {
  const body = isRecord(input) ? input : {};
  const changes: UpdateTicketInput = {};

  if (Object.hasOwn(body, "title")) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 200) {
      throw validationError("El título es obligatorio y debe tener como máximo 200 caracteres.");
    }
    changes.title = title;
  }
  if (Object.hasOwn(body, "type")) {
    if (!isOneOf(TICKET_TYPES, body.type))
      throw validationError("El tipo debe ser feature, bug o task.");
    changes.type = body.type;
  }
  if (Object.hasOwn(body, "priority")) {
    if (!isOneOf(TICKET_PRIORITIES, body.priority)) {
      throw validationError("La prioridad debe ser low, medium, high o urgent.");
    }
    changes.priority = body.priority;
  }
  if (Object.hasOwn(body, "status")) {
    if (!isOneOf(TICKET_STATUSES, body.status))
      throw validationError("El estado del ticket no es válido.");
    changes.status = body.status;
  }
  if (Object.hasOwn(body, "dueDate")) {
    if (typeof body.dueDate !== "string" || !isValidDateOnly(body.dueDate)) {
      throw validationError("La fecha límite debe ser una fecha real con formato YYYY-MM-DD.");
    }
    changes.dueDate = body.dueDate;
  }
  if (Object.hasOwn(body, "description"))
    changes.description = optionalText(body, "description", 10000);
  if (Object.hasOwn(body, "assigneeId")) changes.assigneeId = optionalId(body.assigneeId);
  if (Object.hasOwn(body, "branchType"))
    changes.branchType = optionalEnum(body, "branchType", BRANCH_TYPES);
  if (Object.hasOwn(body, "branchName")) changes.branchName = optionalText(body, "branchName", 255);
  if (Object.hasOwn(body, "commitType"))
    changes.commitType = optionalEnum(body, "commitType", COMMIT_TYPES);
  if (Object.hasOwn(body, "commitScope"))
    changes.commitScope = optionalText(body, "commitScope", 100);
  if (Object.hasOwn(body, "commitDescription")) {
    changes.commitDescription = optionalText(body, "commitDescription", 255);
  }

  if (Object.keys(changes).length === 0)
    throw validationError("Enviá al menos un campo editable del ticket.");
  return changes;
}

// Rechaza propiedades opcionales que no sean texto, no respeten el máximo o no puedan ser nulas.
function optionalText(
  body: Record<string, unknown>,
  field: string,
  maximumLength: number,
): string | null | undefined {
  const value = body[field];
  if (value === undefined || value === null) return value;
  if (typeof value !== "string" || value.length > maximumLength) {
    throw validationError(`${field} debe ser texto de hasta ${maximumLength} caracteres o null.`);
  }
  return value.trim();
}

// Acepta un ID positivo o null para dejar el ticket sin responsable.
function optionalId(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw validationError("assigneeId debe ser un entero positivo o null.");
  }
  return value;
}

// Comprueba que los campos de sugerencia opcionales pertenezcan al enum indicado.
function optionalEnum<T extends string>(
  body: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
): T | null | undefined {
  const value = body[field];
  if (value === undefined || value === null) return value;
  if (!isOneOf(allowed, value)) throw validationError(`${field} no contiene un valor permitido.`);
  return value;
}

// Valida el formato y que el día exista realmente en el calendario.
function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Comprueba que un valor desconocido pertenezca a una lista literal tipada.
function isOneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

// Usa un único error 400 para que todos los errores de entrada tengan el formato común de la API.
function validationError(message: string): HttpError {
  return new HttpError(400, "VALIDACION_TICKET", message);
}
