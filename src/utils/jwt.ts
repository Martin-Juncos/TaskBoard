import jwt, { type SignOptions } from "jsonwebtoken";
import type { AppConfig } from "../config/env";
import { HttpError } from "../errors/http-error";
import { USER_ROLES, type UserRole } from "../types/user-role";

export interface AccessTokenClaims {
  userId: number;
  role: UserRole;
}

type JwtSettings = Pick<AppConfig, "jwtSecret" | "jwtExpiresIn">;

// Firma un token de acceso con el identificador y rol del usuario y la expiración configurada.
export function signAccessToken(claims: AccessTokenClaims, settings: JwtSettings): string {
  return jwt.sign(
    { role: claims.role },
    settings.jwtSecret,
    {
      algorithm: "HS256",
      subject: String(claims.userId),
      expiresIn: settings.jwtExpiresIn as SignOptions["expiresIn"],
    },
  );
}

// Verifica firma, algoritmo y expiración, y solo devuelve identificadores y roles admitidos.
export function verifyAccessToken(token: string, settings: JwtSettings): AccessTokenClaims {
  try {
    const decoded = jwt.verify(token, settings.jwtSecret, { algorithms: ["HS256"] });

    if (typeof decoded === "string") {
      throw invalidTokenError();
    }

    const userId = Number(decoded.sub);
    if (!Number.isInteger(userId) || userId <= 0 || !isUserRole(decoded.role)) {
      throw invalidTokenError();
    }

    return { userId, role: decoded.role };
  } catch (error) {
    // No expone si el token expiró, la firma falló o el contenido estaba malformado.
    if (error instanceof HttpError) {
      throw error;
    }

    throw invalidTokenError();
  }
}

// Comprueba en tiempo de ejecución que el rol del token sea uno de los dos roles permitidos.
function isUserRole(role: unknown): role is UserRole {
  return typeof role === "string" && USER_ROLES.includes(role as UserRole);
}

// Usa una respuesta uniforme para cualquier token inválido o vencido.
function invalidTokenError(): HttpError {
  return new HttpError(401, "TOKEN_INVALIDO", "El token no es válido o expiró.");
}
