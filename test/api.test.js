const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../server/app');

test('board has four columns', async () => {
  const res = await request(createApp()).get('/api/board');
  assert.strictEqual(res.body.columns.length, 4);
});

test('adds and moves a card', async () => {
  const app = createApp();
  const card = await request(app).post('/api/cards').send({ title: 'Write tests' });
  assert.strictEqual(card.status, 201);
  const moved = await request(app).patch('/api/cards/' + card.body.id).send({ column: 'review' });
  assert.strictEqual(moved.body.column, 'review');
});
