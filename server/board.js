const fs = require('fs');
const path = require('path');

const DEFAULT = {
  columns: [
    { id: 'todo', name: 'To do' },
    { id: 'doing', name: 'In progress' },
    { id: 'review', name: 'Review' },
    { id: 'done', name: 'Done' },
  ],
  cards: [
    { id: 1, title: 'Draft Q4 roadmap', column: 'todo' },
    { id: 2, title: 'Fix login redirect loop', column: 'doing' },
    { id: 3, title: 'Migrate billing to Java 17', column: 'doing' },
    { id: 4, title: 'Add rate limits to partner API', column: 'review' },
    { id: 5, title: 'Ship status page', column: 'done' },
  ],
};

function createStore(file) {
  let board = structuredClone(DEFAULT);
  if (file && fs.existsSync(file)) board = JSON.parse(fs.readFileSync(file, 'utf8'));
  const save = () => {
    if (!file) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(board, null, 2));
  };
  return {
    get: () => board,
    addCard(title, column = 'todo') {
      const card = { id: Math.max(0, ...board.cards.map((c) => c.id)) + 1, title, column };
      board.cards.push(card);
      save();
      return card;
    },
    moveCard(id, column) {
      const card = board.cards.find((c) => c.id === id);
      if (!card) throw Object.assign(new Error('card not found'), { status: 404 });
      if (!board.columns.some((c) => c.id === column)) throw Object.assign(new Error('unknown column'), { status: 400 });
      card.column = column;
      save();
      return card;
    },
  };
}

module.exports = { createStore };
