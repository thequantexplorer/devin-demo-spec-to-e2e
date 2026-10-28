const express = require('express');
const path = require('path');
const { createStore } = require('./board');

function createApp(store = createStore()) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('/api/board', (req, res) => res.json(store.get()));
  app.post('/api/cards', (req, res) => {
    const title = String((req.body || {}).title || '').trim();
    if (!title) return res.status(400).json({ error: 'title required' });
    res.status(201).json(store.addCard(title, req.body.column));
  });
  app.patch('/api/cards/:id', (req, res) => {
    try { res.json(store.moveCard(Number(req.params.id), req.body.column)); }
    catch (e) { res.status(e.status || 500).json({ error: e.message }); }
  });
  return app;
}

module.exports = { createApp };
