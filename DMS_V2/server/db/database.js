/**
 * SQLite database connection singleton.
 * All DB access goes through this module — swap to a different driver here
 * to migrate to another database engine without touching any other file.
 *
 * Uses node-sqlite3-wasm (pure WASM, no native compilation required).
 * API is identical to better-sqlite3.
 */
const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');

const DB_DIR  = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'dms.db');
const SCHEMA  = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Apply schema (idempotent — uses IF NOT EXISTS everywhere)
const schemaSql = fs.readFileSync(SCHEMA, 'utf8');
db.exec(schemaSql);

module.exports = db;
