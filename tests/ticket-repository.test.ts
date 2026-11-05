import assert from "node:assert/strict";
import { test } from "node:test";
import type { Ticket } from "../src/models/ticket";
import { TicketRepository, type TicketRepositoryModel } from "../src/repositories/ticket-repository";

// Comprueba que la búsqueda por ID delegue en Sequelize y devuelva el ticket encontrado.
test("busca tickets por ID", async () => {
  const expected = { id: 12, title: "Configurar tablero" } as Ticket;
  const calls: number[] = [];
  const model = {
    findByPk: async (id: number) => {
      calls.push(id);
      return expected;
    },
  } as unknown as TicketRepositoryModel;
  const repository = new TicketRepository(model);

  assert.equal(await repository.findById(12), expected);
  assert.deepEqual(calls, [12]);
});
