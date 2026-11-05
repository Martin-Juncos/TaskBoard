import type { RequestHandler } from "express";
import { HttpError } from "../errors/http-error";
import type { UserRole } from "../types/user-role";

// Permite continuar solo si el middleware JWT adjuntó un usuario con el rol solicitado.
export function createRoleAuthorizationMiddleware(role: UserRole): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(new HttpError(401, "TOKEN_REQUERIDO", "Se requiere iniciar sesión."));
      return;
    }
    if (request.user.role !== role) {
      next(new HttpError(403, "PERMISO_DENEGADO", "No tenés permiso para realizar esta acción."));
      return;
    }
    next();
  };
}
