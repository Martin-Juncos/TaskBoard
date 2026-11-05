import type { BranchType, CommitType, TicketType } from "../types/ticket-enums";

// Convierte un título en un fragmento legible para nombres de rama.
export function slugifyTitle(title: string): string {
  const slug = title
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Usa un valor estable cuando el título está vacío o solo tiene símbolos.
  return slug || "ticket";
}

// Relaciona cada tipo de ticket con el prefijo de rama acordado para el proyecto.
export function suggestBranchType(ticketType: TicketType): BranchType {
  const branchTypes: Record<TicketType, BranchType> = {
    feature: "feature",
    bug: "bugfix",
    task: "chore",
  };
  return branchTypes[ticketType];
}

// Arma el nombre sugerido de la rama combinando el prefijo y el slug del título.
export function suggestBranchName(ticketType: TicketType, title: string): string {
  return `${suggestBranchType(ticketType)}/${slugifyTitle(title)}`;
}

// Relaciona cada tipo de ticket con el tipo Conventional Commit acordado.
export function suggestCommitType(ticketType: TicketType): CommitType {
  const commitTypes: Record<TicketType, CommitType> = {
    feature: "feat",
    bug: "fix",
    task: "chore",
  };
  return commitTypes[ticketType];
}
