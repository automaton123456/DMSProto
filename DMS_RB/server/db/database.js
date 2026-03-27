/**
 * SQLite database connection singleton.
 * All DB access goes through this module — swap to a different driver here
 * to migrate to another database engine without touching any other file.
 *
 * Uses Node.js built-in node:sqlite (available from Node 22+).
 * No npm package or native compilation required.
 * API is synchronous and compatible with better-sqlite3 conventions.
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_DIR  = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'dms.db');
const SCHEMA  = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

// Improve concurrency tolerance for multiple short-lived reads/writes.
db.exec('PRAGMA busy_timeout = 5000;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Apply schema (idempotent — uses IF NOT EXISTS everywhere)
const schemaSql = fs.readFileSync(SCHEMA, 'utf8');
try {
  db.exec(schemaSql);
} catch (err) {
  if (err && err.errcode === 5) {
    err.message = `SQLite database is locked while applying schema at startup (${DB_PATH}). ${err.message}`;
  }
  throw err;
}

module.exports = db;
