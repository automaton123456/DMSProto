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

function normalizeCode(value) {
  return normalizeCell(value).toUpperCase();
}

function sameText(a, b) {
  return normalizeCell(a).toLowerCase() === normalizeCell(b).toLowerCase();
}

function parseApproverUsernames(value) {
  const items = Array.isArray(value) ? value : String(value ?? '').split(/[\r\n,;]+/);
  const seen = new Set();
  const usernames = [];

  for (const item of items) {
    const username = normalizeCell(item);
    const key = username.toLowerCase();
    if (!username || seen.has(key)) continue;
    seen.add(key);
    usernames.push(username);
  }

  return usernames;
}

function findActiveUser(username) {
  return userRepo.getAll().find((user) => sameText(user.username, username));
}

function getInvalidApproverUsernames(usernames) {
  return usernames.filter((username) => !findActiveUser(username));
}

function normalizeMaintenancePayload(body) {
  const rawDays = body?.maintenanceDays;
  const maintenanceDays =
    rawDays === '' || rawDays === null || rawDays === undefined ? null : Number(rawDays);

  return {
    maintenanceStrategy: normalizeCell(body?.maintenanceStrategy) || null,
    maintenanceDays,
    approvalType: normalizeCell(body?.approvalType).toLowerCase(),
    approverUsername: normalizeCell(body?.approverUsername),
    approverUsernames: parseApproverUsernames(body?.approverUsernames ?? body?.approverUsername)
  };
}

function maintenanceGroupKey(row) {
  return [
    normalizeCell(row.maintenance_strategy ?? row.maintenanceStrategy).toLowerCase(),
    row.maintenance_days ?? row.maintenanceDays ?? '',
    normalizeCell(row.approval_type ?? row.approvalType).toLowerCase()
  ].join('|');
}

function disciplineGroupKey(row) {
  return [
    normalizeCell(row.department_id ?? row.departmentId).toLowerCase(),
    normalizeCell(row.approval_type ?? row.approvalType).toLowerCase()
  ].join('|');
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
  const invalid = [
    ...getInvalidApproverUsernames(Object.values(msvApprovers).flat()),
    ...getInvalidApproverUsernames(Object.values(emApprovers).flat())
  ];
  if (invalid.length) {
    return res.status(400).json({ error: `Unknown approver username(s): ${invalid.join(', ')}` });
  }
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
    const username = normalizeCell(req.body?.username);
    const email = normalizeCell(req.body?.email);
    if (!username) return res.status(400).json({ error: 'Username is required' });
    if (!email) return res.status(400).json({ error: 'Email is required when adding a user' });
    const existing = userRepo.getAll().find(u => sameText(u.username, username)) || userRepo.getByUsername(username);
    if (existing) return res.status(409).json({ error: `User "${username}" already exists` });
    userRepo.upsert(req.body);
    res.json(userRepo.toApiShape(userRepo.getByUsername(username)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:username', (req, res) => {
  try {
    const existing = userRepo.getByUsername(req.params.username);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    userRepo.upsert({ ...req.body, username: req.params.username });
    res.json(userRepo.toApiShape(userRepo.getByUsername(req.params.username)));
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
  const code = normalizeCode(req.body?.code);
  const description = normalizeCell(req.body?.description);
  if (!code) return res.status(400).json({ error: 'code required' });
  const duplicate = cfgRepo.getDocTypes().find(t => sameText(t.code, code)) || cfgRepo.getDocTypeByCode(code);
  if (duplicate) return res.status(409).json({ error: `Document type "${code}" already exists` });
  cfgRepo.createDocType(code, description || null);
  res.json({ success: true });
});

router.put('/config/doc-types/:code', (req, res) => {
  const currentCode = normalizeCode(req.params.code);
  const nextCode = normalizeCode(req.body?.code || req.params.code);
  const description = normalizeCell(req.body?.description);
  const existing = cfgRepo.getDocTypeByCode(currentCode);
  if (!existing) return res.status(404).json({ error: 'Document type not found' });

  const duplicate = cfgRepo.getDocTypes().find(t => !sameText(t.code, currentCode) && sameText(t.code, nextCode));
  if (duplicate) return res.status(409).json({ error: `Document type "${nextCode}" already exists` });

  cfgRepo.updateDocType(currentCode, nextCode, description || null);
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
  const docType = normalizeCode(req.body?.docType);
  const code = normalizeCode(req.body?.code);
  const description = normalizeCell(req.body?.description);
  const workflowRequired = Boolean(req.body?.workflowRequired);
  if (!code || !docType) return res.status(400).json({ error: 'docType and code required' });
  const duplicate = cfgRepo.getDocGroups().find(g => sameText(g.code, code)) || cfgRepo.getDocGroupByCode(code);
  if (duplicate) return res.status(409).json({ error: `Document group "${code}" already exists` });
  cfgRepo.createDocGroup(docType, code, description || null, workflowRequired);
  res.json({ success: true });
});

router.put('/config/doc-groups/:code', (req, res) => {
  const currentCode = normalizeCode(req.params.code);
  const docType = normalizeCode(req.body?.docType);
  const nextCode = normalizeCode(req.body?.code || req.params.code);
  const description = normalizeCell(req.body?.description);
  const workflowRequired = Boolean(req.body?.workflowRequired);
  if (!nextCode || !docType) return res.status(400).json({ error: 'docType and code required' });

  const existing = cfgRepo.getDocGroupByCode(currentCode);
  if (!existing) return res.status(404).json({ error: 'Document group not found' });

  const duplicate = cfgRepo.getDocGroups().find(g => !sameText(g.code, currentCode) && sameText(g.code, nextCode));
  if (duplicate) return res.status(409).json({ error: `Document group "${nextCode}" already exists` });

  cfgRepo.updateDocGroup(currentCode, docType, nextCode, description || null, workflowRequired);
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
  const departmentId = normalizeCell(req.body?.departmentId);
  const departmentName = normalizeCell(req.body?.departmentName);
  const description = normalizeCell(req.body?.description);
  if (!departmentId) return res.status(400).json({ error: 'departmentId required' });
  const duplicate = cfgRepo.getWorkCenters().find(w => w.active === 1 && sameText(w.department_id, departmentId)) || cfgRepo.getWorkCenterById(departmentId);
  if (duplicate) return res.status(409).json({ error: `Work center "${departmentId}" already exists` });
  cfgRepo.createWorkCenter(departmentId, departmentName || null, description || null);
  res.json({ success: true });
});

router.put('/config/work-centers/:id', (req, res) => {
  const currentDepartmentId = normalizeCell(req.params.id);
  const departmentId = normalizeCell(req.body?.departmentId || req.params.id);
  const departmentName = normalizeCell(req.body?.departmentName);
  const description = normalizeCell(req.body?.description);
  if (!departmentId) return res.status(400).json({ error: 'departmentId required' });

  const existing = cfgRepo.getWorkCenterById(currentDepartmentId);
  if (!existing) return res.status(404).json({ error: 'Work center not found' });

  const duplicate = cfgRepo.getWorkCenters().find(
    w => w.active === 1 && !sameText(w.department_id, currentDepartmentId) && sameText(w.department_id, departmentId)
  );
  if (duplicate) return res.status(409).json({ error: `Work center "${departmentId}" already exists` });

  cfgRepo.updateWorkCenter(currentDepartmentId, departmentId, departmentName || null, description || null);
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

router.post('/approvers/discipline-group', (req, res) => {
  const departmentId = normalizeCell(req.body?.departmentId);
  const approvalType = normalizeCell(req.body?.approvalType).toLowerCase();
  const approverUsernames = parseApproverUsernames(req.body?.approverUsernames ?? req.body?.approverUsername);

  if (!departmentId || !APPROVAL_TYPES.has(approvalType) || approverUsernames.length === 0) {
    return res.status(400).json({ error: 'departmentId, approvalType and at least one approver are required' });
  }
  const invalid = getInvalidApproverUsernames(approverUsernames);
  if (invalid.length) {
    return res.status(400).json({ error: `Unknown approver username(s): ${invalid.join(', ')}` });
  }

  const duplicate = cfgRepo.getApproversByDiscipline()
    .filter(r => r.active)
    .find(r => disciplineGroupKey(r) === disciplineGroupKey({ departmentId, approvalType }));
  if (duplicate) {
    return res.status(409).json({ error: `A rule already exists for ${departmentId} / ${approvalType.toUpperCase()}` });
  }

  cfgRepo.replaceApproversDisciplineForDept(departmentId, approvalType, approverUsernames);
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

router.put('/approvers/discipline-group', (req, res) => {
  const originalDepartmentId = normalizeCell(req.body?.originalDepartmentId);
  const originalApprovalType = normalizeCell(req.body?.originalApprovalType).toLowerCase();
  const departmentId = normalizeCell(req.body?.departmentId);
  const approvalType = normalizeCell(req.body?.approvalType).toLowerCase();
  const approverUsernames = parseApproverUsernames(req.body?.approverUsernames ?? req.body?.approverUsername);

  if (!originalDepartmentId || !APPROVAL_TYPES.has(originalApprovalType)) {
    return res.status(400).json({ error: 'originalDepartmentId and originalApprovalType are required' });
  }
  if (!departmentId || !APPROVAL_TYPES.has(approvalType) || approverUsernames.length === 0) {
    return res.status(400).json({ error: 'departmentId, approvalType and at least one approver are required' });
  }
  const invalid = getInvalidApproverUsernames(approverUsernames);
  if (invalid.length) {
    return res.status(400).json({ error: `Unknown approver username(s): ${invalid.join(', ')}` });
  }

  const activeRows = cfgRepo.getApproversByDiscipline().filter(r => r.active);
  const originalExists = activeRows.some(
    r => disciplineGroupKey(r) === disciplineGroupKey({ departmentId: originalDepartmentId, approvalType: originalApprovalType })
  );
  if (!originalExists) return res.status(404).json({ error: 'Approver rule not found' });

  const duplicate = activeRows.find(r => {
    const currentKey = disciplineGroupKey(r);
    return currentKey !== disciplineGroupKey({ departmentId: originalDepartmentId, approvalType: originalApprovalType }) &&
      currentKey === disciplineGroupKey({ departmentId, approvalType });
  });
  if (duplicate) {
    return res.status(409).json({ error: `A rule already exists for ${departmentId} / ${approvalType.toUpperCase()}` });
  }

  cfgRepo.replaceApproverDisciplineGroup(
    originalDepartmentId,
    originalApprovalType,
    departmentId,
    approvalType,
    approverUsernames
  );
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

router.delete('/approvers/discipline-group', (req, res) => {
  const departmentId = normalizeCell(req.body?.departmentId);
  const approvalType = normalizeCell(req.body?.approvalType).toLowerCase();
  if (!departmentId || !APPROVAL_TYPES.has(approvalType)) {
    return res.status(400).json({ error: 'departmentId and approvalType are required' });
  }

  cfgRepo.deleteApproverDisciplineGroup(departmentId, approvalType);
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

router.post('/approvers/discipline', (req, res) => {
  const { departmentId, approvalType, approverUsername } = req.body;
  if (!departmentId || !approvalType || !approverUsername)
    return res.status(400).json({ error: 'departmentId, approvalType and approverUsername required' });
  if (!findActiveUser(approverUsername)) {
    return res.status(400).json({ error: `Unknown approver username: ${approverUsername}` });
  }
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
  if (!findActiveUser(approverUsername)) {
    return res.status(400).json({ error: `Unknown approver username: ${approverUsername}` });
  }
  cfgRepo.updateApproverDiscipline(req.params.id, departmentId, approvalType, approverUsername);
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

// Bulk replace for a dept/type combo
router.put('/approvers/discipline/:departmentId/:approvalType', (req, res) => {
  const approvers = Array.isArray(req.body) ? req.body : req.body.approvers || [];
  const invalid = getInvalidApproverUsernames(approvers);
  if (invalid.length) {
    return res.status(400).json({ error: `Unknown approver username(s): ${invalid.join(', ')}` });
  }
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
      if (!findActiveUser(r.username)) throw new Error(`Row ${i + 2}: Unknown approver username "${r.username}"`);
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

router.post('/approvers/maintenance-group', (req, res) => {
  const payload = normalizeMaintenancePayload(req.body);
  if (!payload.approvalType || !APPROVAL_TYPES.has(payload.approvalType)) {
    return res.status(400).json({ error: 'approvalType must be msv or em' });
  }
  if (!payload.maintenanceStrategy && payload.maintenanceDays === null) {
    return res.status(400).json({ error: 'maintenanceStrategy or maintenanceDays is required' });
  }
  if (payload.maintenanceDays !== null && (!Number.isInteger(payload.maintenanceDays) || payload.maintenanceDays < 0)) {
    return res.status(400).json({ error: 'maintenanceDays must be a whole number >= 0' });
  }
  if (payload.approverUsernames.length === 0) {
    return res.status(400).json({ error: 'At least one approver is required' });
  }
  const invalid = getInvalidApproverUsernames(payload.approverUsernames);
  if (invalid.length) {
    return res.status(400).json({ error: `Unknown approver username(s): ${invalid.join(', ')}` });
  }

  const duplicate = cfgRepo.getApproversByMaintenance()
    .filter(r => r.active)
    .find(r => maintenanceGroupKey(r) === maintenanceGroupKey(payload));
  if (duplicate) {
    return res.status(409).json({ error: 'A maintenance approver rule already exists for that strategy/days/type combination' });
  }

  cfgRepo.replaceApproverMaintenanceGroup(
    {
      maintenanceStrategy: payload.maintenanceStrategy,
      maintenanceDays: payload.maintenanceDays,
      approvalType: payload.approvalType,
      approverUsernames: []
    },
    payload
  );
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

router.put('/approvers/maintenance-group', (req, res) => {
  const originalPayload = normalizeMaintenancePayload(req.body?.original || {});
  const payload = normalizeMaintenancePayload(req.body);

  if (!originalPayload.approvalType || !APPROVAL_TYPES.has(originalPayload.approvalType)) {
    return res.status(400).json({ error: 'original approvalType must be msv or em' });
  }
  if (!originalPayload.maintenanceStrategy && originalPayload.maintenanceDays === null) {
    return res.status(400).json({ error: 'original maintenanceStrategy or maintenanceDays is required' });
  }
  if (!payload.approvalType || !APPROVAL_TYPES.has(payload.approvalType)) {
    return res.status(400).json({ error: 'approvalType must be msv or em' });
  }
  if (!payload.maintenanceStrategy && payload.maintenanceDays === null) {
    return res.status(400).json({ error: 'maintenanceStrategy or maintenanceDays is required' });
  }
  if (payload.maintenanceDays !== null && (!Number.isInteger(payload.maintenanceDays) || payload.maintenanceDays < 0)) {
    return res.status(400).json({ error: 'maintenanceDays must be a whole number >= 0' });
  }
  if (payload.approverUsernames.length === 0) {
    return res.status(400).json({ error: 'At least one approver is required' });
  }
  const invalid = getInvalidApproverUsernames(payload.approverUsernames);
  if (invalid.length) {
    return res.status(400).json({ error: `Unknown approver username(s): ${invalid.join(', ')}` });
  }

  const activeRows = cfgRepo.getApproversByMaintenance().filter(r => r.active);
  const originalKey = maintenanceGroupKey(originalPayload);
  const originalExists = activeRows.some(r => maintenanceGroupKey(r) === originalKey);
  if (!originalExists) return res.status(404).json({ error: 'Maintenance approver rule not found' });

  const duplicate = activeRows.find(r => maintenanceGroupKey(r) !== originalKey && maintenanceGroupKey(r) === maintenanceGroupKey(payload));
  if (duplicate) {
    return res.status(409).json({ error: 'A maintenance approver rule already exists for that strategy/days/type combination' });
  }

  cfgRepo.replaceApproverMaintenanceGroup(originalPayload, payload);
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

router.delete('/approvers/maintenance-group', (req, res) => {
  const payload = normalizeMaintenancePayload(req.body);
  if (!payload.approvalType || !APPROVAL_TYPES.has(payload.approvalType)) {
    return res.status(400).json({ error: 'approvalType must be msv or em' });
  }
  if (!payload.maintenanceStrategy && payload.maintenanceDays === null) {
    return res.status(400).json({ error: 'maintenanceStrategy or maintenanceDays is required' });
  }

  cfgRepo.deleteApproverMaintenanceGroup(payload);
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

router.post('/approvers/maintenance', (req, res) => {
  const payload = {
    maintenanceStrategy: req.body?.maintenanceStrategy || null,
    maintenanceDays: req.body?.maintenanceDays ?? null,
    approvalType: String(req.body?.approvalType || '').trim().toLowerCase(),
    approverUsername: String(req.body?.approverUsername || '').trim()
  };
  if (!payload.approvalType || !APPROVAL_TYPES.has(payload.approvalType)) {
    return res.status(400).json({ error: 'approvalType must be msv or em' });
  }
  if (!payload.approverUsername) {
    return res.status(400).json({ error: 'approverUsername is required' });
  }
  if (!findActiveUser(payload.approverUsername)) {
    return res.status(400).json({ error: `Unknown approver username: ${payload.approverUsername}` });
  }
  if (payload.maintenanceDays !== null && (!Number.isInteger(payload.maintenanceDays) || payload.maintenanceDays < 0)) {
    return res.status(400).json({ error: 'maintenanceDays must be a whole number >= 0' });
  }
  cfgRepo.upsertApproverMaintenance(payload);
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

router.delete('/approvers/maintenance/:id', (req, res) => {
  cfgRepo.deleteApproverMaintenance(req.params.id);
  wfSvc.reEvaluatePendingWorkflows();
  res.json({ success: true });
});

router.put('/approvers/maintenance/:id', (req, res) => {
  const payload = {
    maintenanceStrategy: req.body?.maintenanceStrategy || null,
    maintenanceDays: req.body?.maintenanceDays ?? null,
    approvalType: String(req.body?.approvalType || '').trim().toLowerCase(),
    approverUsername: String(req.body?.approverUsername || '').trim()
  };
  if (!payload.approvalType || !APPROVAL_TYPES.has(payload.approvalType)) {
    return res.status(400).json({ error: 'approvalType must be msv or em' });
  }
  if (!payload.approverUsername) {
    return res.status(400).json({ error: 'approverUsername is required' });
  }
  if (!findActiveUser(payload.approverUsername)) {
    return res.status(400).json({ error: `Unknown approver username: ${payload.approverUsername}` });
  }
  if (payload.maintenanceDays !== null && (!Number.isInteger(payload.maintenanceDays) || payload.maintenanceDays < 0)) {
    return res.status(400).json({ error: 'maintenanceDays must be a whole number >= 0' });
  }
  cfgRepo.updateApproverMaintenance(req.params.id, payload);
  wfSvc.reEvaluatePendingWorkflows();
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
      if (!findActiveUser(r.approverUsername)) throw new Error(`Row ${i + 2}: Unknown approver username "${r.approverUsername}"`);
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
