import assert from "node:assert/strict";
import { test } from "node:test";
import { slugifyTitle, suggestBranchName, suggestBranchType, suggestCommitType } from "../src/utils/ticket-suggestions";

// Normaliza acentos, signos y espacios para obtener un fragmento apto para nombres de rama.
test("convierte títulos a slugs", () => {
  assert.equal(slugifyTitle("  Agregar búsqueda: ¿qué pasó?  "), "agregar-busqueda-que-paso");
  assert.equal(slugifyTitle("API / OAuth 2.0"), "api-oauth-2-0");
  assert.equal(slugifyTitle("¿!?"), "ticket");
});

// Sugiere los prefijos de rama acordados para cada tipo de ticket.
test("sugiere nombres y tipos de rama", () => {
  assert.equal(suggestBranchName("feature", "Agregar login"), "feature/agregar-login");
  assert.equal(suggestBranchType("bug"), "bugfix");
  assert.equal(suggestBranchName("bug", "No carga el tablero"), "bugfix/no-carga-el-tablero");
  assert.equal(suggestBranchName("task", "Actualizar README"), "chore/actualizar-readme");
});

// Sugiere el tipo Conventional Commit según el tipo de ticket.
test("sugiere tipos de commit", () => {
  assert.equal(suggestCommitType("feature"), "feat");
  assert.equal(suggestCommitType("bug"), "fix");
  assert.equal(suggestCommitType("task"), "chore");
});
