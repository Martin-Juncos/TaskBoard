import { HttpError } from "../errors/http-error";
import { normalizeEmail } from "./email";
import { isRecord } from "./is-record";

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

// Valida y normaliza los datos públicos de registro sin aceptar un rol enviado por el cliente.
export function validateRegisterUserInput(input: unknown): RegisterUserInput {
  const body = isRecord(input) ? input : {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  // Informa en un solo error si falta alguno de los tres campos requeridos.
  const missingFields = [
    name ? null : "name",
    email.trim() ? null : "email",
    password.trim() ? null : "password",
  ].filter((field): field is string => field !== null);

  if (missingFields.length > 0) {
    throw new HttpError(
      400,
      "VALIDACION_REGISTRO",
      `Los campos obligatorios son: ${missingFields.join(", ")}.`,
    );
  }

  return {
    name,
    email: normalizeEmail(email),
    password,
  };
}
