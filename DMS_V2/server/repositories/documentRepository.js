/**
 * Document Repository — all SQL for dms_header, dms_object_links, dms_attachments.
 * No business logic here; only data access.
 */
const db = require('../db/database');

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSearchText(header, links) {
  const parts = [
    header.document_id, header.rig, header.doc_type, header.doc_group,
    header.status, header.originator, header.doc_date, header.manu_name,
    header.manu_serial, header.alert_num, header.cert_auth, header.cert_num,
    header.add_desc, header.doc_loc,
    ...links.map(l => [
      l.work_order, l.work_order_description, l.em_asset_number,
      l.equipment_text, l.equipment_description
    ].filter(Boolean))
  ];
  return parts.flat().filter(Boolean).join(' ').toLowerCase();
}

/** Convert a DB row + sub-rows back to the API shape the frontend expects. */
function toApiShape(row, links = [], attachments = [], workflowSteps = []) {
  return {
    documentId:          row.document_id,
    rig:                 row.rig,
    docType:             row.doc_type,
    docGroup:            row.doc_group,
    status:              row.status,
    originator:          row.originator,
    originatorUsername:  row.originator_username,
    createdDate:         row.created_date,
    lastModified:        row.last_modified,
    version:             row.version || '1.0',
    classifications: {
      docDate:    row.doc_date,
      manuName:   row.manu_name,
      manuSerial: row.manu_serial,
      alertNum:   row.alert_num,
      certAuth:   row.cert_auth,
      certNum:    row.cert_num,
      addDesc:    row.add_desc,
      docLoc:     row.doc_loc
    },
    objectLinks: links.map(l => ({
      workOrder:             l.work_order,
      workOrderDescription:  l.work_order_description,
      owningDepartmentId:    l.owning_department_id,
      em_asset_number:       l.em_asset_number,
      equipmentText:         l.equipment_text,
      equipmentDescription:  l.equipment_description,
      rig:                   l.rig,
      parent:                l.parent
    })),
    attachments: attachments.map(a => a.filename),
    workflow: buildWorkflowFromSteps(workflowSteps, row.status)
  };
}

function buildWorkflowFromSteps(steps, status) {
  if (!steps || steps.length === 0) {
    return {
      required: false,
      currentStep: status === 'Draft' ? 'draft' : 'completed',
      steps: []
    };
  }
  const pending = steps.find(s => s.status === 'pending');
  let currentStep = 'completed';
  if (status === 'Rejected') currentStep = 'rejected';
  else if (pending) currentStep = pending.step_key;

  return {
    required: true,
    currentStep,
    steps: steps.map(s => ({
      step:             s.step_number,
      name:             s.step_name,
      status:           s.status,
      assignedApprovers: JSON.parse(s.assigned_approvers || '[]'),
      actionedBy:       s.actioned_by,
      actionedByName:   s.actioned_by_name,
      actionDate:       s.action_date,
      rejectionReason:  s.rejection_reason
    }))
  };
}

// ── ID sequence ───────────────────────────────────────────────────────────────

function getNextDocId() {
  // Find highest existing numeric doc ID and increment
  const row = db.prepare(`
    SELECT document_id FROM dms_header
    WHERE document_id GLOB '[0-9]*'
    ORDER BY CAST(document_id AS INTEGER) DESC LIMIT 1
  `).get();
  const next = row ? parseInt(row.document_id, 10) + 1 : 1;
  return String(next).padStart(6, '0');
}

// ── Reads ────────────────────────────────────────────────────────────────────

const stmtLinks      = db.prepare('SELECT * FROM dms_object_links WHERE document_id = ? ORDER BY id');
const stmtAttachments= db.prepare('SELECT * FROM dms_attachments WHERE document_id = ? ORDER BY id');
const stmtSteps      = db.prepare('SELECT * FROM dms_workflow_steps WHERE document_id = ? ORDER BY step_number');

function getLinksFor(docId)       { return stmtLinks.all(docId); }
function getAttachmentsFor(docId) { return stmtAttachments.all(docId); }
function getStepsFor(docId)       { return stmtSteps.all(docId); }

function getById(documentId) {
  const row = db.prepare('SELECT * FROM dms_header WHERE document_id = ?').get(documentId);
  if (!row) return null;
  return toApiShape(row, getLinksFor(documentId), getAttachmentsFor(documentId), getStepsFor(documentId));
}

function getAll() {
  const rows = db.prepare('SELECT * FROM dms_header ORDER BY created_date DESC').all();
  return rows.map(r => toApiShape(r, getLinksFor(r.document_id), getAttachmentsFor(r.document_id), getStepsFor(r.document_id)));
}

function query(filters = {}) {
  let sql = 'SELECT h.* FROM dms_header h';
  const joins = [];
  const wheres = [];
  const params = [];

  // Join object links for work order / equipment filters
  if (filters.workOrder || filters.emAssetNumber) {
    joins.push('LEFT JOIN dms_object_links ol ON ol.document_id = h.document_id');
  }

  if (filters.documentId) {
    wheres.push('h.document_id LIKE ?');
    params.push(`%${filters.documentId}%`);
  }
  if (filters.originator) {
    wheres.push('h.originator_username = ?');
    params.push(filters.originator);
  }
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    wheres.push(`h.status IN (${statuses.map(() => '?').join(',')})`);
    params.push(...statuses);
  }
  if (filters.rig) {
    const rigs = Array.isArray(filters.rig) ? filters.rig : [filters.rig];
    wheres.push(`h.rig IN (${rigs.map(() => '?').join(',')})`);
    params.push(...rigs);
  }
  if (filters.docType) {
    const types = Array.isArray(filters.docType) ? filters.docType : [filters.docType];
    wheres.push(`h.doc_type IN (${types.map(() => '?').join(',')})`);
    params.push(...types);
  }
  if (filters.docGroup) {
    const groups = Array.isArray(filters.docGroup) ? filters.docGroup : [filters.docGroup];
    wheres.push(`h.doc_group IN (${groups.map(() => '?').join(',')})`);
    params.push(...groups);
  }
  if (filters.description) {
    wheres.push('h.add_desc LIKE ?');
    params.push(`%${filters.description}%`);
  }
  if (filters.manuName) {
    wheres.push('h.manu_name LIKE ?');
    params.push(`%${filters.manuName}%`);
  }
  if (filters.certAuth) {
    wheres.push('h.cert_auth LIKE ?');
    params.push(`%${filters.certAuth}%`);
  }
  if (filters.certNum) {
    wheres.push('h.cert_num LIKE ?');
    params.push(`%${filters.certNum}%`);
  }
  if (filters.dateFrom) {
    wheres.push('h.created_date >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    wheres.push('h.created_date <= ?');
    params.push(filters.dateTo);
  }
  if (filters.workOrder) {
    wheres.push('ol.work_order LIKE ?');
    params.push(`%${filters.workOrder}%`);
  }
  if (filters.emAssetNumber) {
    wheres.push('(ol.em_asset_number LIKE ? OR ol.equipment_text LIKE ?)');
    params.push(`%${filters.emAssetNumber}%`, `%${filters.emAssetNumber}%`);
  }
  if (filters.fullText) {
    wheres.push('h.search_text LIKE ?');
    params.push(`%${filters.fullText.toLowerCase()}%`);
  }

  if (joins.length) sql += ' ' + joins.join(' ');
  if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
  sql += ' GROUP BY h.document_id ORDER BY h.created_date DESC';

  const rows = db.prepare(sql).all(...params);
  return rows.map(r => toApiShape(r, getLinksFor(r.document_id), getAttachmentsFor(r.document_id), getStepsFor(r.document_id)));
}

function getInboxForUser(username) {
  // Documents where user is an assigned approver on the currently-pending step
  const rows = db.prepare(`
    SELECT DISTINCT h.*
    FROM dms_header h
    JOIN dms_workflow_steps ws ON ws.document_id = h.document_id
    WHERE ws.status = 'pending'
      AND ws.assigned_approvers LIKE ?
  `).all(`%"${username}"%`);
  return rows.map(r => toApiShape(r, getLinksFor(r.document_id), getAttachmentsFor(r.document_id), getStepsFor(r.document_id)));
}

function getStats() {
  const total = db.prepare('SELECT COUNT(*) as n FROM dms_header').get().n;
  const byStatus = {};
  const rows = db.prepare('SELECT status, COUNT(*) as n FROM dms_header GROUP BY status').all();
  for (const r of rows) byStatus[r.status] = r.n;
  return { total, byStatus };
}

// ── Writes ────────────────────────────────────────────────────────────────────

function upsertHeader(doc) {
  const c = doc.classifications || {};
  const now = new Date().toISOString().split('T')[0];

  // Build links first so we can include them in search text
  const links = (doc.objectLinks || []).map(l => ({
    work_order:             l.workOrder || null,
    work_order_description: l.workOrderDescription || null,
    owning_department_id:   l.owningDepartmentId ? String(l.owningDepartmentId) : null,
    em_asset_number:        l.em_asset_number || l.equipment || null,
    equipment_text:         l.equipmentText || null,
    equipment_description:  l.equipmentDescription || null,
    rig:                    l.rig || null,
    parent:                 l.parent || null
  }));

  const headerForSearch = {
    document_id: doc.documentId, rig: doc.rig, doc_type: doc.docType,
    doc_group: doc.docGroup, status: doc.status, originator: doc.originator,
    doc_date: c.docDate, manu_name: c.manuName, manu_serial: c.manuSerial,
    alert_num: c.alertNum, cert_auth: c.certAuth, cert_num: c.certNum,
    add_desc: c.addDesc, doc_loc: c.docLoc
  };
  const searchText = buildSearchText(headerForSearch, links);

  db.prepare(`
    INSERT INTO dms_header
      (document_id, rig, doc_type, doc_group, status, originator, originator_username,
       created_date, last_modified, version,
       doc_date, manu_name, manu_serial, alert_num, cert_auth, cert_num, add_desc, doc_loc,
       search_text, ocr_text)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(document_id) DO UPDATE SET
      rig=excluded.rig, doc_type=excluded.doc_type, doc_group=excluded.doc_group,
      status=excluded.status, originator=excluded.originator,
      originator_username=excluded.originator_username,
      last_modified=excluded.last_modified, version=excluded.version,
      doc_date=excluded.doc_date, manu_name=excluded.manu_name,
      manu_serial=excluded.manu_serial, alert_num=excluded.alert_num,
      cert_auth=excluded.cert_auth, cert_num=excluded.cert_num,
      add_desc=excluded.add_desc, doc_loc=excluded.doc_loc,
      search_text=excluded.search_text
  `).run(
    doc.documentId, doc.rig, doc.docType, doc.docGroup,
    doc.status, doc.originator, doc.originatorUsername,
    doc.createdDate || now, doc.lastModified || now, doc.version || '1.0',
    c.docDate || null, c.manuName || null, c.manuSerial || null, c.alertNum || null,
    c.certAuth || null, c.certNum || null, c.addDesc || null, c.docLoc || null,
    searchText, null
  );

  // Replace object links
  db.prepare('DELETE FROM dms_object_links WHERE document_id = ?').run(doc.documentId);
  const insertLink = db.prepare(`
    INSERT INTO dms_object_links
      (document_id, work_order, work_order_description, owning_department_id,
       em_asset_number, equipment_text, equipment_description, rig, parent)
    VALUES (?,?,?,?,?,?,?,?,?)
  `);
  for (const l of links) {
    insertLink.run(
      doc.documentId, l.work_order, l.work_order_description, l.owning_department_id,
      l.em_asset_number, l.equipment_text, l.equipment_description, l.rig, l.parent
    );
  }
}

function deleteDocument(documentId) {
  db.prepare('DELETE FROM dms_header WHERE document_id = ?').run(documentId);
}

// ── Workflow Step Writes ──────────────────────────────────────────────────────

function replaceWorkflowSteps(documentId, steps) {
  db.prepare('DELETE FROM dms_workflow_steps WHERE document_id = ?').run(documentId);
  const insert = db.prepare(`
    INSERT INTO dms_workflow_steps
      (document_id, step_number, step_name, step_key, status, assigned_approvers,
       actioned_by, actioned_by_name, action_date, rejection_reason)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `);
  for (const s of steps) {
    insert.run(
      documentId, s.step, s.name, s.step === 1 ? 'msv' : 'em',
      s.status, JSON.stringify(s.assignedApprovers || []),
      s.actionedBy || null, s.actionedByName || null,
      s.actionDate || null, s.rejectionReason || null
    );
  }
}

function updateWorkflowStep(documentId, stepNumber, updates) {
  const fields = Object.entries(updates)
    .map(([k]) => `${k} = ?`)
    .join(', ');
  const values = Object.values(updates);
  db.prepare(`UPDATE dms_workflow_steps SET ${fields} WHERE document_id = ? AND step_number = ?`)
    .run(...values, documentId, stepNumber);
}

function updateDocumentStatus(documentId, status) {
  db.prepare('UPDATE dms_header SET status = ?, last_modified = ? WHERE document_id = ?')
    .run(status, new Date().toISOString().split('T')[0], documentId);
}

// ── Attachments ───────────────────────────────────────────────────────────────

function addAttachment(documentId, attData) {
  db.prepare(`
    INSERT INTO dms_attachments
      (document_id, filename, original_name, file_path, file_size, mime_type, uploaded_by, uploaded_date)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    documentId, attData.filename, attData.originalName || attData.filename,
    attData.filePath || '', attData.fileSize || 0, attData.mimeType || '',
    attData.uploadedBy || '', new Date().toISOString()
  );
}

function removeAttachment(documentId, filename) {
  db.prepare('DELETE FROM dms_attachments WHERE document_id = ? AND filename = ?')
    .run(documentId, filename);
}

module.exports = {
  getNextDocId,
  getById,
  getAll,
  query,
  getInboxForUser,
  getStats,
  upsertHeader,
  deleteDocument,
  replaceWorkflowSteps,
  updateWorkflowStep,
  updateDocumentStatus,
  addAttachment,
  removeAttachment,
  getLinksFor,
  getAttachmentsFor,
  getStepsFor,
  buildWorkflowFromSteps,
  toApiShape
};
