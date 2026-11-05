import { HttpError } from "../errors/http-error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valida el formato de email y lo normaliza para búsquedas y restricciones únicas.
export function normalizeEmail(email: string): string {
  const normalizedEmail = email.trim();

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new HttpError(400, "EMAIL_INVALIDO", "El email debe tener un formato válido.");
  }

  return normalizedEmail.toLowerCase();
}
