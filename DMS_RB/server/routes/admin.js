const express   = require('express');
const router    = express.Router();
const svc       = require('../services/documentService');
const userRepo  = require('../repositories/userRepository');
const cfgRepo   = require('../repositories/configRepository');
const wfSvc     = require('../services/workflowService');
const db        = require('../db/database');
const XLSX      = require('xlsx');
const multer    = require('multer');
const upload    = multer({ storage: multer.memoryStorage() });
const APPROVAL_TYPES = new Set(['msv', 'em']);

function normalizeCell(value) {
  return String(value ?? '').trim();
}

function readFirstSheetRows(fileBuffer) {
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function toExcel(res, rows, sheetName, fileName) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buf);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', (req, res) => {
  res.json(svc.getStats());
});

// ── DB Status (table row counts) ──────────────────────────────────────────────

router.get('/db-status', (req, res) => {
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).all().map(r => r.name);
  const result = tables.map(name => {
    const row = db.prepare(`SELECT COUNT(*) as n FROM "${name}"`).get();
    return { table: name, rows: row.n };
  });
  res.json(result);
});

// ── Compat: workflow-approvers (legacy DMS_RB Admin format) ──────────────────

router.get('/workflow-approvers', (req, res) => {
  const rows = cfgRepo.getApproversByDiscipline();
  const msvApprovers = {};
  const emApprovers  = {};
  for (const r of rows) {
    const dept = r.department_id;
    if (r.approval_type === 'msv') {
      if (!msvApprovers[dept]) msvApprovers[dept] = [];
      msvApprovers[dept].push(r.approver_username);
    } else {
      if (!emApprovers[dept]) emApprovers[dept] = [];
      emApprovers[dept].push(r.approver_username);
    }
  }
  res.json({ msvApprovers, emApprovers });
});

router.put('/workflow-approvers', (req, res) => {
  const { msvApprovers = {}, emApprovers = {} } = req.body;
  for (const [dept, users] of Object.entries(msvApprovers)) {
    cfgRepo.replaceApproversDisciplineForDept(dept, 'msv', users);
  }
  for (const [dept, users] of Object.entries(emApprovers)) {
    cfgRepo.replaceApproversDisciplineForDept(dept, 'em', users);
  }
  res.json({ ok: true });
});

// ── Users ─────────────────────────────────────────────────────────────────────

router.get('/users', (req, res) => {
  res.json(userRepo.getAll().map(userRepo.toApiShape));
});

router.post('/users', (req, res) => {
  try {
    userRepo.upsert(req.body);
    res.json(userRepo.toApiShape(userRepo.getByUsername(req.body.username)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/download', (req, res) => {
  const rows = userRepo.getAll().map(userRepo.toApiShape).map(u => ({
    Username: u.username || '',
    'Display Name': u.displayName || '',
    Email: u.email || '',
    Role: u.role || 'user'
  }));
  toExcel(res, rows, 'Users', 'users.xlsx');
});

router.post('/users/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Excel file is required' });
    const rows = readFirstSheetRows(req.file.buffer);
    if (!rows.length) return res.status(400).json({ error: 'Excel file has no data rows' });

    const parsed = rows.map((row, index) => {
      const username = normalizeCell(row['Username'] || row['username']);
      const displayName = normalizeCell(row['Display Name'] || row['display_name']);
      const email = normalizeCell(row['Email'] || row['email']);
      const role = normalizeCell(row['Role'] || row['role'] || 'user').toLowerCase();
      if (!username) throw new Error(`Row ${index + 2}: Username is required`);
      if (!['user', 'admin'].includes(role)) throw new Error(`Row ${index + 2}: Role must be user or admin`);
      return { username, displayName, email, role };
    });

    const seen = new Set();
    parsed.forEach((u, i) => {
      const key = u.username.toLowerCase();
      if (seen.has(key)) throw new Error(`Row ${i + 2}: Duplicate Username "${u.username}" in upload`);
      seen.add(key);
    });

    const replaceUsers = db.transaction((items) => {
      db.prepare('UPDATE users SET active = 0').run();
      const stmt = db.prepare(`
        INSERT INTO users (username, display_name, email, department, role, active, created_date)
        VALUES (?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(username) DO UPDATE SET
          display_name=excluded.display_name,
          email=excluded.email,
          role=excluded.role,
          active=1
      `);
      const now = new Date().toISOString();
      for (const u of items) {
        stmt.run(u.username, u.displayName || null, u.email || null, null, u.role, now);
      }
    });
    replaceUsers(parsed);
    res.json({ imported: parsed.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/users/:username/role', (req, res) => {
  const { role } = req.body;
  const user = userRepo.getByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  userRepo.updateRole(req.params.username, role);
  res.json(userRepo.toApiShape(userRepo.getByUsername(req.params.username)));
});

router.put('/users/:username/active', (req, res) => {
  userRepo.setActive(req.params.username, req.body.active !== false);
  res.json({ success: true });
});

// ── Document Types ────────────────────────────────────────────────────────────

router.get('/config/doc-types', (req, res) => {
  res.json(cfgRepo.getDocTypes());
});

router.post('/config/doc-types', (req, res) => {
  const { code, description } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  cfgRepo.upsertDocType(code, description);
  res.json({ success: true });
});

router.delete('/config/doc-types/:code', (req, res) => {
  cfgRepo.deleteDocType(req.params.code);
  res.json({ success: true });
});

// ── Document Groups ───────────────────────────────────────────────────────────

router.get('/config/doc-groups', (req, res) => {
  res.json(cfgRepo.getDocGroups());
});

router.post('/config/doc-groups', (req, res) => {
  const { docType, code, description, workflowRequired } = req.body;
  if (!code || !docType) return res.status(400).json({ error: 'docType and code required' });
  cfgRepo.upsertDocGroup(docType, code, description, workflowRequired);
  res.json({ success: true });
});

router.delete('/config/doc-groups/:code', (req, res) => {
  cfgRepo.deleteDocGroup(req.params.code);
  res.json({ success: true });
});

// ── Field Visibility ──────────────────────────────────────────────────────────

router.get('/config/field-visibility', (req, res) => {
  res.json(cfgRepo.getFieldVisibility());
});

router.put('/config/field-visibility/:docGroup', (req, res) => {
  cfgRepo.replaceFieldVisibilityForGroup(req.params.docGroup, req.body);
  res.json({ success: true });
});

// ── Attachment Naming ─────────────────────────────────────────────────────────

router.get('/config/attachment-naming', (req, res) => {
  res.json(cfgRepo.getAttachmentNaming());
});

router.put('/config/attachment-naming/:docGroup', (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Array of field names expected' });
  cfgRepo.replaceAttachmentNaming(req.params.docGroup, req.body);
  res.json({ success: true });
});

// ── Work Centers ──────────────────────────────────────────────────────────────

router.get('/config/work-centers', (req, res) => {
  res.json(cfgRepo.getWorkCenters());
});

router.post('/config/work-centers', (req, res) => {
  const { departmentId, departmentName, description } = req.body;
  if (!departmentId) return res.status(400).json({ error: 'departmentId required' });
  cfgRepo.upsertWorkCenter(departmentId, departmentName, description);
  res.json({ success: true });
});

router.delete('/config/work-centers/:id', (req, res) => {
  cfgRepo.deleteWorkCenter(req.params.id);
  res.json({ success: true });
});

// ── Email Config ──────────────────────────────────────────────────────────────

router.get('/config/email', (req, res) => {
  const cfg = cfgRepo.getEmailConfig();
  // Never return password over the wire
  const safe = { ...cfg };
  delete safe.smtp_pass;
  res.json(safe);
});

router.put('/config/email', (req, res) => {
  for (const [k, v] of Object.entries(req.body)) {
    cfgRepo.setEmailConfig(k, v);
  }
  res.json({ success: true });
});

// ── Workflow Approvers (legacy format for backward compat) ────────────────────

router.get('/workflow-approvers', (req, res) => {
  res.json(svc.getApprovers());
});

router.put('/workflow-approvers', (req, res) => {
  const { msvApprovers, emApprovers } = req.body;
  for (const [deptId, users] of Object.entries(msvApprovers || {})) {
    cfgRepo.replaceApproversDisciplineForDept(deptId, 'msv', users);
  }
  for (const [deptId, users] of Object.entries(emApprovers || {})) {
    cfgRepo.replaceApproversDisciplineForDept(deptId, 'em', users);
  }
  // Re-evaluate all pending workflows
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

// ── Approvers by Discipline ───────────────────────────────────────────────────

router.get('/approvers/discipline', (req, res) => {
  res.json(cfgRepo.getApproversByDiscipline());
});

router.post('/approvers/discipline', (req, res) => {
  const { departmentId, approvalType, approverUsername } = req.body;
  if (!departmentId || !approvalType || !approverUsername)
    return res.status(400).json({ error: 'departmentId, approvalType and approverUsername required' });
  cfgRepo.upsertApproverDiscipline(departmentId, approvalType, approverUsername);
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

router.delete('/approvers/discipline/:id', (req, res) => {
  cfgRepo.deleteApproverDiscipline(req.params.id);
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

router.put('/approvers/discipline/:id', (req, res) => {
  const { departmentId, approvalType, approverUsername } = req.body;
  if (!departmentId || !approvalType || !approverUsername)
    return res.status(400).json({ error: 'departmentId, approvalType and approverUsername required' });
  cfgRepo.updateApproverDiscipline(req.params.id, departmentId, approvalType, approverUsername);
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

// Bulk replace for a dept/type combo
router.put('/approvers/discipline/:departmentId/:approvalType', (req, res) => {
  const approvers = Array.isArray(req.body) ? req.body : req.body.approvers || [];
  cfgRepo.replaceApproversDisciplineForDept(req.params.departmentId, req.params.approvalType, approvers);
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

// Excel upload for discipline approvers
router.post('/approvers/discipline/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Excel file is required' });
    const rows = readFirstSheetRows(req.file.buffer);
    if (!rows.length) return res.status(400).json({ error: 'Excel file has no data rows' });

    const parsed = rows.map((row, index) => {
      const deptId = normalizeCell(row['Department ID'] || row['department_id']);
      const appType = normalizeCell(row['Approval Type'] || row['approval_type']).toLowerCase();
      const username = normalizeCell(row['Approver Username'] || row['approver_username']);
      if (!deptId) throw new Error(`Row ${index + 2}: Department ID is required`);
      if (!APPROVAL_TYPES.has(appType)) throw new Error(`Row ${index + 2}: Approval Type must be msv or em`);
      if (!username) throw new Error(`Row ${index + 2}: Approver Username is required`);
      return { deptId, appType, username };
    });

    const dedupe = new Set();
    parsed.forEach((r, i) => {
      const key = `${r.deptId}|${r.appType}|${r.username}`.toLowerCase();
      if (dedupe.has(key)) throw new Error(`Row ${i + 2}: Duplicate approver mapping in upload`);
      dedupe.add(key);
    });

    const replaceDisciplineApprovers = db.transaction((items) => {
      db.prepare('DELETE FROM workflow_approvers_discipline').run();
      const stmt = db.prepare(`
        INSERT INTO workflow_approvers_discipline (department_id, approval_type, approver_username, active)
        VALUES (?, ?, ?, 1)
      `);
      for (const r of items) stmt.run(r.deptId, r.appType, r.username);
    });
    replaceDisciplineApprovers(parsed);
    wfSvc.reEvaluatePendingWorkflows();
    res.json({ imported: parsed.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/approvers/discipline/download', (req, res) => {
  const rows = cfgRepo.getApproversByDiscipline()
    .filter(r => r.active)
    .map(r => ({
      'Department ID': r.department_id || '',
      'Approval Type': r.approval_type || '',
      'Approver Username': r.approver_username || ''
    }));
  toExcel(res, rows, 'DisciplineApprovers', 'approvers-discipline.xlsx');
});

// ── Approvers by Maintenance ──────────────────────────────────────────────────

router.get('/approvers/maintenance', (req, res) => {
  res.json(cfgRepo.getApproversByMaintenance());
});

router.post('/approvers/maintenance', (req, res) => {
  cfgRepo.upsertApproverMaintenance(req.body);
  res.json({ success: true });
});

router.delete('/approvers/maintenance/:id', (req, res) => {
  cfgRepo.deleteApproverMaintenance(req.params.id);
  res.json({ success: true });
});

router.put('/approvers/maintenance/:id', (req, res) => {
  cfgRepo.updateApproverMaintenance(req.params.id, req.body);
  res.json({ success: true });
});

// Excel upload for maintenance approvers
router.post('/approvers/maintenance/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Excel file is required' });
    const rows = readFirstSheetRows(req.file.buffer);
    if (!rows.length) return res.status(400).json({ error: 'Excel file has no data rows' });

    const parsed = rows.map((row, index) => {
      const maintenanceStrategy = normalizeCell(row['Maintenance Strategy'] || row['maintenance_strategy']);
      const rawDays = normalizeCell(row['Maintenance Days'] || row['maintenance_days']);
      const maintenanceDays = rawDays === '' ? null : Number(rawDays);
      const approvalType = normalizeCell(row['Approval Type'] || row['approval_type']).toLowerCase();
      const approverUsername = normalizeCell(row['Approver Username'] || row['approver_username']);

      if (!maintenanceStrategy && maintenanceDays === null) {
        throw new Error(`Row ${index + 2}: Maintenance Strategy or Maintenance Days is required`);
      }
      if (maintenanceDays !== null && (!Number.isInteger(maintenanceDays) || maintenanceDays < 0)) {
        throw new Error(`Row ${index + 2}: Maintenance Days must be a whole number >= 0`);
      }
      if (!APPROVAL_TYPES.has(approvalType)) throw new Error(`Row ${index + 2}: Approval Type must be msv or em`);
      if (!approverUsername) throw new Error(`Row ${index + 2}: Approver Username is required`);
      return { maintenanceStrategy: maintenanceStrategy || null, maintenanceDays, approvalType, approverUsername };
    });

    const dedupe = new Set();
    parsed.forEach((r, i) => {
      const key = `${r.maintenanceStrategy || ''}|${r.maintenanceDays ?? ''}|${r.approvalType}|${r.approverUsername}`.toLowerCase();
      if (dedupe.has(key)) throw new Error(`Row ${i + 2}: Duplicate approver mapping in upload`);
      dedupe.add(key);
    });

    const replaceMaintenanceApprovers = db.transaction((items) => {
      db.prepare('DELETE FROM workflow_approvers_maintenance').run();
      const stmt = db.prepare(`
        INSERT INTO workflow_approvers_maintenance
          (maintenance_strategy, maintenance_days, approval_type, approver_username, active)
        VALUES (?, ?, ?, ?, 1)
      `);
      for (const r of items) {
        stmt.run(r.maintenanceStrategy, r.maintenanceDays, r.approvalType, r.approverUsername);
      }
    });
    replaceMaintenanceApprovers(parsed);
    res.json({ imported: parsed.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/approvers/maintenance/download', (req, res) => {
  const rows = cfgRepo.getApproversByMaintenance()
    .filter(r => r.active)
    .map(r => ({
      'Maintenance Strategy': r.maintenance_strategy || '',
      'Maintenance Days': r.maintenance_days ?? '',
      'Approval Type': r.approval_type || '',
      'Approver Username': r.approver_username || ''
    }));
  toExcel(res, rows, 'MaintenanceApprovers', 'approvers-maintenance.xlsx');
});

// ── Workflow Maintenance ──────────────────────────────────────────────────────

// Browse all workflows with status
router.get('/workflows', (req, res) => {
  const { status } = req.query;
  const filters = {};
  if (status) filters.status = status.split(',');
  const docs = svc.queryDocuments(filters);
  res.json(docs.map(d => ({
    documentId:    d.documentId,
    rig:           d.rig,
    docType:       d.docType,
    docGroup:      d.docGroup,
    status:        d.status,
    version:       d.version,
    originator:    d.originator,
    createdDate:   d.createdDate,
    lastModified:  d.lastModified,
    workflowRequired: d.workflow?.required || false,
    currentStep:   d.workflow?.currentStep || null,
    steps:         d.workflow?.steps || [],
    hasNoApprovers: d.workflow?.steps?.some(s =>
      s.status === 'pending' && (!s.assignedApprovers || s.assignedApprovers.length === 0)
    ) || false
  })));
});

// Restart a specific workflow
router.post('/workflows/:id/restart', async (req, res) => {
  try {
    const doc = svc.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const { currentUser } = req.body;
    await wfSvc.resubmitWorkflow(doc, currentUser || 'ADMIN');
    res.json(svc.getDocumentById(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
