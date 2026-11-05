// Define los tipos de ticket que puede clasificar el tablero.
export const TICKET_TYPES = ["feature", "bug", "task"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

// Define las prioridades disponibles para ordenar el trabajo.
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

// Define las columnas de estado y su valor inicial para tickets nuevos.
export const TICKET_STATUSES = ["pending", "in_progress", "in_review", "completed", "blocked"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

// Define los prefijos de rama sugeridos por la aplicación.
export const BRANCH_TYPES = ["feature", "bugfix", "hotfix", "release", "chore"] as const;
export type BranchType = (typeof BRANCH_TYPES)[number];

// Define los tipos de mensaje Conventional Commits admitidos.
export const COMMIT_TYPES = ["feat", "fix", "docs", "style", "refactor", "test", "build", "ci", "perf", "chore"] as const;
export type CommitType = (typeof COMMIT_TYPES)[number];
