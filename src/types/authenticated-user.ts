import type { UserRole } from "./user-role";

// Representa la identidad mínima que se expone a una solicitud autenticada.
export interface AuthenticatedUser {
  id: number;
  role: UserRole;
}
