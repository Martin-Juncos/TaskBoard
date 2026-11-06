import { HttpError } from "../errors/http-error";
import { normalizeEmail } from "./email";
import { isRecord } from "./is-record";

export interface LoginUserInput {
  email: string;
  password: string;
}

// Valida los campos necesarios para iniciar sesión y conserva intacta la contraseña.
export function validateLoginUserInput(input: unknown): LoginUserInput {
  const body = isRecord(input) ? input : {};
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const missingFields = [email.trim() ? null : "email", password.trim() ? null : "password"].filter(
    (field): field is string => field !== null,
  );

  if (missingFields.length > 0) {
    throw new HttpError(
      400,
      "VALIDACION_LOGIN",
      `Los campos obligatorios son: ${missingFields.join(", ")}.`,
    );
  }

  return { email: normalizeEmail(email), password };
}
