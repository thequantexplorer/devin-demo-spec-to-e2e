const boardEl = document.getElementById('board');
let board = { columns: [], cards: [] };

async function load() {
  board = await (await fetch('/api/board')).json();
  render();
}

function render() {
  boardEl.innerHTML = board.columns.map((col) => {
    const cards = board.cards.filter((c) => c.column === col.id);
    return `<section class="column" data-col="${col.id}">
      <h2><span>${col.name}</span><span class="count">${cards.length}</span></h2>
      ${cards.map((c) => `<div class="card" draggable="true" data-id="${c.id}">${c.title}</div>`).join('')}
    </section>`;
  }).join('');
}

boardEl.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', e.target.dataset.id));
boardEl.addEventListener('dragover', (e) => { const col = e.target.closest('.column'); if (col) { e.preventDefault(); col.classList.add('over'); } });
boardEl.addEventListener('dragleave', (e) => e.target.closest('.column')?.classList.remove('over'));
boardEl.addEventListener('drop', async (e) => {
  const col = e.target.closest('.column');
  if (!col) return;
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  await fetch('/api/cards/' + id, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ column: col.dataset.col }) });
  load();
});

document.getElementById('new-card').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('new-title');
  if (!input.value.trim()) return;
  await fetch('/api/cards', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: input.value }) });
  input.value = '';
  load();
});

load();
