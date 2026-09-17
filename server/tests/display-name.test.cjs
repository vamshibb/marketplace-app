// node --test tests/display-name.test.cjs
require("ts-node/register/transpile-only");
const assert = require("node:assert/strict");
const { test, before, after } = require("node:test");
const { Module } = require("node:module");
const express = require("express");
const bcrypt = require("bcrypt");

function stub(path, exports) {
  const id = require.resolve(path);
  const module = new Module(id);
  module.exports = exports;
  module.loaded = true;
  require.cache[id] = module;
}

const users = new Map();
stub("../src/config/env.ts", { env: { JWT_SECRET: "display-name-test-secret" } });
stub("../src/prisma/client.ts", { prisma: { user: {
  findUnique: async ({ where, select }) => {
    const user = [...users.values()].find((item) => where.id ? item.id === where.id : item.email === where.email);
    if (!user) return null;
    return select ? Object.fromEntries(Object.keys(select).map((key) => [key, user[key]])) : user;
  },
  create: async ({ data }) => {
    const user = { ...data, id: `user-${users.size}` };
    users.set(user.email, user);
    return user;
  },
} } });
const app = express();
app.use(express.json());
app.use("/auth", require("../src/routes/auth.routes.ts").default);
app.use((error, req, res, next) => res.status(error.statusCode ?? 500).json({ message: error.message }));
let server;
let url;
before(async () => {
  users.set("legacy@test.com", { id: "legacy-id", email: "legacy@test.com", displayName: null, password: await bcrypt.hash("secret123", 10) });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${server.address().port}/auth`;
});
after(async () => new Promise((resolve) => server.close(resolve)));
const post = (path, body) => fetch(url + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("registration requires a trimmed nonempty displayName of at most 100 characters", async () => {
  for (const displayName of [undefined, null, "", "   ", "x".repeat(101)]) {
    assert.equal((await post("/register", { email: "new@test.com", password: "secret123", displayName })).status, 400);
  }
  assert.equal(users.size, 1);
});

test("registration persists the trimmed name and returns only public identity", async () => {
  const response = await post("/register", { email: "new@test.com", password: "secret123", displayName: "  New User  " });
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.deepEqual(data.user, { id: "user-1", email: "new@test.com", displayName: "New User" });
  assert.equal(users.get("new@test.com").displayName, "New User");
  assert.notEqual(users.get("new@test.com").password, "secret123");
  const me = await fetch(url + "/me", { headers: { Authorization: `Bearer ${data.token}` } });
  assert.deepEqual((await me.json()).data, data.user);
});

test("existing null-name users can log in and retain their identity", async () => {
  const response = await post("/login", { email: "legacy@test.com", password: "secret123" });
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.deepEqual(data.user, { id: "legacy-id", email: "legacy@test.com", displayName: null });
  const me = await fetch(url + "/me", { headers: { Authorization: `Bearer ${data.token}` } });
  assert.deepEqual((await me.json()).data, data.user);
});

test("shared user projection exposes only id, email, displayName", () => {
  const { userSummarySelect } = require("../src/repositories/user.select.ts");
  assert.deepEqual(userSummarySelect, { id: true, email: true, displayName: true });
  const { productSummaryInclude } = require("../src/repositories/product.repository.ts");
  assert.equal(productSummaryInclude.seller.select, userSummarySelect);
  const { orderSelect } = require("../src/repositories/order.repository.ts");
  assert.equal(orderSelect.buyer.select, userSummarySelect);
  assert.equal(orderSelect.seller.select, userSummarySelect);
});

test("conversation and message DTOs preserve names and null without email-derived fallbacks", () => {
  const { toConversationDTO, toConversationListDTO } = require("../src/dto/conversation.dto.ts");
  const { toMessageDTO } = require("../src/dto/message.dto.ts");
  const sender = { id: "a", email: "a@test.com", displayName: "Alpha" };
  const legacy = { id: "b", email: "b@test.com", displayName: null };
  const conversation = { id: "c", product: null, participants: [sender, legacy].map((user) => ({ userId: user.id, user })), messages: [], lastMessageAt: new Date(), createdAt: new Date() };
  assert.deepEqual(toConversationDTO(conversation).participants, [sender, legacy]);
  assert.deepEqual(toConversationListDTO(conversation, "a").otherParticipant, legacy);
  assert.deepEqual(toMessageDTO({ id: "m", content: "Hello", createdAt: new Date() }, sender).sender, sender);
});
