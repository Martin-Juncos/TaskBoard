import type { RequestHandler } from "express";
import { HttpError } from "../errors/http-error";

// Convierte las solicitudes sin una ruta registrada en errores 404 para el manejador global.
const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(
    new HttpError(
      404,
      "RUTA_NO_ENCONTRADA",
      `La ruta ${request.method} ${request.path} no existe.`,
    ),
  );
};

export default notFoundHandler;
