const boardEl = document.getElementById('board');
const toastEl = document.getElementById('toast');
let board = { columns: [], cards: [] };
let editing = null;

async function load() {
  board = await (await fetch('/api/board')).json();
  render();
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

function render() {
  boardEl.innerHTML = board.columns.map((col) => {
    const cards = board.cards.filter((c) => c.column === col.id);
    const limited = col.wipLimit != null;
    const full = limited && cards.length >= col.wipLimit;
    const count = limited ? `${cards.length} / ${col.wipLimit}` : `${cards.length}`;
    const limitControl = editing === col.id
      ? `<input class="limit-input" type="number" min="1" step="1" value="${limited ? col.wipLimit : ''}" placeholder="∞" aria-label="WIP limit for ${escapeHtml(col.name)}" />`
      : `<button class="edit-limit" type="button" title="Edit limit" aria-label="Edit limit for ${escapeHtml(col.name)}">✎</button>`;
    return `<section class="column${full ? ' at-limit' : ''}" data-col="${col.id}">
      <h2><span>${escapeHtml(col.name)}</span><span class="meta"><span class="count">${count}</span>${limitControl}</span></h2>
      ${cards.map((c) => `<div class="card" draggable="true" data-id="${c.id}">${escapeHtml(c.title)}</div>`).join('')}
    </section>`;
  }).join('');
  const input = boardEl.querySelector('.limit-input');
  if (input) { input.focus(); input.select(); }
}

function showToast(message) {
  toastEl.querySelector('.toast-message').textContent = message;
  toastEl.hidden = false;
}
toastEl.querySelector('.toast-close').addEventListener('click', () => { toastEl.hidden = true; });

async function api(method, url, body) {
  const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) showToast((await res.json().catch(() => ({}))).error || `Request failed (${res.status})`);
  return res.ok;
}

boardEl.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', e.target.dataset.id));
boardEl.addEventListener('dragover', (e) => { const col = e.target.closest('.column'); if (col) { e.preventDefault(); col.classList.add('over'); } });
boardEl.addEventListener('dragleave', (e) => e.target.closest('.column')?.classList.remove('over'));
boardEl.addEventListener('drop', async (e) => {
  const col = e.target.closest('.column');
  if (!col) return;
  e.preventDefault();
  col.classList.remove('over');
  const card = board.cards.find((c) => String(c.id) === e.dataTransfer.getData('text/plain'));
  if (!card || card.column === col.dataset.col) return;
  card.column = col.dataset.col;
  render();
  await api('PATCH', '/api/cards/' + card.id, { column: col.dataset.col });
  load();
});

boardEl.addEventListener('click', (e) => {
  if (!e.target.closest('.edit-limit')) return;
  editing = e.target.closest('.column').dataset.col;
  render();
});
boardEl.addEventListener('keydown', async (e) => {
  if (!e.target.matches('.limit-input')) return;
  if (e.key === 'Escape') { editing = null; render(); return; }
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const raw = e.target.value.trim();
  const id = editing;
  editing = null;
  await api('PATCH', '/api/columns/' + id, { wipLimit: raw === '' ? null : Number(raw) });
  load();
});
boardEl.addEventListener('focusout', (e) => {
  if (e.target.matches('.limit-input') && editing) { editing = null; render(); }
});

document.getElementById('new-card').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('new-title');
  if (!input.value.trim()) return;
  if (await api('POST', '/api/cards', { title: input.value })) input.value = '';
  load();
});

load();
