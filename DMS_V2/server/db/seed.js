/**
 * Seed / migrate script.
 * Reads all existing JSON flat files and inserts them into SQLite.
 * Safe to run multiple times — uses INSERT OR IGNORE / INSERT OR REPLACE.
 *
 * Run with:  node server/db/seed.js
 */
const path = require('path');
const fs   = require('fs');
const { v4: uuidv4 } = require('uuid');

const db = require('./database');

const DATA_DIR    = path.join(__dirname, '..', '..', 'data');
const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

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

// ── Users ────────────────────────────────────────────────────────────────────
const usersFile = readJson(path.join(DATA_DIR, 'users.json'));
if (usersFile) {
  const insert = db.prepare(`
    INSERT INTO users (username, display_name, email, department, role, active, created_date)
    VALUES (?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(username) DO UPDATE SET
      display_name = excluded.display_name,
      email        = excluded.email,
      department   = excluded.department,
      role         = excluded.role
  `);
  const now = new Date().toISOString();
  for (const u of usersFile.users) {
    insert.run(u.username, u.displayName, u.email, u.department, u.role || 'user', now);
  }
  console.log(`Seeded ${usersFile.users.length} users`);
}

// ── Document Types ───────────────────────────────────────────────────────────
const docGen = readJson(path.join(DATA_DIR, 'config', 'doc-gen.json'));
if (docGen) {
  const insertType = db.prepare(`
    INSERT OR REPLACE INTO config_doc_types (code, description, active)
    VALUES (?, ?, 1)
  `);
  for (const t of docGen.docTypes) {
    insertType.run(t.code, t.description);
  }
  console.log(`Seeded ${docGen.docTypes.length} doc types`);

  const insertGroup = db.prepare(`
    INSERT OR REPLACE INTO config_doc_groups
      (doc_type, code, description, workflow_required, active)
    VALUES (?, ?, ?, ?, 1)
  `);
  let groupCount = 0;
  for (const [docType, groups] of Object.entries(docGen.docGroups)) {
    for (const g of groups) {
      const wfRequired = docGen.workflowRequired.includes(g.code) ? 1 : 0;
      insertGroup.run(docType, g.code, g.description, wfRequired);
      groupCount++;
    }
  }
  console.log(`Seeded ${groupCount} doc groups`);
}

// ── Field Visibility ─────────────────────────────────────────────────────────
const fieldVis = readJson(path.join(DATA_DIR, 'config', 'field-visibility.json'));
if (fieldVis) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO config_field_visibility (doc_group, field_name, visibility)
    VALUES (?, ?, ?)
  `);
  let count = 0;
  for (const [docGroup, fields] of Object.entries(fieldVis)) {
    for (const [fieldName, vis] of Object.entries(fields)) {
      insert.run(docGroup, fieldName, vis);
      count++;
    }
  }
  console.log(`Seeded ${count} field visibility rules`);
}

// ── Attachment Naming ────────────────────────────────────────────────────────
const attNaming = readJson(path.join(DATA_DIR, 'config', 'attachment-naming.json'));
if (attNaming) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO config_attachment_naming (doc_group, field_order, field_name)
    VALUES (?, ?, ?)
  `);
  let count = 0;
  for (const [docGroup, fields] of Object.entries(attNaming)) {
    fields.forEach((fieldName, idx) => {
      insert.run(docGroup, idx, fieldName);
      count++;
    });
  }
  console.log(`Seeded ${count} attachment naming rules`);
}

// ── Approvers ────────────────────────────────────────────────────────────────
const approvers = readJson(path.join(DATA_DIR, 'config', 'approvers.json'));
if (approvers) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO workflow_approvers_discipline
      (department_id, approval_type, approver_username, active)
    VALUES (?, ?, ?, 1)
  `);
  const insertWc = db.prepare(`
    INSERT OR IGNORE INTO config_work_centers (department_id, department_name, active)
    VALUES (?, ?, 1)
  `);

  let count = 0;
  for (const [deptId, users] of Object.entries(approvers.msvApprovers)) {
    if (deptId !== 'default') {
      insertWc.run(deptId, `Department ${deptId}`);
    }
    for (const u of users) {
      insert.run(deptId, 'msv', u);
      count++;
    }
  }
  for (const [deptId, users] of Object.entries(approvers.emApprovers)) {
    for (const u of users) {
      insert.run(deptId, 'em', u);
      count++;
    }
  }
  console.log(`Seeded ${count} approver discipline rules`);
}

// ── Email Config (stub, disabled) ────────────────────────────────────────────
const emailConfig = [
  ['enabled', 'false'],
  ['smtp_host', ''],
  ['smtp_port', '587'],
  ['smtp_user', ''],
  ['smtp_pass', ''],
  ['from_address', ''],
  ['from_name', 'DMS System']
];
const insertEmail = db.prepare(`
  INSERT OR IGNORE INTO config_email (setting_key, setting_value) VALUES (?, ?)
`);
for (const [k, v] of emailConfig) {
  insertEmail.run(k, v);
}
console.log('Seeded email config (disabled)');

// ── Documents ────────────────────────────────────────────────────────────────
const docsFile = readJson(path.join(STORAGE_DIR, 'documents.json'));
if (docsFile && docsFile.documents && docsFile.documents.length > 0) {
  const insertHeader = db.prepare(`
    INSERT OR IGNORE INTO dms_header
      (document_id, rig, doc_type, doc_group, status, originator, originator_username,
       created_date, last_modified, version,
       doc_date, manu_name, manu_serial, alert_num, cert_auth, cert_num, add_desc, doc_loc,
       search_text, ocr_text)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const insertLink = db.prepare(`
    INSERT OR IGNORE INTO dms_object_links
      (document_id, work_order, work_order_description, owning_department_id,
       em_asset_number, equipment_text, equipment_description, rig, parent)
    VALUES (?,?,?,?,?,?,?,?,?)
  `);
  const insertAttach = db.prepare(`
    INSERT OR IGNORE INTO dms_attachments
      (document_id, filename, original_name, file_path, uploaded_date)
    VALUES (?,?,?,?,?)
  `);
  const insertStep = db.prepare(`
    INSERT OR IGNORE INTO dms_workflow_steps
      (document_id, step_number, step_name, step_key, status, assigned_approvers,
       actioned_by, actioned_by_name, action_date, rejection_reason)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `);
  const insertHistory = db.prepare(`
    INSERT OR IGNORE INTO dms_change_history
      (document_id, version, changed_by, changed_by_name, change_date, change_type, change_summary)
    VALUES (?,?,?,?,?,?,?)
  `);

  let docCount = 0;
  for (const doc of docsFile.documents) {
    const c = doc.classifications || {};
    const links = doc.objectLinks || [];

    const headerRow = {
      document_id:         doc.documentId,
      rig:                 doc.rig,
      doc_type:            doc.docType,
      doc_group:           doc.docGroup,
      status:              doc.status,
      originator:          doc.originator,
      originator_username: doc.originatorUsername,
      created_date:        doc.createdDate,
      last_modified:       doc.lastModified,
      version:             '1.0',
      doc_date:            c.docDate || null,
      manu_name:           c.manuName || null,
      manu_serial:         c.manuSerial || null,
      alert_num:           c.alertNum || null,
      cert_auth:           c.certAuth || null,
      cert_num:            c.certNum || null,
      add_desc:            c.addDesc || null,
      doc_loc:             c.docLoc || null,
      search_text:         '',
      ocr_text:            null
    };

    const linkRows = links.map(l => ({
      document_id:           doc.documentId,
      work_order:            l.workOrder || null,
      work_order_description:l.workOrderDescription || null,
      owning_department_id:  l.owningDepartmentId ? String(l.owningDepartmentId) : null,
      em_asset_number:       l.equipment || l.em_asset_number || null,
      equipment_text:        l.equipmentText || null,
      equipment_description: l.equipmentDescription || null,
      rig:                   l.rig || null,
      parent:                l.parent || null
    }));

    headerRow.search_text = buildSearchText(headerRow, linkRows);

    insertHeader.run(
      headerRow.document_id, headerRow.rig, headerRow.doc_type, headerRow.doc_group,
      headerRow.status, headerRow.originator, headerRow.originator_username,
      headerRow.created_date, headerRow.last_modified, headerRow.version,
      headerRow.doc_date, headerRow.manu_name, headerRow.manu_serial, headerRow.alert_num,
      headerRow.cert_auth, headerRow.cert_num, headerRow.add_desc, headerRow.doc_loc,
      headerRow.search_text, headerRow.ocr_text
    );

    for (const l of linkRows) {
      insertLink.run(
        l.document_id, l.work_order, l.work_order_description, l.owning_department_id,
        l.em_asset_number, l.equipment_text, l.equipment_description, l.rig, l.parent
      );
    }

    // Attachments
    for (const filename of (doc.attachments || [])) {
      const docDir = path.join(STORAGE_DIR, doc.rig, doc.docType, doc.docGroup, doc.documentId);
      insertAttach.run(doc.documentId, filename, filename, path.join(docDir, filename), doc.createdDate);
    }

    // Workflow steps
    if (doc.workflow && doc.workflow.steps) {
      for (const step of doc.workflow.steps) {
        insertStep.run(
          doc.documentId, step.step, step.name,
          step.step === 1 ? 'msv' : 'em',
          step.status,
          JSON.stringify(step.assignedApprovers || []),
          step.actionedBy || null,
          step.actionedByName || null,
          step.actionDate || null,
          step.rejectionReason || null
        );
      }
    }

    // Seed initial create history entry
    insertHistory.run(
      doc.documentId, '1.0', doc.originatorUsername, doc.originator,
      doc.createdDate, 'create', 'Document created'
    );

    docCount++;
  }

  console.log(`Migrated ${docCount} documents`);
} else {
  console.log('No existing documents to migrate');
}

// ── Notifications ────────────────────────────────────────────────────────────
const notifsFile = readJson(path.join(STORAGE_DIR, 'notifications.json'));
if (notifsFile && notifsFile.notifications && notifsFile.notifications.length > 0) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO dms_notifications
      (id, recipient_username, type, message, document_id, link, read, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  for (const n of notifsFile.notifications) {
    insert.run(n.id, n.recipientUsername, n.type, n.message, n.documentId, n.link, n.read ? 1 : 0, n.createdAt);
  }
  console.log(`Migrated ${notifsFile.notifications.length} notifications`);
}

console.log('\nSeed complete.');
