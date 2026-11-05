import type { ErrorRequestHandler } from "express";
import { HttpError } from "../errors/http-error";

// Identifica los errores que express.json genera cuando el cuerpo recibido no es JSON válido.
function isMalformedJsonError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const parserError = error as { status?: unknown; type?: unknown };
  return parserError.status === 400 && parserError.type === "entity.parse.failed";
}

// Convierte los errores de la aplicación en una respuesta JSON uniforme y no expone detalles internos.
const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (isMalformedJsonError(error)) {
    response.status(400).json({
      error: {
        code: "JSON_INVALIDO",
        message: "El cuerpo de la solicitud contiene JSON inválido.",
      },
    });
    return;
  }

  response.status(500).json({
    error: {
      code: "ERROR_INTERNO",
      message: "Ocurrió un error inesperado.",
    },
  });
};

export default errorHandler;
