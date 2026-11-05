import type { RequestHandler } from "express";
import { HttpError } from "../errors/http-error";
import type { CreateTicketService, GetTicketService, ListTicketsService } from "../services/ticket-service";

// Crea un ticket a nombre del usuario autenticado y responde 201 al guardarlo.
export function createCreateTicketController(service: Pick<CreateTicketService, "execute">): RequestHandler {
  return async (request, response, next) => {
    if (!request.user) {
      next(new HttpError(401, "TOKEN_REQUERIDO", "Se requiere un token Bearer válido."));
      return;
    }
    try {
      response.status(201).json(await service.execute(request.body, request.user.id));
    } catch (error) {
      next(error);
    }
  };
}

// Devuelve un ticket por su ID y delega al middleware global los errores de búsqueda.
export function createGetTicketController(service: Pick<GetTicketService, "execute">): RequestHandler {
  return async (request, response, next) => {
    try {
      response.status(200).json(await service.execute(request.params.id));
    } catch (error) {
      next(error);
    }
  };
}

// Devuelve el listado inicial de tickets sin filtros ni datos calculados persistidos.
export function createListTicketsController(service: Pick<ListTicketsService, "execute">): RequestHandler {
  return async (_request, response, next) => {
    try {
      response.status(200).json(await service.execute());
    } catch (error) {
      next(error);
    }
  };
}
