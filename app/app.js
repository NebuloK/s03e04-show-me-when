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

function makeRow(i) {
  const li = document.createElement('li');
  li.setAttribute('data-testid', 'incident-row');
  li.dataset.id = i.id;
  li.tabIndex = 0;
  li.className = `row ${i.severity}`;
  li.innerHTML = `<span class="id">${esc(i.id)}</span>
    <span class="sev">${esc(i.severity)}</span>
    <span class="what">${esc(i.service)} · ${esc(i.region)} · ${esc(i.summary)}</span>
    <time datetime="${esc(i.openedAt)}">${local(i.openedAt)}</time>
    <span class="mark"></span>`;
  return li;
}

function renderPanel() {
  const i = selected && byId.get(selected);
  panel.hidden = !i;
  if (!i) return;
  const done = acked.has(i.id);
  panel.dataset.id = i.id;
  const html = `<h2>${esc(i.id)}</h2>
    <p>${esc(i.service)} · ${esc(i.region)} · ${esc(i.severity)}</p>
    <p>${esc(i.summary)}</p>
    <p>opened <time datetime="${esc(i.openedAt)}">${local(i.openedAt)}</time></p>
    ${done ? '<p class="acked">acked ✓</p>' : '<button data-testid="panel-ack" type="button">Ack</button>'}`;
  if (panel._html !== html) { panel._html = html; panel.innerHTML = html; } // untouched while nothing changed, so a click is never lost
}

// Rows are kept, never rebuilt: a new incident adds one row at its place, so nothing else moves or is replaced.
const rowEls = new Map();
function render() {
  const items = [...byId.values()].sort((x, y) => new Date(y.openedAt) - new Date(x.openedAt));
  let prev = null;
  for (const i of items) {
    let el = rowEls.get(i.id);
    if (!el) {
      el = makeRow(i);
      rowEls.set(i.id, el);
      list.insertBefore(el, prev ? prev.nextSibling : list.firstChild);
    }
    prev = el;
    el.classList.toggle('selected', selected === i.id);
    const mark = el.querySelector('.mark');
    const want = acked.has(i.id);
    if (want && !mark.firstChild) mark.innerHTML = '<span data-testid="acked" class="acked">acked ✓</span>';
  }
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
