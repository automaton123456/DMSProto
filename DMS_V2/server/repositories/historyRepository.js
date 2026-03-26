/**
 * Change History Repository.
 */
const db = require('../db/database');

function getForDocument(documentId) {
  return db.prepare(
    'SELECT * FROM dms_change_history WHERE document_id = ? ORDER BY id DESC'
  ).all(documentId).map(toApiShape);
}

function add(entry) {
  db.prepare(`
    INSERT INTO dms_change_history
      (document_id, version, changed_by, changed_by_name, change_date, change_type, change_summary, previous_data)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    entry.documentId, entry.version, entry.changedBy, entry.changedByName,
    entry.changeDate || new Date().toISOString(),
    entry.changeType, entry.changeSummary,
    entry.previousData ? JSON.stringify(entry.previousData) : null
  );
}

function toApiShape(row) {
  return {
    id:           row.id,
    documentId:   row.document_id,
    version:      row.version,
    changedBy:    row.changed_by,
    changedByName:row.changed_by_name,
    changeDate:   row.change_date,
    changeType:   row.change_type,
    changeSummary:row.change_summary,
    previousData: row.previous_data ? JSON.parse(row.previous_data) : null
  };
}

module.exports = { getForDocument, add };
