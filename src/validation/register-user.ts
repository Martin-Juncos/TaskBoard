import { HttpError } from "../errors/http-error";

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valida y normaliza los datos públicos de registro sin aceptar un rol enviado por el cliente.
export function validateRegisterUserInput(input: unknown): RegisterUserInput {
  const body = isObject(input) ? input : {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  // Informa en un solo error si falta alguno de los tres campos requeridos.
  const missingFields = [
    name ? null : "name",
    email ? null : "email",
    password.trim() ? null : "password",
  ].filter((field): field is string => field !== null);

  if (missingFields.length > 0) {
    throw new HttpError(
      400,
      "VALIDACION_REGISTRO",
      `Los campos obligatorios son: ${missingFields.join(", ")}.`,
    );
  }

  // Rechaza emails con formato inválido antes de llegar al modelo o al repositorio.
  if (!EMAIL_PATTERN.test(email)) {
    throw new HttpError(400, "EMAIL_INVALIDO", "El email debe tener un formato válido.");
  }

  return {
    name,
    email: email.toLowerCase(),
    password,
  };
}

// Comprueba que el cuerpo sea un objeto antes de leer sus campos.
function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
