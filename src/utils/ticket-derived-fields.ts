import type { TicketStatus } from "../types/ticket-enums";

// Calcula si el ticket está completado sin guardar un segundo estado redundante.
export function calculateCompleted(status: TicketStatus): boolean {
  return status === "completed";
}

// Convierte una fecha a YYYY-MM-DD para comparar fechas de calendario sin depender de horas.
function toCalendarDate(value: Date | string): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

// Marca una alerta solo si venció la fecha límite y el ticket todavía no está completado.
export function calculateAlert(dueDate: Date | string, status: TicketStatus, now: Date = new Date()): boolean {
  const dueDateValue = toCalendarDate(dueDate);
  const currentDateValue = toCalendarDate(now);
  return dueDateValue !== null && currentDateValue !== null && dueDateValue < currentDateValue && !calculateCompleted(status);
}
