const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { createApp } = require('../server/app');
const { createStore } = require('../server/board');

const col = (board, id) => board.columns.find((c) => c.id === id);
const countIn = (board, id) => board.cards.filter((c) => c.column === id).length;
const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-')), 'data', 'board.json');

async function fillInProgress(app) {
  const res = await request(app).post('/api/cards').send({ title: 'Third in progress', column: 'doing' });
  assert.strictEqual(res.status, 201);
  return res.body;
}

test('seed defaults: In progress = 3, Review = 2, To do and Done unlimited', async () => {
  const { body } = await request(createApp()).get('/api/board');
  assert.strictEqual(col(body, 'doing').wipLimit, 3);
  assert.strictEqual(col(body, 'review').wipLimit, 2);
  assert.strictEqual(col(body, 'todo').wipLimit, null);
  assert.strictEqual(col(body, 'done').wipLimit, null);
});

test('moving a card into a full column returns 409 and the card stays put', async () => {
  const app = createApp();
  await fillInProgress(app);
  const res = await request(app).patch('/api/cards/1').send({ column: 'doing' });
  assert.strictEqual(res.status, 409);
  assert.deepStrictEqual(res.body, { error: 'WIP limit reached for In progress (3)' });
  const { body } = await request(app).get('/api/board');
  assert.strictEqual(body.cards.find((c) => c.id === 1).column, 'todo');
  assert.strictEqual(countIn(body, 'doing'), 3);
});

test('adding a card into a full column returns 409 and nothing is created', async () => {
  const app = createApp();
  await fillInProgress(app);
  const before = (await request(app).get('/api/board')).body.cards.length;
  const res = await request(app).post('/api/cards').send({ title: 'One too many', column: 'doing' });
  assert.strictEqual(res.status, 409);
  assert.deepStrictEqual(res.body, { error: 'WIP limit reached for In progress (3)' });
  assert.strictEqual((await request(app).get('/api/board')).body.cards.length, before);
});

test('409 message uses the column name and limit (Review = 2)', async () => {
  const app = createApp();
  await request(app).patch('/api/cards/2').send({ column: 'review' });
  const res = await request(app).patch('/api/cards/3').send({ column: 'review' });
  assert.strictEqual(res.status, 409);
  assert.deepStrictEqual(res.body, { error: 'WIP limit reached for Review (2)' });
});

test('a column can never go over its limit, and moving within a full column is a no-op', async () => {
  const app = createApp();
  await fillInProgress(app);
  for (const id of [1, 4, 5]) await request(app).patch('/api/cards/' + id).send({ column: 'doing' });
  const same = await request(app).patch('/api/cards/2').send({ column: 'doing' });
  assert.strictEqual(same.status, 200);
  assert.strictEqual(countIn((await request(app).get('/api/board')).body, 'doing'), 3);
});

test('unlimited columns accept any number of cards', async () => {
  const app = createApp();
  for (let i = 0; i < 10; i++) {
    assert.strictEqual((await request(app).post('/api/cards').send({ title: 'Card ' + i, column: 'todo' })).status, 201);
  }
});

test('PATCH /api/columns/:id raises a limit so a blocked move then succeeds (4 / 4)', async () => {
  const app = createApp();
  await fillInProgress(app);
  assert.strictEqual((await request(app).patch('/api/cards/1').send({ column: 'doing' })).status, 409);
  const patch = await request(app).patch('/api/columns/doing').send({ wipLimit: 4 });
  assert.strictEqual(patch.status, 200);
  assert.deepStrictEqual(patch.body, { id: 'doing', name: 'In progress', wipLimit: 4 });
  assert.strictEqual((await request(app).patch('/api/cards/1').send({ column: 'doing' })).status, 200);
  const { body } = await request(app).get('/api/board');
  assert.strictEqual(countIn(body, 'doing'), 4);
  assert.strictEqual(col(body, 'doing').wipLimit, 4);
});

test('PATCH /api/columns/:id with null or "" clears the limit', async () => {
  for (const cleared of [null, '']) {
    const app = createApp();
    const res = await request(app).patch('/api/columns/doing').send({ wipLimit: cleared });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.wipLimit, null);
    await fillInProgress(app);
    assert.strictEqual((await request(app).patch('/api/cards/1').send({ column: 'doing' })).status, 200);
  }
});

test('PATCH /api/columns/:id can set a limit on a previously unlimited column', async () => {
  const app = createApp();
  assert.strictEqual((await request(app).patch('/api/columns/todo').send({ wipLimit: 1 })).status, 200);
  const res = await request(app).post('/api/cards').send({ title: 'Second todo' });
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.body.error, 'WIP limit reached for To do (1)');
});

test('setting a limit below the current count is allowed but blocks new cards until it drains', async () => {
  const app = createApp();
  const res = await request(app).patch('/api/columns/doing').send({ wipLimit: 1 });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(countIn((await request(app).get('/api/board')).body, 'doing'), 2);
  assert.strictEqual((await request(app).patch('/api/cards/1').send({ column: 'doing' })).status, 409);
  await request(app).patch('/api/cards/2').send({ column: 'done' });
  assert.strictEqual((await request(app).patch('/api/cards/1').send({ column: 'doing' })).status, 409);
  await request(app).patch('/api/cards/3').send({ column: 'done' });
  assert.strictEqual((await request(app).patch('/api/cards/1').send({ column: 'doing' })).status, 200);
});

test('PATCH /api/columns/:id rejects invalid limits with 400 and unknown columns with 404', async () => {
  const app = createApp();
  for (const wipLimit of [0, -1, 2.5, '3', 'abc', true]) {
    const res = await request(app).patch('/api/columns/doing').send({ wipLimit });
    assert.strictEqual(res.status, 400, `wipLimit=${JSON.stringify(wipLimit)}`);
  }
  assert.strictEqual((await request(app).patch('/api/columns/doing').send({})).status, 400);
  assert.strictEqual((await request(app).patch('/api/columns/nope').send({ wipLimit: 2 })).status, 404);
  assert.strictEqual(col((await request(app).get('/api/board')).body, 'doing').wipLimit, 3);
});

test('limits persist in data/board.json across restarts', async () => {
  const file = tmpFile();
  await request(createApp(createStore(file))).patch('/api/columns/doing').send({ wipLimit: 4 });
  await request(createApp(createStore(file))).patch('/api/columns/review').send({ wipLimit: null });
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(col(saved, 'doing').wipLimit, 4);
  assert.strictEqual(col(saved, 'review').wipLimit, null);
  const { body } = await request(createApp(createStore(file))).get('/api/board');
  assert.strictEqual(col(body, 'doing').wipLimit, 4);
  assert.strictEqual(col(body, 'review').wipLimit, null);
});

test('a board.json saved before WIP limits picks up the seed defaults', async () => {
  const file = tmpFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const legacy = structuredClone(createStore().get());
  legacy.columns.forEach((c) => delete c.wipLimit);
  fs.writeFileSync(file, JSON.stringify(legacy));
  const { body } = await request(createApp(createStore(file))).get('/api/board');
  assert.deepStrictEqual(body.columns.map((c) => c.wipLimit), [null, 3, 2, null]);
});
