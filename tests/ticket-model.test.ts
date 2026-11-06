import assert from "node:assert/strict";
import { test } from "node:test";
import { Ticket } from "../src/models/ticket";
import { User } from "../src/models/user";
import {
  BRANCH_TYPES,
  COMMIT_TYPES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TYPES,
} from "../src/types/ticket-enums";

// Comprueba que el modelo mantenga los campos acordados y enumere los valores permitidos.
test("define los campos y enums acordados para tickets", () => {
  assert.equal(Ticket.getTableName(), "tickets");
  assert.deepEqual(Object.keys(Ticket.getAttributes()), [
    "id",
    "title",
    "description",
    "type",
    "priority",
    "status",
    "dueDate",
    "createdById",
    "assigneeId",
    "branchType",
    "branchName",
    "commitType",
    "commitScope",
    "commitDescription",
    "createdAt",
    "updatedAt",
  ]);
  assert.deepEqual(TICKET_TYPES, ["feature", "bug", "task"]);
  assert.deepEqual(TICKET_PRIORITIES, ["low", "medium", "high", "urgent"]);
  assert.deepEqual(TICKET_STATUSES, [
    "pending",
    "in_progress",
    "in_review",
    "completed",
    "blocked",
  ]);
  assert.deepEqual(BRANCH_TYPES, ["feature", "bugfix", "hotfix", "release", "chore"]);
  assert.deepEqual(COMMIT_TYPES, [
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
  ]);
});

// Comprueba que autor y responsable sean dos asociaciones distintas con User.
test("asocia ticket con el usuario autor y el usuario responsable", () => {
  assert.equal(Ticket.associations.author.target, User);
  assert.equal(Ticket.associations.author.foreignKey, "createdById");
  assert.equal(Ticket.associations.assignee.target, User);
  assert.equal(Ticket.associations.assignee.foreignKey, "assigneeId");
  assert.equal(User.associations.createdTickets.foreignKey, "createdById");
  assert.equal(User.associations.assignedTickets.foreignKey, "assigneeId");
});
