/**
 * Central data store - reads/writes all JSON data files
 * This is the microservice layer abstraction - swap functions here for DB/API
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage');
const DOCS_FILE = path.join(STORAGE_DIR, 'documents.json');
const NOTIFICATIONS_FILE = path.join(STORAGE_DIR, 'notifications.json');

// Ensure storage exists
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(DOCS_FILE)) fs.writeFileSync(DOCS_FILE, JSON.stringify({ documents: [], nextId: 1 }));
if (!fs.existsSync(NOTIFICATIONS_FILE)) fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify({ notifications: [] }));

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ── Rigs ──────────────────────────────────────────────────────────────────────
function getRigs() {
  return readJSON(path.join(DATA_DIR, 'rigs.json'));
}

// ── Work Orders ───────────────────────────────────────────────────────────────
function getWorkOrders(search = '', rig = '') {
  let wos = readJSON(path.join(DATA_DIR, 'workorders.json'));
  if (rig) {
    wos = wos.filter(wo => wo.Site && wo.Site.toLowerCase().includes(rig.toLowerCase()));
  }
  if (search) {
    const s = search.toLowerCase();
    wos = wos.filter(wo =>
      (wo.WipEntityName && wo.WipEntityName.toLowerCase().includes(s)) ||
      (wo.Description && wo.Description.toLowerCase().includes(s))
    );
  }
  return wos.slice(0, 50);
}

// ── Equipment ─────────────────────────────────────────────────────────────────
function getEquipment(search = '', rig = '') {
  let eq = readJSON(path.join(DATA_DIR, 'equipment.json'));
  if (rig) {
    eq = eq.filter(e => e.rig === rig);
  }
  if (search) {
    const s = search.toLowerCase();
    eq = eq.filter(e =>
      (e.assetNumber && e.assetNumber.toLowerCase().includes(s)) ||
      (e.description && e.description.toLowerCase().includes(s))
    );
  }
  return eq.slice(0, 50);
}

// ── Users ─────────────────────────────────────────────────────────────────────
function getUsers() {
  return readJSON(path.join(DATA_DIR, 'users.json')).users;
}

function getUserByUsername(username) {
  return getUsers().find(u => u.username === username);
}

// ── Config ────────────────────────────────────────────────────────────────────
function getDocGen() {
  return readJSON(path.join(DATA_DIR, 'config', 'doc-gen.json'));
}

function getFieldVisibility() {
  return readJSON(path.join(DATA_DIR, 'config', 'field-visibility.json'));
}

function getAttachmentNaming() {
  return readJSON(path.join(DATA_DIR, 'config', 'attachment-naming.json'));
}

function getApprovers() {
  return readJSON(path.join(DATA_DIR, 'config', 'approvers.json'));
}

// ── Documents ─────────────────────────────────────────────────────────────────
function getAllDocuments() {
  return readJSON(DOCS_FILE);
}

function saveAllDocuments(data) {
  writeJSON(DOCS_FILE, data);
}

function getNextDocId() {
  const data = getAllDocuments();
  const id = String(data.nextId).padStart(6, '0');
  data.nextId++;
  saveAllDocuments(data);
  return id;
}

function getDocumentById(id) {
  const data = getAllDocuments();
  return data.documents.find(d => d.documentId === id) || null;
}

function saveDocument(doc) {
  const data = getAllDocuments();
  const idx = data.documents.findIndex(d => d.documentId === doc.documentId);
  if (idx >= 0) {
    data.documents[idx] = doc;
  } else {
    data.documents.push(doc);
  }
  saveAllDocuments(data);
  return doc;
}

function deleteDocument(id) {
  const data = getAllDocuments();
  data.documents = data.documents.filter(d => d.documentId !== id);
  saveAllDocuments(data);
}

function queryDocuments(filters = {}) {
  const data = getAllDocuments();
  let docs = data.documents;

  if (filters.originator) docs = docs.filter(d => d.originatorUsername === filters.originator);
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    docs = docs.filter(d => statuses.includes(d.status));
  }
  if (filters.rig) {
    const rigs = Array.isArray(filters.rig) ? filters.rig : [filters.rig];
    docs = docs.filter(d => rigs.includes(d.rig));
  }
  if (filters.docType) {
    const types = Array.isArray(filters.docType) ? filters.docType : [filters.docType];
    docs = docs.filter(d => types.includes(d.docType));
  }
  if (filters.docGroup) {
    const groups = Array.isArray(filters.docGroup) ? filters.docGroup : [filters.docGroup];
    docs = docs.filter(d => groups.includes(d.docGroup));
  }
  if (filters.documentId) docs = docs.filter(d => d.documentId.includes(filters.documentId));
  if (filters.workOrder) {
    docs = docs.filter(d =>
      d.objectLinks && d.objectLinks.some(l => l.workOrder && l.workOrder.toLowerCase().includes(filters.workOrder.toLowerCase()))
    );
  }
  if (filters.equipment) {
    docs = docs.filter(d =>
      d.objectLinks && d.objectLinks.some(l => l.equipmentText && l.equipmentText.toLowerCase().includes(filters.equipment.toLowerCase()))
    );
  }
  if (filters.description) {
    docs = docs.filter(d => d.classifications?.addDesc?.toLowerCase().includes(filters.description.toLowerCase()));
  }
  if (filters.dateFrom) docs = docs.filter(d => d.createdDate >= filters.dateFrom);
  if (filters.dateTo) docs = docs.filter(d => d.createdDate <= filters.dateTo);

  return docs;
}

// ── Notifications ─────────────────────────────────────────────────────────────
function getAllNotifications() {
  return readJSON(NOTIFICATIONS_FILE).notifications;
}

function addNotification(notif) {
  const data = readJSON(NOTIFICATIONS_FILE);
  const { v4: uuidv4 } = require('uuid');
  notif.id = uuidv4();
  notif.createdAt = new Date().toISOString();
  notif.read = false;
  data.notifications.push(notif);
  writeJSON(NOTIFICATIONS_FILE, data);
  return notif;
}

function markNotificationRead(id) {
  const data = readJSON(NOTIFICATIONS_FILE);
  const n = data.notifications.find(n => n.id === id);
  if (n) {
    n.read = true;
    writeJSON(NOTIFICATIONS_FILE, data);
  }
  return n;
}

function getNotificationsForUser(username) {
  return getAllNotifications().filter(n => n.recipientUsername === username);
}

module.exports = {
  getRigs,
  getWorkOrders,
  getEquipment,
  getUsers,
  getUserByUsername,
  getDocGen,
  getFieldVisibility,
  getAttachmentNaming,
  getApprovers,
  getNextDocId,
  getDocumentById,
  saveDocument,
  deleteDocument,
  queryDocuments,
  getAllDocuments,
  addNotification,
  markNotificationRead,
  getNotificationsForUser
};
