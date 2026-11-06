import { HttpError } from "../errors/http-error";

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
