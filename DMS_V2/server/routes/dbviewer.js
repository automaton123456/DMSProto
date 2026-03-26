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
  const info = db.prepare(`PRAGMA table_info("${req.params.name.replace(/"/g, '')}")`).all();
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
  res.send(`<!DOCTYPE html>
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
  .sidebar { width: 220px; background: #fff; border-right: 1px solid #ddd; padding: 12px; overflow-y: auto; }
  .sidebar h3 { font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
  .table-btn { display: block; width: 100%; text-align: left; padding: 8px 10px; border: none; background: none; cursor: pointer; border-radius: 4px; font-size: 13px; }
  .table-btn:hover { background: #e8f0fe; }
  .table-btn.active { background: #1a73e8; color: white; }
  .main { flex: 1; padding: 16px; overflow: auto; }
  .query-box { margin-bottom: 16px; }
  .query-box textarea { width: 100%; height: 60px; padding: 8px; font-family: monospace; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; }
  .query-box button { margin-top: 6px; padding: 6px 16px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
  .query-box button:hover { background: #1557b0; }
  .info { font-size: 13px; color: #666; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; background: white; }
  th { background: #f0f0f0; position: sticky; top: 0; text-align: left; padding: 8px; border-bottom: 2px solid #ddd; white-space: nowrap; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  tr:hover td { background: #f8f9fa; }
  .pagination { margin-top: 10px; display: flex; gap: 8px; align-items: center; font-size: 13px; }
  .pagination button { padding: 4px 12px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer; }
  .pagination button:disabled { opacity: 0.4; cursor: default; }
  .error { color: #d32f2f; background: #fdecea; padding: 10px; border-radius: 4px; margin-bottom: 10px; }
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
    <div class="query-box">
      <textarea id="sqlInput" placeholder="Enter a SELECT query..."></textarea>
      <button onclick="runQuery()">Run Query</button>
    </div>
    <div id="info" class="info"></div>
    <div id="error" class="error" style="display:none"></div>
    <div id="tableContainer" style="overflow:auto"></div>
    <div id="pagination" class="pagination"></div>
  </div>
</div>
<script>
const API = '/api/dbviewer';
let currentTable = null;
let currentOffset = 0;
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
  document.querySelectorAll('.table-btn').forEach(b => b.classList.toggle('active', b.textContent === name));
  document.getElementById('sqlInput').value = 'SELECT * FROM "' + name + '" LIMIT 100';
  await loadRows();
}

async function loadRows() {
  const res = await fetch(API + '/tables/' + currentTable + '/rows?limit=' + PAGE_SIZE + '&offset=' + currentOffset);
  const data = await res.json();
  document.getElementById('error').style.display = 'none';
  document.getElementById('info').textContent = currentTable + ': ' + data.total + ' rows (showing ' + (currentOffset + 1) + '-' + Math.min(currentOffset + PAGE_SIZE, data.total) + ')';
  renderTable(data.rows);
  renderPagination(data.total);
}

async function runQuery() {
  const sql = document.getElementById('sqlInput').value.trim();
  if (!sql) return;
  document.getElementById('error').style.display = 'none';
  try {
    const res = await fetch(API + '/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }) });
    const data = await res.json();
    if (data.error) { document.getElementById('error').textContent = data.error; document.getElementById('error').style.display = 'block'; return; }
    document.getElementById('info').textContent = data.count + ' rows returned';
    renderTable(data.rows);
    document.getElementById('pagination').innerHTML = '';
  } catch (e) { document.getElementById('error').textContent = e.message; document.getElementById('error').style.display = 'block'; }
}

function renderTable(rows) {
  const c = document.getElementById('tableContainer');
  if (!rows || rows.length === 0) { c.innerHTML = '<p style="color:#888">No rows</p>'; return; }
  const cols = Object.keys(rows[0]);
  let html = '<table><thead><tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>';
  for (const row of rows) {
    html += '<tr>' + cols.map(c => '<td title="' + String(row[c] ?? '').replace(/"/g, '&quot;') + '">' + (row[c] ?? '<em style=color:#aaa>NULL</em>') + '</td>').join('') + '</tr>';
  }
  html += '</tbody></table>';
  c.innerHTML = html;
}

function renderPagination(total) {
  const p = document.getElementById('pagination');
  if (total <= PAGE_SIZE) { p.innerHTML = ''; return; }
  p.innerHTML = '<button ' + (currentOffset === 0 ? 'disabled' : '') + ' onclick="currentOffset-=' + PAGE_SIZE + ';loadRows()">Prev</button>'
    + '<span>Page ' + (Math.floor(currentOffset / PAGE_SIZE) + 1) + ' of ' + Math.ceil(total / PAGE_SIZE) + '</span>'
    + '<button ' + (currentOffset + PAGE_SIZE >= total ? 'disabled' : '') + ' onclick="currentOffset+=' + PAGE_SIZE + ';loadRows()">Next</button>';
}

document.getElementById('sqlInput').addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') runQuery(); });
loadTables();
</script>
</body>
</html>`);
});

module.exports = router;
