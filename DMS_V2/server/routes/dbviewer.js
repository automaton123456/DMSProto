const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// List all tables
router.get('/tables', (req, res) => {
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all();
  res.json(tables.map(t => t.name));
});

// Get table schema
router.get('/tables/:name/schema', (req, res) => {
  const tableName = req.params.name.replace(/[^a-zA-Z0-9_]/g, '');
  const info = db.prepare(`PRAGMA table_info("${tableName}")`).all();
  res.json(info);
});

// Query table with pagination
router.get('/tables/:name/rows', (req, res) => {
  const tableName = req.params.name.replace(/[^a-zA-Z0-9_]/g, '');
  const limit  = Math.min(parseInt(req.query.limit) || 100, 500);
  const offset = parseInt(req.query.offset) || 0;

  const count = db.prepare(`SELECT COUNT(*) as n FROM "${tableName}"`).get().n;
  const rows  = db.prepare(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`).all(limit, offset);
  res.json({ total: count, limit, offset, rows });
});

// Update a cell value
router.put('/tables/:name/rows/:rowid', (req, res) => {
  const tableName = req.params.name.replace(/[^a-zA-Z0-9_]/g, '');
  const rowid = parseInt(req.params.rowid);
  const { column, value } = req.body;

  if (!column || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
    return res.status(400).json({ error: 'Invalid column name' });
  }

  try {
    const val = value === null || value === '' ? null : value;
    db.prepare(`UPDATE "${tableName}" SET "${column}" = ? WHERE rowid = ?`).run(val, rowid);
    const row = db.prepare(`SELECT * FROM "${tableName}" WHERE rowid = ?`).get(rowid);
    res.json({ ok: true, row });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a row
router.delete('/tables/:name/rows/:rowid', (req, res) => {
  const tableName = req.params.name.replace(/[^a-zA-Z0-9_]/g, '');
  const rowid = parseInt(req.params.rowid);

  try {
    db.prepare(`DELETE FROM "${tableName}" WHERE rowid = ?`).run(rowid);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Insert a new row
router.post('/tables/:name/rows', (req, res) => {
  const tableName = req.params.name.replace(/[^a-zA-Z0-9_]/g, '');
  const { data } = req.body;

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'No data provided' });
  }

  const cols = Object.keys(data).filter(c => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c));
  const vals = cols.map(c => data[c] === '' ? null : data[c]);

  try {
    const placeholders = cols.map(() => '?').join(', ');
    const colNames = cols.map(c => `"${c}"`).join(', ');
    db.prepare(`INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`).run(...vals);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Run a custom read-only SQL query
router.post('/query', (req, res) => {
  const { sql } = req.body;
  if (!sql) return res.status(400).json({ error: 'No SQL provided' });

  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('PRAGMA')) {
    return res.status(403).json({ error: 'Only SELECT and PRAGMA queries are allowed' });
  }

  try {
    const rows = db.prepare(sql).all();
    res.json({ rows, count: rows.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Serve the viewer HTML
router.get('/', (req, res) => {
  res.send(VIEWER_HTML);
});

const VIEWER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DMS Database Viewer</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
  .header { background: #1a1a2e; color: white; padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
  .header h1 { font-size: 18px; font-weight: 600; }
  .container { display: flex; height: calc(100vh - 48px); }
  .sidebar { width: 220px; background: #fff; border-right: 1px solid #ddd; padding: 12px; overflow-y: auto; flex-shrink: 0; }
  .sidebar h3 { font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
  .table-btn { display: block; width: 100%; text-align: left; padding: 8px 10px; border: none; background: none; cursor: pointer; border-radius: 4px; font-size: 13px; }
  .table-btn:hover { background: #e8f0fe; }
  .table-btn.active { background: #1a73e8; color: white; }
  .main { flex: 1; padding: 16px; overflow: auto; display: flex; flex-direction: column; }
  .toolbar { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
  .toolbar button { padding: 6px 14px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer; font-size: 13px; }
  .toolbar button:hover { background: #e8f0fe; }
  .toolbar button.primary { background: #1a73e8; color: white; border-color: #1a73e8; }
  .toolbar button.primary:hover { background: #1557b0; }
  .toolbar button.danger { color: #d32f2f; border-color: #d32f2f; }
  .toolbar button.danger:hover { background: #fdecea; }
  .query-box { margin-bottom: 12px; }
  .query-box textarea { width: 100%; height: 60px; padding: 8px; font-family: monospace; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; }
  .info { font-size: 13px; color: #666; margin-bottom: 8px; }
  .table-wrap { overflow: auto; flex: 1; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; background: white; }
  th { background: #f0f0f0; position: sticky; top: 0; text-align: left; padding: 8px; border-bottom: 2px solid #ddd; white-space: nowrap; z-index: 1; }
  td { padding: 0; border-bottom: 1px solid #eee; max-width: 300px; position: relative; }
  td .cell { padding: 6px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-height: 28px; cursor: pointer; }
  td .cell:hover { background: #e8f0fe; }
  td .cell.null-val { color: #aaa; font-style: italic; }
  td .cell.editing { padding: 0; }
  td input.cell-edit { width: 100%; padding: 6px 8px; border: 2px solid #1a73e8; outline: none; font-size: 13px; font-family: inherit; background: #fff; box-sizing: border-box; }
  tr.selected { background: #e3f2fd !important; }
  tr.selected td .cell { background: transparent; }
  tr:hover td .cell { background: #f8f9fa; }
  tr.selected:hover td .cell { background: transparent; }
  .pagination { margin-top: 10px; display: flex; gap: 8px; align-items: center; font-size: 13px; }
  .pagination button { padding: 4px 12px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer; }
  .pagination button:disabled { opacity: 0.4; cursor: default; }
  .error { color: #d32f2f; background: #fdecea; padding: 10px; border-radius: 4px; margin-bottom: 10px; }
  .success { color: #2e7d32; background: #e8f5e9; padding: 10px; border-radius: 4px; margin-bottom: 10px; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
  .modal { background: white; border-radius: 8px; padding: 24px; min-width: 400px; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
  .modal h2 { font-size: 16px; margin-bottom: 16px; }
  .modal label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; margin-top: 12px; }
  .modal input { width: 100%; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
  .modal .btn-row { margin-top: 20px; display: flex; gap: 8px; justify-content: flex-end; }
</style>
</head>
<body>
<div class="header"><h1>DMS Database Viewer</h1></div>
<div class="container">
  <div class="sidebar">
    <h3>Tables</h3>
    <div id="tableList"></div>
  </div>
  <div class="main">
    <div class="toolbar" id="toolbar" style="display:none">
      <button class="primary" onclick="addRow()">+ Add Row</button>
      <button class="danger" onclick="deleteSelected()" id="btnDelete" style="display:none">Delete Selected</button>
      <span id="editHint" style="font-size:12px;color:#888;">Click any cell to edit. Changes save on Enter or blur.</span>
    </div>
    <div class="query-box">
      <textarea id="sqlInput" placeholder="Enter a SELECT query... (Ctrl+Enter to run)"></textarea>
      <button onclick="runQuery()" style="margin-top:6px;padding:6px 16px;background:#1a73e8;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;">Run Query</button>
    </div>
    <div id="info" class="info"></div>
    <div id="error" class="error" style="display:none"></div>
    <div id="success" class="success" style="display:none"></div>
    <div id="tableContainer" class="table-wrap"></div>
    <div id="pagination" class="pagination"></div>
  </div>
</div>
<div id="modalOverlay" class="modal-overlay" style="display:none"></div>

<script>
const API = '/api/dbviewer';
let currentTable = null;
let currentOffset = 0;
let currentRows = [];
let currentSchema = [];
let selectedRowId = null;
const PAGE_SIZE = 100;

async function loadTables() {
  const tables = await (await fetch(API + '/tables')).json();
  const list = document.getElementById('tableList');
  list.innerHTML = tables.map(t =>
    '<button class="table-btn" onclick="selectTable(\\'' + t + '\\')">' + t + '</button>'
  ).join('');
}

async function selectTable(name) {
  currentTable = name;
  currentOffset = 0;
  selectedRowId = null;
  document.querySelectorAll('.table-btn').forEach(b => b.classList.toggle('active', b.textContent === name));
  document.getElementById('sqlInput').value = 'SELECT * FROM "' + name + '"';
  document.getElementById('toolbar').style.display = 'flex';
  document.getElementById('btnDelete').style.display = 'none';

  // Load schema
  currentSchema = await (await fetch(API + '/tables/' + name + '/schema')).json();
  await loadRows();
}

async function loadRows() {
  clearMessages();
  const res = await fetch(API + '/tables/' + currentTable + '/rows?limit=' + PAGE_SIZE + '&offset=' + currentOffset);
  const data = await res.json();
  currentRows = data.rows;
  document.getElementById('info').textContent = currentTable + ': ' + data.total + ' rows (showing ' + (currentOffset + 1) + '-' + Math.min(currentOffset + PAGE_SIZE, data.total) + ')';
  renderTable(data.rows, true);
  renderPagination(data.total);
}

async function runQuery() {
  const sql = document.getElementById('sqlInput').value.trim();
  if (!sql) return;
  clearMessages();
  try {
    const res = await fetch(API + '/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }) });
    const data = await res.json();
    if (data.error) { showError(data.error); return; }
    document.getElementById('info').textContent = data.count + ' rows returned';
    document.getElementById('toolbar').style.display = 'none';
    renderTable(data.rows, false);
    document.getElementById('pagination').innerHTML = '';
  } catch (e) { showError(e.message); }
}

function renderTable(rows, editable) {
  const c = document.getElementById('tableContainer');
  if (!rows || rows.length === 0) { c.innerHTML = '<p style="color:#888;padding:16px;">No rows</p>'; return; }
  const cols = Object.keys(rows[0]);

  let html = '<table><thead><tr>';
  if (editable) html += '<th style="width:30px;"></th>';
  html += cols.map(col => '<th>' + escHtml(col) + '</th>').join('') + '</tr></thead><tbody>';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowid = row.rowid || row.id || i;
    html += '<tr data-rowid="' + rowid + '" class="' + (selectedRowId === rowid ? 'selected' : '') + '">';
    if (editable) {
      html += '<td><input type="checkbox" onchange="toggleSelect(' + rowid + ', this.checked)" ' + (selectedRowId === rowid ? 'checked' : '') + ' style="margin:6px 8px;cursor:pointer;"></td>';
    }
    for (const col of cols) {
      const val = row[col];
      const isNull = val === null || val === undefined;
      if (editable && col !== 'rowid') {
        html += '<td><div class="cell ' + (isNull ? 'null-val' : '') + '" onclick="startEdit(this, ' + rowid + ', \\'' + escAttr(col) + '\\', ' + (isNull ? 'null' : '\\'' + escAttr(String(val)) + '\\'') + ')">'
          + (isNull ? 'NULL' : escHtml(String(val))) + '</div></td>';
      } else {
        html += '<td><div class="cell ' + (isNull ? 'null-val' : '') + '">' + (isNull ? 'NULL' : escHtml(String(val))) + '</div></td>';
      }
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  c.innerHTML = html;
}

function startEdit(cellDiv, rowid, column, currentValue) {
  if (cellDiv.classList.contains('editing')) return;
  cellDiv.classList.add('editing');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'cell-edit';
  input.value = currentValue === null ? '' : currentValue;
  input.placeholder = 'NULL';
  input.setAttribute('data-original', currentValue === null ? '' : currentValue);

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { saveEdit(cellDiv, rowid, column, input); }
    if (e.key === 'Escape') { cancelEdit(cellDiv, currentValue); }
  });
  input.addEventListener('blur', function() { saveEdit(cellDiv, rowid, column, input); });

  cellDiv.textContent = '';
  cellDiv.appendChild(input);
  input.focus();
  input.select();
}

async function saveEdit(cellDiv, rowid, column, input) {
  const newValue = input.value;
  const original = input.getAttribute('data-original');

  if (newValue === original) { cancelEdit(cellDiv, original === '' ? null : original); return; }

  const sendValue = newValue === '' ? null : newValue;

  try {
    const res = await fetch(API + '/tables/' + currentTable + '/rows/' + rowid, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column, value: sendValue })
    });
    const data = await res.json();
    if (data.error) { showError(data.error); cancelEdit(cellDiv, original === '' ? null : original); return; }

    const isNull = sendValue === null;
    cellDiv.classList.remove('editing');
    cellDiv.classList.toggle('null-val', isNull);
    cellDiv.textContent = isNull ? 'NULL' : newValue;
    showSuccess('Updated ' + column + ' for row ' + rowid);
  } catch (e) {
    showError(e.message);
    cancelEdit(cellDiv, original === '' ? null : original);
  }
}

function cancelEdit(cellDiv, originalValue) {
  cellDiv.classList.remove('editing');
  const isNull = originalValue === null;
  cellDiv.classList.toggle('null-val', isNull);
  cellDiv.textContent = isNull ? 'NULL' : originalValue;
}

function toggleSelect(rowid, checked) {
  selectedRowId = checked ? rowid : null;
  document.querySelectorAll('tr[data-rowid]').forEach(tr => {
    tr.classList.toggle('selected', parseInt(tr.dataset.rowid) === selectedRowId);
    const cb = tr.querySelector('input[type=checkbox]');
    if (cb) cb.checked = parseInt(tr.dataset.rowid) === selectedRowId;
  });
  document.getElementById('btnDelete').style.display = selectedRowId !== null ? 'inline-block' : 'none';
}

async function deleteSelected() {
  if (selectedRowId === null) return;
  if (!confirm('Delete row ' + selectedRowId + ' from ' + currentTable + '?')) return;

  try {
    const res = await fetch(API + '/tables/' + currentTable + '/rows/' + selectedRowId, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) { showError(data.error); return; }
    showSuccess('Row ' + selectedRowId + ' deleted');
    selectedRowId = null;
    document.getElementById('btnDelete').style.display = 'none';
    await loadRows();
  } catch (e) { showError(e.message); }
}

function addRow() {
  if (!currentTable || currentSchema.length === 0) return;

  let html = '<div class="modal"><h2>Add Row to ' + escHtml(currentTable) + '</h2>';
  for (const col of currentSchema) {
    if (col.name === 'id' || col.name === 'rowid') continue; // skip auto-increment
    const required = col.notnull && !col.dflt_value ? ' *' : '';
    const dflt = col.dflt_value ? ' (default: ' + col.dflt_value + ')' : '';
    html += '<label>' + escHtml(col.name) + required + '<span style="font-weight:normal;color:#888">' + escHtml(dflt) + '</span></label>';
    html += '<input name="' + escAttr(col.name) + '" placeholder="' + escAttr(col.type || 'TEXT') + '">';
  }
  html += '<div class="btn-row">';
  html += '<button onclick="closeModal()">Cancel</button>';
  html += '<button class="primary" onclick="submitAddRow()" style="background:#1a73e8;color:white;border-color:#1a73e8;">Insert</button>';
  html += '</div></div>';

  const overlay = document.getElementById('modalOverlay');
  overlay.innerHTML = html;
  overlay.style.display = 'flex';
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
}

async function submitAddRow() {
  const modal = document.querySelector('.modal');
  const inputs = modal.querySelectorAll('input[name]');
  const data = {};
  inputs.forEach(inp => {
    if (inp.value !== '') data[inp.name] = inp.value;
  });

  try {
    const res = await fetch(API + '/tables/' + currentTable + '/rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    const result = await res.json();
    if (result.error) { showError(result.error); return; }
    closeModal();
    showSuccess('Row inserted');
    await loadRows();
  } catch (e) { showError(e.message); }
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

function clearMessages() {
  document.getElementById('error').style.display = 'none';
  document.getElementById('success').style.display = 'none';
}
function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg; el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}
function showSuccess(msg) {
  const el = document.getElementById('success');
  el.textContent = msg; el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}
function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function escAttr(s) { return String(s).replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'").replace(/"/g, '&quot;'); }

document.getElementById('sqlInput').addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') runQuery(); });
loadTables();
</script>
</body>
</html>`;

module.exports = router;
