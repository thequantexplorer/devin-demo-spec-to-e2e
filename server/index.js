const path = require('path');
const { createApp } = require('./app');
const { createStore } = require('./board');
const port = process.env.PORT || 3100;
createApp(createStore(path.join(__dirname, '..', 'data', 'board.json'))).listen(port, () => console.log('kanban on http://localhost:' + port));
