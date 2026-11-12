import { fetchIncidents, ack } from './api.js';

const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const byId = new Map();
const acked = new Set();
const panel = document.querySelector('[data-testid="incident-panel"]');
let selected = null;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' });
const local = (iso) => fmt.format(new Date(iso));

function row(i) {
  const done = acked.has(i.id);
  return `<li data-testid="incident-row" data-id="${esc(i.id)}" tabindex="0" class="row ${esc(i.severity)}${selected === i.id ? ' selected' : ''}">
    <span class="id">${esc(i.id)}</span>
    <span class="sev">${esc(i.severity)}</span>
    <span class="what">${esc(i.service)} · ${esc(i.region)} · ${esc(i.summary)}</span>
    <time datetime="${esc(i.openedAt)}">${local(i.openedAt)}</time>
    ${done ? '<span data-testid="acked" class="acked">acked ✓</span>' : ''}
  </li>`;
}

function renderPanel() {
  const i = selected && byId.get(selected);
  panel.hidden = !i;
  if (!i) return;
  const done = acked.has(i.id);
  panel.dataset.id = i.id;
  panel.innerHTML = `<h2>${esc(i.id)}</h2>
    <p>${esc(i.service)} · ${esc(i.region)} · ${esc(i.severity)}</p>
    <p>${esc(i.summary)}</p>
    <p>opened <time datetime="${esc(i.openedAt)}">${local(i.openedAt)}</time></p>
    ${done ? '<p class="acked">acked ✓</p>' : '<button data-testid="panel-ack" type="button">Ack</button>'}`;
}

function render() {
  const items = [...byId.values()].sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
  list.innerHTML = items.map(row).join('');
  empty.hidden = items.length > 0;
  renderPanel();
}

// A row opens its incident panel. The panel is tied to the incident id, so new rows never change its target.
function open(e) {
  const r = e.target.closest('[data-testid="incident-row"]');
  if (!r) return;
  selected = r.dataset.id;
  render();
}
list.addEventListener('click', open);
list.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(e); });

panel.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-testid="panel-ack"]');
  if (!btn) return;
  const id = panel.dataset.id;
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
