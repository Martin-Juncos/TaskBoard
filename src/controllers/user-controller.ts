import type { RequestHandler } from "express";
import type { ChangeUserRoleService, ListUsersService } from "../services/user-service";

// Devuelve la lista pública de usuarios y delega los errores al middleware global.
export function createListUsersController(service: Pick<ListUsersService, "execute">): RequestHandler {
  return async (_request, response, next) => {
    try {
      response.status(200).json(await service.execute());
    } catch (error) {
      next(error);
    }
  };
}

// Recibe el rol nuevo desde el cuerpo y devuelve el usuario actualizado sin datos privados.
export function createChangeUserRoleController(
  service: Pick<ChangeUserRoleService, "execute">,
): RequestHandler {
  return async (request, response, next) => {
    try {
      response.status(200).json(await service.execute(request.params.id, request.body?.role));
    } catch (error) {
      next(error);
    }
  };
}
