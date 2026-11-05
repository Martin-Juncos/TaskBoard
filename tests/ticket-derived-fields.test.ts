import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateAlert, calculateCompleted } from "../src/utils/ticket-derived-fields";

// Usa una fecha fija para que los resultados no cambien según el día de ejecución.
const today = new Date(2026, 10, 5, 12);

// Deriva completed únicamente del estado actual del ticket.
test("calcula completed desde el estado", () => {
  assert.equal(calculateCompleted("completed"), true);
  assert.equal(calculateCompleted("in_progress"), false);
});

// Activa alertas para fechas vencidas pendientes, pero no para fechas futuras o tareas terminadas.
test("calcula alert desde dueDate y status", () => {
  assert.equal(calculateAlert("2026-11-04", "pending", today), true);
  assert.equal(calculateAlert("2026-11-06", "pending", today), false);
  assert.equal(calculateAlert("2026-11-04", "completed", today), false);
  assert.equal(calculateAlert("2026-11-05", "in_progress", today), false);
  assert.equal(calculateAlert("fecha-invalida", "pending", today), false);
});
