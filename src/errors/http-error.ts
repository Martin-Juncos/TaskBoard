export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;

  // Guarda en un mismo error la información necesaria para construir una respuesta HTTP clara.
  constructor(statusCode: number, code: string, message: string) {
    super(message);

    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}
