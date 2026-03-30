/**
 * Config Repository — all SQL for config tables.
 */
const db = require('../db/database');

// ── Document Types ────────────────────────────────────────────────────────────

function getDocTypes() {
  return db.prepare('SELECT * FROM config_doc_types WHERE active = 1 ORDER BY code').all();
}

function getDocTypeByCode(code) {
  return db.prepare('SELECT * FROM config_doc_types WHERE code = ?').get(code);
}

function createDocType(code, description) {
  db.prepare(`
    INSERT INTO config_doc_types (code, description, active)
    VALUES (?, ?, 1)
  `).run(code, description);
}

function updateDocType(currentCode, nextCode, description) {
  db.prepare(`
    UPDATE config_doc_types
    SET code = ?, description = ?, active = 1
    WHERE code = ?
  `).run(nextCode, description, currentCode);
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

function getDocGroupByCode(code) {
  return db.prepare('SELECT * FROM config_doc_groups WHERE code = ?').get(code);
}

function createDocGroup(docType, code, description, workflowRequired) {
  db.prepare(`
    INSERT INTO config_doc_groups (doc_type, code, description, workflow_required, active)
    VALUES (?, ?, ?, ?, 1)
  `).run(docType, code, description, workflowRequired ? 1 : 0);
}

function updateDocGroup(currentCode, docType, nextCode, description, workflowRequired) {
  db.prepare(`
    UPDATE config_doc_groups
    SET doc_type = ?, code = ?, description = ?, workflow_required = ?, active = 1
    WHERE code = ?
  `).run(docType, nextCode, description, workflowRequired ? 1 : 0, currentCode);
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

function getWorkCenterById(departmentId) {
  return db.prepare('SELECT * FROM config_work_centers WHERE department_id = ?').get(departmentId);
}

function createWorkCenter(departmentId, departmentName, description) {
  db.prepare(`
    INSERT INTO config_work_centers (department_id, department_name, description, active)
    VALUES (?, ?, ?, 1)
  `).run(departmentId, departmentName, description || null);
}

function updateWorkCenter(currentDepartmentId, departmentId, departmentName, description) {
  db.prepare(`
    UPDATE config_work_centers
    SET department_id = ?, department_name = ?, description = ?, active = 1
    WHERE department_id = ?
  `).run(departmentId, departmentName, description || null, currentDepartmentId);
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

function updateApproverDiscipline(id, departmentId, approvalType, approverUsername) {
  db.prepare(`
    UPDATE workflow_approvers_discipline
    SET department_id = ?, approval_type = ?, approver_username = ?, active = 1
    WHERE id = ?
  `).run(departmentId, approvalType, approverUsername, id);
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

function deleteApproverDisciplineGroup(departmentId, approvalType) {
  db.prepare(
    'DELETE FROM workflow_approvers_discipline WHERE department_id = ? AND approval_type = ?'
  ).run(departmentId, approvalType);
}

function replaceApproverDisciplineGroup(originalDepartmentId, originalApprovalType, departmentId, approvalType, approverUsernames) {
  const run = db.transaction(() => {
    if (originalDepartmentId !== departmentId || originalApprovalType !== approvalType) {
      deleteApproverDisciplineGroup(originalDepartmentId, originalApprovalType);
    }
    replaceApproversDisciplineForDept(departmentId, approvalType, approverUsernames);
  });
  run();
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

function updateApproverMaintenance(id, data) {
  db.prepare(`
    UPDATE workflow_approvers_maintenance
    SET maintenance_strategy = ?, maintenance_days = ?, approval_type = ?, approver_username = ?, active = 1
    WHERE id = ?
  `).run(data.maintenanceStrategy || null, data.maintenanceDays || null, data.approvalType, data.approverUsername, id);
}

function deleteApproverMaintenanceGroup(data) {
  db.prepare(`
    DELETE FROM workflow_approvers_maintenance
    WHERE COALESCE(maintenance_strategy, '') = ?
      AND COALESCE(maintenance_days, '') = ?
      AND approval_type = ?
  `).run(data.maintenanceStrategy || '', data.maintenanceDays ?? '', data.approvalType);
}

function replaceApproverMaintenanceGroup(originalData, nextData) {
  const run = db.transaction(() => {
    const originalKeyChanged =
      (originalData.maintenanceStrategy || '') !== (nextData.maintenanceStrategy || '') ||
      (originalData.maintenanceDays ?? '') !== (nextData.maintenanceDays ?? '') ||
      originalData.approvalType !== nextData.approvalType;

    if (originalKeyChanged) {
      deleteApproverMaintenanceGroup(originalData);
    }

    deleteApproverMaintenanceGroup(nextData);

    const insert = db.prepare(`
      INSERT INTO workflow_approvers_maintenance
        (maintenance_strategy, maintenance_days, approval_type, approver_username, active)
      VALUES (?, ?, ?, ?, 1)
    `);

    for (const username of nextData.approverUsernames) {
      insert.run(
        nextData.maintenanceStrategy || null,
        nextData.maintenanceDays ?? null,
        nextData.approvalType,
        username
      );
    }
  });
  run();
}

module.exports = {
  getDocTypes,
  getDocTypeByCode,
  createDocType,
  updateDocType,
  deleteDocType,
  getDocGroups,
  getDocGroupByCode,
  createDocGroup,
  updateDocGroup,
  deleteDocGroup,
  isWorkflowRequired,
  getFieldVisibility,
  upsertFieldVisibility,
  replaceFieldVisibilityForGroup,
  getAttachmentNaming,
  replaceAttachmentNaming,
  getWorkCenters,
  getWorkCenterById,
  createWorkCenter,
  updateWorkCenter,
  deleteWorkCenter,
  getEmailConfig,
  setEmailConfig,
  getApproversByDiscipline,
  getApproversForDept,
  upsertApproverDiscipline,
  deleteApproverDiscipline,
  updateApproverDiscipline,
  replaceApproversDisciplineForDept,
  deleteApproverDisciplineGroup,
  replaceApproverDisciplineGroup,
  getApproversByMaintenance,
  upsertApproverMaintenance,
  deleteApproverMaintenance,
  updateApproverMaintenance,
  deleteApproverMaintenanceGroup,
  replaceApproverMaintenanceGroup
};
