const express = require('express');
const path = require('path');
const { createStore } = require('./board');

function createApp(store = createStore()) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));
  const send = (res, status, fn) => {
    try { res.status(status).json(fn()); }
    catch (e) { res.status(e.status || 500).json({ error: e.message }); }
  };
  app.get('/api/board', (req, res) => res.json(store.get()));
  app.post('/api/cards', (req, res) => {
    const title = String((req.body || {}).title || '').trim();
    if (!title) return res.status(400).json({ error: 'title required' });
    send(res, 201, () => store.addCard(title, req.body.column));
  });
  app.patch('/api/cards/:id', (req, res) => {
    send(res, 200, () => store.moveCard(Number(req.params.id), (req.body || {}).column));
  });
  app.patch('/api/columns/:id', (req, res) => {
    const body = req.body || {};
    if (!('wipLimit' in body)) return res.status(400).json({ error: 'wipLimit required' });
    send(res, 200, () => store.setWipLimit(req.params.id, body.wipLimit));
  });
  return app;
}

module.exports = { createApp };
