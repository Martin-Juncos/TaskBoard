import type { AuthenticatedUser } from "./authenticated-user";

// Agrega la identidad autenticada al tipo Request de Express.
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
