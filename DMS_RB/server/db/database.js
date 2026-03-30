/**
 * SQLite database connection singleton.
 * All DB access goes through this module — swap to a different driver here
 * to migrate to another database engine without touching any other file.
 *
 * Uses better-sqlite3 so the rest of the codebase can keep using the
 * synchronous prepare/get/all/run/transaction API.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR  = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'dms.db');
const SCHEMA  = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Improve concurrent access behavior during fast restarts (e.g. nodemon).
// - WAL allows readers/writers to coexist better.
// - busy_timeout tells SQLite to wait briefly for lock release.
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// Apply schema (idempotent — uses IF NOT EXISTS everywhere)
const schemaSql = fs.readFileSync(SCHEMA, 'utf8');
const MAX_SCHEMA_RETRIES = 5;
for (let attempt = 1; attempt <= MAX_SCHEMA_RETRIES; attempt += 1) {
  try {
    db.exec(schemaSql);
    break;
  } catch (error) {
    const isLocked =
      error &&
      (error.code === 'SQLITE_BUSY' ||
       error.code === 'SQLITE_LOCKED' ||
       error.code === 'ERR_SQLITE_ERROR' ||
       Number(error.errcode || error.errno) === 5);
    const isLastAttempt = attempt === MAX_SCHEMA_RETRIES;

    if (!isLocked || isLastAttempt) throw error;

    // Sleep briefly before retrying on transient lock contention.
    const sleepMs = attempt * 100;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, sleepMs);
  }
}

module.exports = db;
