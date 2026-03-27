/**
 * Notification Repository.
 */
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

function getForUser(username) {
  return db.prepare(
    'SELECT * FROM dms_notifications WHERE recipient_username = ? ORDER BY created_at DESC'
  ).all(username).map(toApiShape);
}

function add(notif) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO dms_notifications (id, recipient_username, type, message, document_id, link, read, created_at)
    VALUES (?,?,?,?,?,?,0,?)
  `).run(id, notif.recipientUsername, notif.type, notif.message, notif.documentId, notif.link, now);
  return { ...notif, id, createdAt: now, read: false };
}

function markRead(id) {
  db.prepare('UPDATE dms_notifications SET read = 1 WHERE id = ?').run(id);
  return db.prepare('SELECT * FROM dms_notifications WHERE id = ?').get(id);
}

function markAllReadForUser(username) {
  db.prepare('UPDATE dms_notifications SET read = 1 WHERE recipient_username = ?').run(username);
}

function toApiShape(row) {
  return {
    id:                row.id,
    recipientUsername: row.recipient_username,
    type:              row.type,
    message:           row.message,
    documentId:        row.document_id,
    link:              row.link,
    read:              row.read === 1,
    createdAt:         row.created_at
  };
}

module.exports = { getForUser, add, markRead, markAllReadForUser };
