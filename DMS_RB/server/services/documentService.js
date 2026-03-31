/**
 * Document Service — business logic layer for documents.
 * Delegates all DB access to repositories.
 * Routes call this; never the repositories directly.
 */
const docRepo    = require('../repositories/documentRepository');
const configRepo = require('../repositories/configRepository');
const userRepo   = require('../repositories/userRepository');
const notifRepo  = require('../repositories/notificationRepository');
const histRepo   = require('../repositories/historyRepository');
const wfSvc      = require('./workflowService');
const path       = require('path');

const HISTORY_FIELD_LABELS = {
  rig: 'Rig',
  docType: 'Document Type',
  docGroup: 'Document Group',
  docDate: 'Document Date',
  manuName: 'Manufacturer Name',
  manuSerial: 'Manufacturer Serial No',
  alertNum: 'Alert Number',
  certAuth: 'Certifying Authority',
  certNum: 'Certificate Number',
  addDesc: 'Additional Description',
  docLoc: 'Document Location',
  objectLinks: 'Object Links'
};

// ── Config helpers ────────────────────────────────────────────────────────────

function getRigs() {
  const fs   = require('fs');
  const fPath = path.join(__dirname, '..', '..', 'data', 'rigs.json');
  if (!fs.existsSync(fPath)) return [];
  return JSON.parse(fs.readFileSync(fPath, 'utf8'));
}

function getWorkOrders(search = '', rig = '') {
  const fs   = require('fs');
  const fPath = path.join(__dirname, '..', '..', 'data', 'workorders.json');
  if (!fs.existsSync(fPath)) return [];
  let wos = JSON.parse(fs.readFileSync(fPath, 'utf8'));
  if (rig) wos = wos.filter(w => w.Site && w.Site.toLowerCase().includes(rig.toLowerCase()));
  if (search) {
    const s = search.toLowerCase();
    wos = wos.filter(w =>
      (w.WipEntityName && w.WipEntityName.toLowerCase().includes(s)) ||
      (w.Description   && w.Description.toLowerCase().includes(s))
    );
  }
  return wos.slice(0, 50);
}

function getEquipment(search = '', rig = '') {
  const fs   = require('fs');
  const fPath = path.join(__dirname, '..', '..', 'data', 'equipment.json');
  if (!fs.existsSync(fPath)) return [];
  let eq = JSON.parse(fs.readFileSync(fPath, 'utf8'));
  if (rig) eq = eq.filter(e => e.rig === rig);
  if (search) {
    const s = search.toLowerCase();
    eq = eq.filter(e =>
      (e.assetNumber  && e.assetNumber.toLowerCase().includes(s)) ||
      (e.description  && e.description.toLowerCase().includes(s))
    );
  }
  return eq.slice(0, 50);
}

function getDocGenConfig() {
  const types  = configRepo.getDocTypes();
  const groups = configRepo.getDocGroups();
  const docGroups = {};
  for (const g of groups) {
    if (!docGroups[g.doc_type]) docGroups[g.doc_type] = [];
    docGroups[g.doc_type].push({ code: g.code, description: g.description });
  }
  const workflowRequired = groups.filter(g => g.workflow_required).map(g => g.code);
  return {
    docTypes: types.map(t => ({ code: t.code, description: t.description })),
    docGroups,
    workflowRequired
  };
}

function getUser(username) {
  return userRepo.toApiShape(userRepo.getByUsername(username));
}

function getUserRole(username) {
  return getUser(username)?.role || 'user';
}

function isAdminOrEditor(role) {
  return role === 'admin' || role === 'editor';
}

function canEditCompletedDocument(doc, currentUser) {
  if (!doc || !currentUser) return false;
  return doc.status === 'Approved' && isAdminOrEditor(getUserRole(currentUser));
}

function canEditDocument(doc, currentUser) {
  if (!doc || !currentUser) return false;

  const role = getUserRole(currentUser);
  if (role === 'admin') return true;
  if (role === 'editor') return doc.status === 'Approved';

  return doc.originatorUsername === currentUser && ['Draft', 'Rejected'].includes(doc.status);
}

function normalizeValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.trim();
  return value;
}

function summarizeObjectLinks(links = []) {
  return (links || [])
    .map((link) => {
      const parts = [
        link.workOrder || '',
        link.workOrderText || link.workOrderDescription || '',
        link.equipment || link.em_asset_number || '',
        link.equipmentText || '',
        link.equipmentDescription || '',
        link.owningDepartmentId || link.owning_department_id || ''
      ].map((part) => String(part || '').trim()).filter(Boolean);
      return parts.join(' / ');
    })
    .filter(Boolean);
}

function normalizeObjectLinksForComparison(links = []) {
  return (links || [])
    .map((link) => ({
      workOrder: String(link.workOrder || '').trim(),
      workOrderText: String(link.workOrderText || link.workOrderDescription || '').trim(),
      equipment: String(link.equipment || link.em_asset_number || '').trim(),
      equipmentText: String(link.equipmentText || '').trim(),
      equipmentDescription: String(link.equipmentDescription || '').trim(),
      owningDepartmentId: String(link.owningDepartmentId || link.owning_department_id || '').trim()
    }))
    .filter((link) => Object.values(link).some(Boolean))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function describeValue(key, value) {
  if (key === 'objectLinks') {
    const summary = summarizeObjectLinks(Array.isArray(value) ? value : []);
    return summary.length ? summary.join(' | ') : 'blank';
  }
  const normalized = normalizeValue(value);
  return normalized === '' ? 'blank' : String(normalized);
}

function buildDocumentChanges(existing, nextDoc) {
  const changes = [];

  const compareField = (key, beforeValue, afterValue) => {
    const beforeNormalized = normalizeValue(beforeValue);
    const afterNormalized = normalizeValue(afterValue);
    if (beforeNormalized === afterNormalized) return;
    changes.push({
      field: key,
      label: HISTORY_FIELD_LABELS[key] || key,
      before: describeValue(key, beforeValue),
      after: describeValue(key, afterValue)
    });
  };

  compareField('rig', existing.rig, nextDoc.rig);
  compareField('docType', existing.docType, nextDoc.docType);
  compareField('docGroup', existing.docGroup, nextDoc.docGroup);

  const classificationKeys = ['docDate', 'manuName', 'manuSerial', 'alertNum', 'certAuth', 'certNum', 'addDesc', 'docLoc'];
  for (const key of classificationKeys) {
    compareField(key, existing.classifications?.[key], nextDoc.classifications?.[key]);
  }

  const previousLinks = normalizeObjectLinksForComparison(existing.objectLinks);
  const nextLinks = normalizeObjectLinksForComparison(nextDoc.objectLinks);
  if (JSON.stringify(previousLinks) !== JSON.stringify(nextLinks)) {
    changes.push({
      field: 'objectLinks',
      label: HISTORY_FIELD_LABELS.objectLinks,
      before: describeValue('objectLinks', existing.objectLinks),
      after: describeValue('objectLinks', nextDoc.objectLinks)
    });
  }

  return changes;
}

// ── Document CRUD ─────────────────────────────────────────────────────────────

function getNextDocId() { return docRepo.getNextDocId(); }

function getDocumentById(id) { return docRepo.getById(id); }

function queryDocuments(filters) { return docRepo.query(filters); }

function getAllDocuments() {
  const docs = docRepo.getAll();
  return { documents: docs, nextId: null };
}

function createDocument(docData, currentUser, action) {
  const user  = getUser(currentUser);
  const docId = getNextDocId();
  const now   = new Date().toISOString().split('T')[0];

  const doc = {
    documentId:         docId,
    rig:                docData.rig,
    docType:            docData.docType,
    docGroup:           docData.docGroup,
    status:             'Draft',
    originator:         user ? user.displayName : currentUser,
    originatorUsername: currentUser,
    createdDate:        now,
    lastModified:       now,
    version:            '1.0',
    classifications:    docData.classifications || {},
    objectLinks:        docData.objectLinks || [],
    attachments:        [],
    workflow:           null
  };

  if (action === 'submit') {
    const wfRequired = wfSvc.requiresWorkflow(doc.docGroup);
    if (wfRequired) {
      const workflow = wfSvc.initWorkflow(doc);
      doc.status   = 'Pending Discipline Approval';
      doc.workflow = workflow;
      docRepo.upsertHeader(doc);
      docRepo.replaceWorkflowSteps(docId, workflow.steps);
      // Notify first approvers
      workflow.steps[0].assignedApprovers.forEach(approver => {
        notifRepo.add({
          recipientUsername: approver, type: 'approval_required',
          message: `Document ${docId} requires your Discipline approval`,
          documentId: docId, link: `/documents/${docId}/approve`
        });
      });
    } else {
      doc.status   = 'Approved';
      doc.workflow = { required: false, currentStep: 'completed', steps: [] };
      docRepo.upsertHeader(doc);
    }
  } else {
    doc.workflow = { required: false, currentStep: 'draft', steps: [] };
    docRepo.upsertHeader(doc);
  }

  histRepo.add({
    documentId: docId, version: '1.0',
    changedBy: currentUser, changedByName: doc.originator,
    changeDate: new Date().toISOString(), changeType: 'create',
    changeSummary: `Document created by ${doc.originator}`
  });

  return docRepo.getById(docId);
}

function incrementVersion(currentVersion) {
  const parts = (currentVersion || '1.0').split('.');
  const major = parseInt(parts[0]) || 1;
  const minor = parseInt(parts[1] || '0') + 1;
  return `${major}.${minor}`;
}

function updateDocument(id, docData, currentUser, action) {
  const existing = docRepo.getById(id);
  if (!existing) return null;

  const user     = getUser(currentUser);
  const userName = user ? user.displayName : currentUser;
  const now      = new Date().toISOString().split('T')[0];
  const newVersion = incrementVersion(existing.version);

  // Save snapshot before change
  const snapshot = {
    classifications: existing.classifications,
    objectLinks: existing.objectLinks,
    status: existing.status
  };

  const doc = {
    ...existing,
    rig:            docData.rig            || existing.rig,
    docType:        docData.docType        || existing.docType,
    docGroup:       docData.docGroup       || existing.docGroup,
    classifications:docData.classifications || existing.classifications,
    objectLinks:    docData.objectLinks !== undefined ? docData.objectLinks : existing.objectLinks,
    lastModified:   now,
    version:        newVersion
  };

  const changes = buildDocumentChanges(existing, doc);

  if (action === 'submit' || action === 'resubmit') {
    const wfRequired = wfSvc.requiresWorkflow(doc.docGroup);
    if (wfRequired) {
      if (action === 'resubmit') {
        docRepo.upsertHeader(doc);
        wfSvc.resubmitWorkflow(doc, currentUser);
      } else {
        const workflow  = wfSvc.initWorkflow(doc);
        doc.status   = 'Pending Discipline Approval';
        doc.workflow = workflow;
        docRepo.upsertHeader(doc);
        docRepo.replaceWorkflowSteps(id, workflow.steps);
        workflow.steps[0].assignedApprovers.forEach(approver => {
          notifRepo.add({
            recipientUsername: approver, type: 'approval_required',
            message: `Document ${id} requires your Discipline approval`,
            documentId: id, link: `/documents/${id}/approve`
          });
        });
      }
    } else {
      doc.status   = 'Approved';
      doc.workflow = { required: false, currentStep: 'completed', steps: [] };
      docRepo.upsertHeader(doc);
      docRepo.replaceWorkflowSteps(id, []);
    }
  } else if (action === 'draft') {
    doc.status = 'Draft';
    docRepo.upsertHeader(doc);
  } else {
    docRepo.upsertHeader(doc);
  }

  histRepo.add({
    documentId: id, version: newVersion,
    changedBy: currentUser, changedByName: userName,
    changeDate: new Date().toISOString(),
    changeType: action || 'edit',
    changeSummary: changes.length
      ? `Document updated by ${userName} (v${newVersion}): ${changes.map((change) => change.label).join(', ')}`
      : `Document updated by ${userName} (v${newVersion})`,
    previousData: { snapshot, changes }
  });

  return docRepo.getById(id);
}

function deleteDocument(id) {
  docRepo.deleteDocument(id);
}

function getStats() { return docRepo.getStats(); }

function getInboxForUser(username) { return docRepo.getInboxForUser(username); }

// ── Attachment name builder ───────────────────────────────────────────────────

function buildAttachmentName(doc, originalName, index) {
  const fields = configRepo.getAttachmentNaming(doc.docGroup);
  const ext    = path.extname(originalName);
  const c      = doc.classifications || {};
  const fieldMap = {
    docGroup:   doc.docGroup,
    docDate:    (c.docDate || '').replace(/-/g, ''),
    manuName:   c.manuName || '',
    manuSerial: c.manuSerial || '',
    alertNum:   c.alertNum || '',
    certAuth:   c.certAuth || '',
    certNum:    c.certNum || '',
    addDesc:    (c.addDesc || '').replace(/\s+/g, '-'),
    docLoc:     doc.rig || ''
  };
  const parts = fields.map(f => fieldMap[f]).filter(Boolean);
  if (parts.length === 0) return `attachment_${index + 1}${ext}`;
  return parts.join('_') + (index > 0 ? `_${index + 1}` : '') + ext;
}

module.exports = {
  getRigs,
  getWorkOrders,
  getEquipment,
  getDocGenConfig,
  getNextDocId,
  getDocumentById,
  queryDocuments,
  getAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  getStats,
  getInboxForUser,
  buildAttachmentName,
  canEditDocument,
  canEditCompletedDocument,
  // Forward user/config/notification methods so existing code continues to work
  getUserByUsername: (u) => userRepo.toApiShape(userRepo.getByUsername(u)),
  getUsers:          ()  => userRepo.getAll().map(userRepo.toApiShape),
  getDocGen:         ()  => getDocGenConfig(),
  getFieldVisibility:()  => configRepo.getFieldVisibility(),
  getAttachmentNaming:() => configRepo.getAttachmentNaming(),
  getApprovers:      ()  => {
    const rows = configRepo.getApproversByDiscipline();
    // Return in legacy format for any remaining code that uses it
    const msv = {}, em = {};
    for (const r of rows) {
      if (r.approval_type === 'msv') {
        if (!msv[r.department_id]) msv[r.department_id] = [];
        msv[r.department_id].push(r.approver_username);
      } else {
        if (!em[r.department_id]) em[r.department_id] = [];
        em[r.department_id].push(r.approver_username);
      }
    }
    return { msvApprovers: msv, emApprovers: em };
  },
  addNotification: (n) => notifRepo.add(n),
  markNotificationRead: (id) => notifRepo.markRead(id),
  getNotificationsForUser: (u) => notifRepo.getForUser(u)
};
