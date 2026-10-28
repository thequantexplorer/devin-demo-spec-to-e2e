const fs = require('fs');
const path = require('path');

const DEFAULT = {
  columns: [
    { id: 'todo', name: 'To do', wipLimit: null },
    { id: 'doing', name: 'In progress', wipLimit: 3 },
    { id: 'review', name: 'Review', wipLimit: 2 },
    { id: 'done', name: 'Done', wipLimit: null },
  ],
  cards: [
    { id: 1, title: 'Draft Q4 roadmap', column: 'todo' },
    { id: 2, title: 'Fix login redirect loop', column: 'doing' },
    { id: 3, title: 'Migrate billing to Java 17', column: 'doing' },
    { id: 4, title: 'Add rate limits to partner API', column: 'review' },
    { id: 5, title: 'Ship status page', column: 'done' },
  ],
};

const httpError = (status, message) => Object.assign(new Error(message), { status });

function applyDefaultLimits(board) {
  for (const col of board.columns) {
    if (col.wipLimit !== undefined) continue;
    const seed = DEFAULT.columns.find((c) => c.id === col.id);
    col.wipLimit = seed ? seed.wipLimit : null;
  }
  return board;
}

function createStore(file) {
  let board = structuredClone(DEFAULT);
  if (file && fs.existsSync(file)) board = applyDefaultLimits(JSON.parse(fs.readFileSync(file, 'utf8')));
  const save = () => {
    if (!file) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(board, null, 2));
  };
  const findColumn = (id) => board.columns.find((c) => c.id === id);
  const assertRoom = (col) => {
    if (col.wipLimit == null) return;
    const count = board.cards.filter((c) => c.column === col.id).length;
    if (count >= col.wipLimit) throw httpError(409, `WIP limit reached for ${col.name} (${col.wipLimit})`);
  };
  return {
    get: () => board,
    addCard(title, column = 'todo') {
      const col = findColumn(column);
      if (!col) throw httpError(400, 'unknown column');
      assertRoom(col);
      const card = { id: Math.max(0, ...board.cards.map((c) => c.id)) + 1, title, column };
      board.cards.push(card);
      save();
      return card;
    },
    moveCard(id, column) {
      const card = board.cards.find((c) => c.id === id);
      if (!card) throw httpError(404, 'card not found');
      const col = findColumn(column);
      if (!col) throw httpError(400, 'unknown column');
      if (card.column === col.id) return card;
      assertRoom(col);
      card.column = column;
      save();
      return card;
    },
    setWipLimit(id, wipLimit) {
      const col = findColumn(id);
      if (!col) throw httpError(404, 'column not found');
      if (wipLimit === null || wipLimit === '') col.wipLimit = null;
      else if (Number.isInteger(wipLimit) && wipLimit > 0) col.wipLimit = wipLimit;
      else throw httpError(400, 'wipLimit must be a positive integer or null');
      save();
      return col;
    },
  };
}

module.exports = { createStore };
