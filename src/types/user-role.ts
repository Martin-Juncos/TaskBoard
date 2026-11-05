// Define los roles admitidos por el tablero y el valor asignado a los registros nuevos.
export const USER_ROLES = ["admin", "developer"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_USER_ROLE: UserRole = "developer";
