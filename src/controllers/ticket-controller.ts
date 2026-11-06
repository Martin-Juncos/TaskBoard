import type { RequestHandler } from "express";
import { HttpError } from "../errors/http-error";
import type {
  CreateTicketService,
  DeleteTicketService,
  GetTicketService,
  ListTicketsService,
  RegenerateTicketSuggestionsService,
  UpdateTicketService,
  UpdateTicketStatusService,
} from "../services/ticket-service";

// Crea un ticket a nombre del usuario autenticado y responde 201 al guardarlo.
export function createCreateTicketController(
  service: Pick<CreateTicketService, "execute">,
): RequestHandler {
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

// Modifica un ticket con la identidad autenticada y responde con sus campos actuales.
export function createUpdateTicketController(
  service: Pick<UpdateTicketService, "execute">,
): RequestHandler {
  return async (request, response, next) => {
    if (!request.user) {
      next(new HttpError(401, "TOKEN_REQUERIDO", "Se requiere un token Bearer válido."));
      return;
    }
    try {
      response
        .status(200)
        .json(await service.execute(request.params.id, request.body, request.user));
    } catch (error) {
      next(error);
    }
  };
}

// Regenera y devuelve las sugerencias usando el tipo y título actuales del ticket.
export function createRegenerateTicketSuggestionsController(
  service: Pick<RegenerateTicketSuggestionsService, "execute">,
): RequestHandler {
  return async (request, response, next) => {
    if (!request.user) {
      next(new HttpError(401, "TOKEN_REQUERIDO", "Se requiere un token Bearer válido."));
      return;
    }
    try {
      response.status(200).json(await service.execute(request.params.id, request.user));
    } catch (error) {
      next(error);
    }
  };
}

// Cambia el estado solicitado y devuelve el ticket actualizado.
export function createUpdateTicketStatusController(
  service: Pick<UpdateTicketStatusService, "execute">,
): RequestHandler {
  return async (request, response, next) => {
    if (!request.user) {
      next(new HttpError(401, "TOKEN_REQUERIDO", "Se requiere un token Bearer válido."));
      return;
    }
    try {
      response
        .status(200)
        .json(await service.execute(request.params.id, request.body, request.user));
    } catch (error) {
      next(error);
    }
  };
}

// Elimina un ticket existente y responde 200 con una confirmación legible.
export function createDeleteTicketController(
  service: Pick<DeleteTicketService, "execute">,
): RequestHandler {
  return async (request, response, next) => {
    if (!request.user) {
      next(new HttpError(401, "TOKEN_REQUERIDO", "Se requiere un token Bearer válido."));
      return;
    }
    try {
      response.status(200).json(await service.execute(request.params.id, request.user));
    } catch (error) {
      next(error);
    }
  };
}

// Devuelve un ticket por su ID y delega al middleware global los errores de búsqueda.
export function createGetTicketController(
  service: Pick<GetTicketService, "execute">,
): RequestHandler {
  return async (request, response, next) => {
    try {
      response.status(200).json(await service.execute(request.params.id));
    } catch (error) {
      next(error);
    }
  };
}

// Pasa los parámetros de búsqueda y filtros al servicio y devuelve la lista de tickets.
export function createListTicketsController(
  service: Pick<ListTicketsService, "execute">,
): RequestHandler {
  return async (request, response, next) => {
    try {
      response.status(200).json(await service.execute(request.query, request.user?.id));
    } catch (error) {
      next(error);
    }
  };
}
