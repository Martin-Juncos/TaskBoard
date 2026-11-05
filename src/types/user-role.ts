// Define los roles admitidos por el tablero y el valor asignado a los registros nuevos.
export const USER_ROLES = ["admin", "developer"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_USER_ROLE: UserRole = "developer";

// Comprueba que un dato externo corresponda a uno de los roles admitidos.
export function isUserRole(role: unknown): role is UserRole {
  return typeof role === "string" && USER_ROLES.includes(role as UserRole);
}
