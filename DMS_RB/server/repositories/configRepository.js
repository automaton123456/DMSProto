/**
 * Config Repository — all SQL for config tables.
 */
const db = require('../db/database');

// ── Document Types ────────────────────────────────────────────────────────────

function getDocTypes() {
  return db.prepare('SELECT * FROM config_doc_types WHERE active = 1 ORDER BY code').all();
}

function upsertDocType(code, description) {
  db.prepare(`
    INSERT INTO config_doc_types (code, description, active)
    VALUES (?, ?, 1)
    ON CONFLICT(code) DO UPDATE SET description=excluded.description, active=1
  `).run(code, description);
}

function deleteDocType(code) {
  db.prepare('UPDATE config_doc_types SET active = 0 WHERE code = ?').run(code);
}

// ── Document Groups ───────────────────────────────────────────────────────────

function getDocGroups(docType) {
  if (docType) {
    return db.prepare(
      'SELECT * FROM config_doc_groups WHERE doc_type = ? AND active = 1 ORDER BY code'
    ).all(docType);
  }
  return db.prepare('SELECT * FROM config_doc_groups WHERE active = 1 ORDER BY doc_type, code').all();
}

function upsertDocGroup(docType, code, description, workflowRequired) {
  db.prepare(`
    INSERT INTO config_doc_groups (doc_type, code, description, workflow_required, active)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(code) DO UPDATE SET
      doc_type=excluded.doc_type, description=excluded.description,
      workflow_required=excluded.workflow_required, active=1
  `).run(docType, code, description, workflowRequired ? 1 : 0);
}

function deleteDocGroup(code) {
  db.prepare('UPDATE config_doc_groups SET active = 0 WHERE code = ?').run(code);
}

function isWorkflowRequired(docGroup) {
  const row = db.prepare(
    'SELECT workflow_required FROM config_doc_groups WHERE code = ? AND active = 1'
  ).get(docGroup);
  return row ? row.workflow_required === 1 : false;
}

// ── Field Visibility ─────────────────────────────────────────────────────────

function getFieldVisibility(docGroup) {
  if (docGroup) {
    const rows = db.prepare(
      'SELECT field_name, visibility FROM config_field_visibility WHERE doc_group = ?'
    ).all(docGroup);
    const result = {};
    for (const r of rows) result[r.field_name] = r.visibility;
    return result;
  }
  // All groups as nested object
  const rows = db.prepare('SELECT * FROM config_field_visibility ORDER BY doc_group, field_name').all();
  const result = {};
  for (const r of rows) {
    if (!result[r.doc_group]) result[r.doc_group] = {};
    result[r.doc_group][r.field_name] = r.visibility;
  }
  return result;
}

function upsertFieldVisibility(docGroup, fieldName, visibility) {
  db.prepare(`
    INSERT INTO config_field_visibility (doc_group, field_name, visibility)
    VALUES (?, ?, ?)
    ON CONFLICT(doc_group, field_name) DO UPDATE SET visibility=excluded.visibility
  `).run(docGroup, fieldName, visibility);
}

function replaceFieldVisibilityForGroup(docGroup, fieldMap) {
  db.prepare('DELETE FROM config_field_visibility WHERE doc_group = ?').run(docGroup);
  const insert = db.prepare(
    'INSERT INTO config_field_visibility (doc_group, field_name, visibility) VALUES (?,?,?)'
  );
  for (const [fieldName, visibility] of Object.entries(fieldMap)) {
    insert.run(docGroup, fieldName, visibility);
  }
}

// ── Attachment Naming ─────────────────────────────────────────────────────────

function getAttachmentNaming(docGroup) {
  if (docGroup) {
    const rows = db.prepare(
      'SELECT field_name FROM config_attachment_naming WHERE doc_group = ? ORDER BY field_order'
    ).all(docGroup);
    return rows.map(r => r.field_name);
  }
  // All groups
  const rows = db.prepare('SELECT * FROM config_attachment_naming ORDER BY doc_group, field_order').all();
  const result = {};
  for (const r of rows) {
    if (!result[r.doc_group]) result[r.doc_group] = [];
    result[r.doc_group].push(r.field_name);
  }
  return result;
}

function replaceAttachmentNaming(docGroup, fields) {
  db.prepare('DELETE FROM config_attachment_naming WHERE doc_group = ?').run(docGroup);
  const insert = db.prepare(
    'INSERT INTO config_attachment_naming (doc_group, field_order, field_name) VALUES (?,?,?)'
  );
  fields.forEach((f, i) => insert.run(docGroup, i, f));
}

// ── Work Centers (Departments) ────────────────────────────────────────────────

function getWorkCenters() {
  return db.prepare('SELECT * FROM config_work_centers ORDER BY department_id').all();
}

function upsertWorkCenter(departmentId, departmentName, description) {
  db.prepare(`
    INSERT INTO config_work_centers (department_id, department_name, description, active)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(department_id) DO UPDATE SET
      department_name=excluded.department_name,
      description=excluded.description,
      active=1
  `).run(departmentId, departmentName, description || null);
}

function deleteWorkCenter(departmentId) {
  db.prepare('UPDATE config_work_centers SET active = 0 WHERE department_id = ?').run(departmentId);
}

// ── Email Config ──────────────────────────────────────────────────────────────

function getEmailConfig() {
  const rows = db.prepare('SELECT setting_key, setting_value FROM config_email').all();
  const result = {};
  for (const r of rows) result[r.setting_key] = r.setting_value;
  return result;
}

function setEmailConfig(key, value) {
  db.prepare(`
    INSERT INTO config_email (setting_key, setting_value)
    VALUES (?, ?)
    ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value
  `).run(key, value);
}

// ── Workflow Approvers ────────────────────────────────────────────────────────

function getApproversByDiscipline() {
  return db.prepare(
    'SELECT * FROM workflow_approvers_discipline WHERE active = 1 ORDER BY department_id, approval_type'
  ).all();
}

function getApproversForDept(departmentId, approvalType) {
  let rows = db.prepare(`
    SELECT approver_username FROM workflow_approvers_discipline
    WHERE department_id = ? AND approval_type = ? AND active = 1
  `).all(departmentId, approvalType);

  if (rows.length === 0) {
    // Fall back to 'default'
    rows = db.prepare(`
      SELECT approver_username FROM workflow_approvers_discipline
      WHERE department_id = 'default' AND approval_type = ? AND active = 1
    `).all(approvalType);
  }
  return rows.map(r => r.approver_username);
}

function upsertApproverDiscipline(departmentId, approvalType, approverUsername) {
  db.prepare(`
    INSERT INTO workflow_approvers_discipline (department_id, approval_type, approver_username, active)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(department_id, approval_type, approver_username) DO UPDATE SET active=1
  `).run(departmentId, approvalType, approverUsername);
}

function deleteApproverDiscipline(id) {
  db.prepare('UPDATE workflow_approvers_discipline SET active = 0 WHERE id = ?').run(id);
}

function replaceApproversDisciplineForDept(departmentId, approvalType, approverUsernames) {
  db.prepare(
    'DELETE FROM workflow_approvers_discipline WHERE department_id = ? AND approval_type = ?'
  ).run(departmentId, approvalType);
  const insert = db.prepare(`
    INSERT INTO workflow_approvers_discipline (department_id, approval_type, approver_username, active)
    VALUES (?, ?, ?, 1)
  `);
  for (const u of approverUsernames) {
    insert.run(departmentId, approvalType, u);
  }
}

function getApproversByMaintenance() {
  return db.prepare(
    'SELECT * FROM workflow_approvers_maintenance WHERE active = 1 ORDER BY maintenance_strategy, approval_type'
  ).all();
}

function upsertApproverMaintenance(data) {
  db.prepare(`
    INSERT INTO workflow_approvers_maintenance
      (maintenance_strategy, maintenance_days, approval_type, approver_username, active)
    VALUES (?, ?, ?, ?, 1)
  `).run(data.maintenanceStrategy, data.maintenanceDays || null, data.approvalType, data.approverUsername);
}

function deleteApproverMaintenance(id) {
  db.prepare('UPDATE workflow_approvers_maintenance SET active = 0 WHERE id = ?').run(id);
}

module.exports = {
  getDocTypes,
  upsertDocType,
  deleteDocType,
  getDocGroups,
  upsertDocGroup,
  deleteDocGroup,
  isWorkflowRequired,
  getFieldVisibility,
  upsertFieldVisibility,
  replaceFieldVisibilityForGroup,
  getAttachmentNaming,
  replaceAttachmentNaming,
  getWorkCenters,
  upsertWorkCenter,
  deleteWorkCenter,
  getEmailConfig,
  setEmailConfig,
  getApproversByDiscipline,
  getApproversForDept,
  upsertApproverDiscipline,
  deleteApproverDiscipline,
  replaceApproversDisciplineForDept,
  getApproversByMaintenance,
  upsertApproverMaintenance,
  deleteApproverMaintenance
};
