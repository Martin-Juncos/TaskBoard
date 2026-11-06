import { HttpError } from "../errors/http-error";
import { TICKET_PRIORITIES, TICKET_STATUSES, TICKET_TYPES } from "../types/ticket-enums";
import type { TicketListFilters } from "../types/ticket-filters";

// Valida y normaliza el término opcional usado para buscar tickets.
export function validateTicketSearch(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new HttpError(400, "BUSQUEDA_INVALIDA", "El parámetro search debe ser un único texto.");
  }

  const search = value.trim();
  if (!search) return undefined;
  if (search.length > 200) {
    throw new HttpError(400, "BUSQUEDA_INVALIDA", "El parámetro search no puede superar 200 caracteres.");
  }
  return search;
}

// Valida de una vez todos los filtros opcionales del listado de tickets.
export function validateTicketListFilters(input: unknown): TicketListFilters {
  const query = isObject(input) ? input : {};
  return {
    search: validateTicketSearch(query.search),
    status: optionalFilter(query.status, "status", TICKET_STATUSES),
    priority: optionalFilter(query.priority, "priority", TICKET_PRIORITIES),
    type: optionalFilter(query.type, "type", TICKET_TYPES),
    assigneeId: optionalAssigneeId(query.assigneeId),
    mine: optionalBoolean(query.mine, "mine"),
    unassigned: optionalBoolean(query.unassigned, "unassigned"),
  };
}

// Valida el ID del responsable como entero positivo sin aceptar coerciones ambiguas.
function optionalAssigneeId(value: unknown): number | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    throw new HttpError(400, "FILTRO_INVALIDO", "El filtro assigneeId debe ser un entero positivo.");
  }
  const id = Number(value.trim());
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new HttpError(400, "FILTRO_INVALIDO", "El filtro assigneeId debe ser un entero positivo.");
  }
  return id;
}

// Lee los filtros activables como true/false y rechaza cualquier otro valor.
function optionalBoolean(value: unknown, name: string): boolean | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") {
    throw new HttpError(400, "FILTRO_INVALIDO", `El filtro ${name} debe ser true o false.`);
  }
  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue !== "true" && normalizedValue !== "false") {
    throw new HttpError(400, "FILTRO_INVALIDO", `El filtro ${name} debe ser true o false.`);
  }
  return normalizedValue === "true";
}

// Valida que cada filtro sea un único valor admitido o que no se haya enviado.
function optionalFilter<T extends string>(value: unknown, name: string, allowed: readonly T[]): T | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") {
    throw new HttpError(400, "FILTRO_INVALIDO", `El filtro ${name} debe ser un único texto.`);
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) return undefined;
  if (!allowed.includes(normalizedValue as T)) {
    throw new HttpError(400, "FILTRO_INVALIDO", `El valor enviado para ${name} no es válido.`);
  }
  return normalizedValue as T;
}

// Asegura que los parámetros leídos sean un objeto antes de acceder a sus propiedades.
function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
