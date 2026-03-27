/**
 * User Repository — all SQL for the users table.
 */
const db = require('../db/database');

function getAll() {
  return db.prepare('SELECT * FROM users WHERE active = 1 ORDER BY username').all();
}

function getByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function upsert(user) {
  const now = new Date().toISOString();
  const toNull = (value) => (value === undefined || value === '' ? null : value);
  const username = String(user.username || '').trim();
  if (!username) {
    throw new Error('username is required');
  }
  const displayName = toNull(user.displayName ?? user.display_name);
  const email = toNull(user.email);
  const department = toNull(user.department);
  const role = String(user.role || 'user').trim().toLowerCase() || 'user';
  db.prepare(`
    INSERT INTO users (username, display_name, email, department, role, active, created_date)
    VALUES (?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(username) DO UPDATE SET
      display_name=excluded.display_name,
      email=excluded.email,
      department=excluded.department,
      role=excluded.role,
      active=excluded.active
  `).run(username, displayName, email, department, role, now);
}

function updateRole(username, role) {
  db.prepare('UPDATE users SET role = ? WHERE username = ?').run(role, username);
  return getByUsername(username);
}

function setActive(username, active) {
  db.prepare('UPDATE users SET active = ? WHERE username = ?').run(active ? 1 : 0, username);
}

function toApiShape(row) {
  if (!row) return null;
  return {
    username:    row.username,
    displayName: row.display_name || row.username,
    email:       row.email,
    department:  row.department,
    role:        String(row.role || 'user').toLowerCase().trim(),
    active:      row.active === 1
  };
}

module.exports = { getAll, getByUsername, upsert, updateRole, setActive, toApiShape };
