import type { RequestHandler } from "express";
import type { LoginUserService } from "../services/login-user-service";
import type { RegisterUserService } from "../services/register-user-service";

// Adapta el caso de uso de registro a la respuesta HTTP sin incluir lógica de persistencia.
export function createRegisterUserController(
  registerUserService: Pick<RegisterUserService, "execute">,
): RequestHandler {
  return async (request, response, next) => {
    try {
      // Ejecuta el servicio con el JSON recibido y responde 201 al crear la cuenta.
      const user = await registerUserService.execute(request.body);
      response.status(201).json(user);
    } catch (error) {
      // Deja que el middleware global transforme los errores en respuestas JSON.
      next(error);
    }
  };
}

// Adapta el inicio de sesión a HTTP y devuelve el token creado por el servicio.
export function createLoginUserController(
  loginUserService: Pick<LoginUserService, "execute">,
): RequestHandler {
  return async (request, response, next) => {
    try {
      // Ejecuta la comparación de credenciales y responde con el token de acceso.
      const result = await loginUserService.execute(request.body);
      response.status(200).json(result);
    } catch (error) {
      // Deja que el middleware global convierta errores de login en respuestas JSON.
      next(error);
    }
  };
}
