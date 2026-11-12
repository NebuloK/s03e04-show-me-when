import { fetchIncidents, ack } from './api.js';

const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const byId = new Map();
const acked = new Set();

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' });
const local = (iso) => fmt.format(new Date(iso));

function row(i) {
  const done = acked.has(i.id);
  return `<li data-testid="incident-row" data-id="${esc(i.id)}" class="row ${esc(i.severity)}">
    <span class="id">${esc(i.id)}</span>
    <span class="sev">${esc(i.severity)}</span>
    <span class="what">${esc(i.service)} · ${esc(i.region)} · ${esc(i.summary)}</span>
    <time datetime="${esc(i.openedAt)}">${local(i.openedAt)}</time>
    ${done ? '<span data-testid="acked" class="acked">acked ✓</span>' : '<button data-testid="ack" type="button">Ack</button>'}
  </li>`;
}

function render() {
  const items = [...byId.values()].sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
  list.innerHTML = items.map(row).join('');
  empty.hidden = items.length > 0;
}

list.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-testid="ack"]');
  if (!btn) return;
  const id = btn.closest('[data-testid="incident-row"]').dataset.id;
  btn.disabled = true;
  try {
    await ack(id);
    acked.add(id);
    render();
  } catch (err) {
    console.error(err);
    btn.disabled = false;
  }
});

async function refresh() {
  try {
    const page = await fetchIncidents();
    for (const i of page.incidents) byId.set(i.id, i);
    loader.remove();
    render();
  } catch (err) {
    console.error(err);
  }
}

await refresh();
setInterval(refresh, 2000);
