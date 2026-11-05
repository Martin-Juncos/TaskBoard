import type { RequestHandler } from "express";
import type { AppConfig } from "../config/env";
import { HttpError } from "../errors/http-error";
import type { UserRepository } from "../repositories/user-repository";
import { verifyAccessToken } from "../utils/jwt";

type UserLookup = Pick<UserRepository, "findById">;
type JwtSettings = Pick<AppConfig, "jwtSecret" | "jwtExpiresIn">;

// Verifica el token y coloca en Request.user la identidad y el rol actuales del usuario.
export function createAuthenticationMiddleware(
  userRepository: UserLookup,
  jwtSettings: JwtSettings,
): RequestHandler {
  return async (request, _response, next) => {
    const authorization = request.get("authorization");
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

    if (!bearerToken) {
      next(new HttpError(401, "TOKEN_REQUERIDO", "Se requiere un token Bearer válido."));
      return;
    }

    try {
      // Valida firma, expiración e identidad incluida en el token.
      const claims = verifyAccessToken(bearerToken, jwtSettings);
      const user = await userRepository.findById(claims.userId);

      if (!user) {
        next(new HttpError(401, "TOKEN_INVALIDO", "El token no es válido o expiró."));
        return;
      }

      // Usa el rol actual de la base para que un cambio de permisos no dependa de un token viejo.
      request.user = { id: user.id, role: user.role };
      next();
    } catch (error) {
      // El manejador global mantiene el formato común para tokens inválidos y otros errores.
      next(error);
    }
  };
}
