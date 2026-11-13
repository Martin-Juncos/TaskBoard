// Define los tipos de ticket que puede clasificar el tablero.
export const TICKET_TYPES = ["feature", "bug", "task"] as const;
// Deriva el tipo permitido directamente de los valores usados en validación.
export type TicketType = (typeof TICKET_TYPES)[number];

// Define las prioridades disponibles para ordenar el trabajo.
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
// Mantiene sincronizado el tipo de prioridad con sus valores permitidos.
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

// Define las columnas de estado y su valor inicial para tickets nuevos.
export const TICKET_STATUSES = [
  "pending",
  "in_progress",
  "in_review",
  "completed",
  "blocked",
] as const;
// Restringe los estados del dominio a las columnas definidas para el tablero.
export type TicketStatus = (typeof TICKET_STATUSES)[number];

// Define los prefijos de rama sugeridos por la aplicación.
export const BRANCH_TYPES = ["feature", "bugfix", "hotfix", "release", "chore"] as const;
// Restringe los prefijos válidos de las ramas sugeridas.
export type BranchType = (typeof BRANCH_TYPES)[number];

// Define los tipos de mensaje Conventional Commits admitidos.
export const COMMIT_TYPES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "test",
  "build",
  "ci",
  "perf",
  "chore",
] as const;
// Restringe los tipos de Conventional Commit que puede sugerir la aplicación.
export type CommitType = (typeof COMMIT_TYPES)[number];
