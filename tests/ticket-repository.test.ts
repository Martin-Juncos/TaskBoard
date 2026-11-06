import assert from "node:assert/strict";
import { test } from "node:test";
import { Op } from "sequelize";
import type { Ticket } from "../src/models/ticket";
import { TicketRepository, type TicketRepositoryModel } from "../src/repositories/ticket-repository";
import type { CreateTicketRecord } from "../src/repositories/ticket-repository";

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

// Comprueba que la creación y el listado deleguen al modelo Sequelize con orden estable.
test("crea tickets y lista registros en orden de ID", async () => {
  const expected = { id: 12, title: "Configurar tablero" } as Ticket;
  const record = {
    title: "Configurar tablero",
    description: null,
    type: "task",
    priority: "medium",
    status: "pending",
    dueDate: "2099-01-01",
    createdById: 5,
    assigneeId: null,
    branchType: "chore",
    branchName: "chore/configurar-tablero",
    commitType: "chore",
    commitScope: null,
    commitDescription: "Configurar tablero",
  } as CreateTicketRecord;
  const calls: string[] = [];
  const model = {
    create: async (input: CreateTicketRecord) => {
      calls.push(`create:${input.createdById}`);
      return expected;
    },
    findAll: async (options: { order: string[][] }) => {
      calls.push(`findAll:${options.order[0].join(":")}`);
      return [expected];
    },
  } as unknown as TicketRepositoryModel;
  const repository = new TicketRepository(model);

  assert.equal(await repository.create(record), expected);
  assert.deepEqual(await repository.findAll(), [expected]);
  assert.deepEqual(calls, ["create:5", "findAll:id:ASC"]);
});

// Comprueba que la consulta use ILIKE en título y descripción y escape caracteres comodín.
test("busca tickets por título o descripción con coincidencia parcial", async () => {
  let capturedOptions: { where?: unknown; order: unknown } | undefined;
  const model = {
    findAll: async (options: { where?: unknown; order: unknown }) => {
      capturedOptions = options;
      return [];
    },
  } as unknown as TicketRepositoryModel;
  const repository = new TicketRepository(model);

  await repository.findAll({
    search: "100%_API",
    status: "pending",
    priority: "high",
    type: "bug",
    assigneeId: 44,
    mineUserId: 44,
    unassigned: true,
  });
  assert.ok(capturedOptions);
  const where = capturedOptions.where as { [Op.and]: Array<Record<string | symbol, unknown>> };
  const conditions = where[Op.and];
  assert.deepEqual(conditions.slice(0, 6), [
    { status: "pending" },
    { priority: "high" },
    { type: "bug" },
    { assigneeId: 44 },
    { assigneeId: 44 },
    { assigneeId: null },
  ]);
  const search = conditions[6] as { [Op.or]: Array<Record<string, Record<symbol, string>>> };
  assert.equal(search[Op.or][0].title[Op.iLike], "%100\\%\\_API%");
  assert.equal(search[Op.or][1].description[Op.iLike], "%100\\%\\_API%");
  assert.deepEqual(capturedOptions.order, [["id", "ASC"]]);
});
