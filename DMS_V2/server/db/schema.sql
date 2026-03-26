PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ─────────────────────────────────────────────────────────────
-- DOCUMENT TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dms_header (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id          TEXT UNIQUE NOT NULL,
  rig                  TEXT,
  doc_type             TEXT,
  doc_group            TEXT,
  status               TEXT DEFAULT 'Draft',
  originator           TEXT,
  originator_username  TEXT,
  created_date         TEXT,
  last_modified        TEXT,
  version              TEXT DEFAULT '1.0',
  -- Classifications (flat columns for fast search/filter)
  doc_date             TEXT,
  manu_name            TEXT,
  manu_serial          TEXT,
  alert_num            TEXT,
  cert_auth            TEXT,
  cert_num             TEXT,
  add_desc             TEXT,
  doc_loc              TEXT,
  -- Full-text search blob (concatenated from all linked data)
  search_text          TEXT,
  -- OCR placeholder (populated externally in future)
  ocr_text             TEXT
);

CREATE INDEX IF NOT EXISTS idx_header_status      ON dms_header(status);
CREATE INDEX IF NOT EXISTS idx_header_originator  ON dms_header(originator_username);
CREATE INDEX IF NOT EXISTS idx_header_rig         ON dms_header(rig);
CREATE INDEX IF NOT EXISTS idx_header_doc_group   ON dms_header(doc_group);

CREATE TABLE IF NOT EXISTS dms_object_links (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id           TEXT NOT NULL,
  work_order            TEXT,
  work_order_description TEXT,
  owning_department_id  TEXT,
  em_asset_number       TEXT,
  equipment_text        TEXT,
  equipment_description TEXT,
  rig                   TEXT,
  parent                TEXT,
  FOREIGN KEY (document_id) REFERENCES dms_header(document_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_links_doc ON dms_object_links(document_id);

CREATE TABLE IF NOT EXISTS dms_attachments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id   TEXT NOT NULL,
  filename      TEXT,
  original_name TEXT,
  file_path     TEXT,
  file_size     INTEGER,
  mime_type     TEXT,
  uploaded_by   TEXT,
  uploaded_date TEXT,
  FOREIGN KEY (document_id) REFERENCES dms_header(document_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attach_doc ON dms_attachments(document_id);

CREATE TABLE IF NOT EXISTS dms_workflow_steps (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id        TEXT NOT NULL,
  step_number        INTEGER,
  step_name          TEXT,
  step_key           TEXT,
  status             TEXT,
  assigned_approvers TEXT,   -- JSON array
  actioned_by        TEXT,
  actioned_by_name   TEXT,
  action_date        TEXT,
  rejection_reason   TEXT,
  FOREIGN KEY (document_id) REFERENCES dms_header(document_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workflow_doc ON dms_workflow_steps(document_id);

CREATE TABLE IF NOT EXISTS dms_change_history (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id      TEXT NOT NULL,
  version          TEXT,
  changed_by       TEXT,
  changed_by_name  TEXT,
  change_date      TEXT,
  change_type      TEXT,
  change_summary   TEXT,
  previous_data    TEXT,   -- JSON snapshot
  FOREIGN KEY (document_id) REFERENCES dms_header(document_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_doc ON dms_change_history(document_id);

CREATE TABLE IF NOT EXISTS dms_notifications (
  id                 TEXT PRIMARY KEY,
  recipient_username TEXT,
  type               TEXT,
  message            TEXT,
  document_id        TEXT,
  link               TEXT,
  read               INTEGER DEFAULT 0,
  created_at         TEXT
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON dms_notifications(recipient_username);

-- ─────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email        TEXT,
  department   TEXT,
  role         TEXT DEFAULT 'user',
  active       INTEGER DEFAULT 1,
  created_date TEXT,
  last_login   TEXT
);

-- ─────────────────────────────────────────────────────────────
-- CONFIG TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS config_doc_types (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,
  description TEXT,
  active      INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS config_doc_groups (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_type          TEXT NOT NULL,
  code              TEXT UNIQUE NOT NULL,
  description       TEXT,
  workflow_required INTEGER DEFAULT 0,
  active            INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS config_field_visibility (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_group  TEXT NOT NULL,
  field_name TEXT NOT NULL,
  visibility TEXT,
  UNIQUE(doc_group, field_name)
);

CREATE TABLE IF NOT EXISTS config_attachment_naming (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_group   TEXT NOT NULL,
  field_order INTEGER NOT NULL,
  field_name  TEXT NOT NULL,
  UNIQUE(doc_group, field_order)
);

CREATE TABLE IF NOT EXISTS config_work_centers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id   TEXT UNIQUE NOT NULL,
  department_name TEXT,
  description     TEXT,
  active          INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS config_email (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key   TEXT UNIQUE NOT NULL,
  setting_value TEXT
);

-- ─────────────────────────────────────────────────────────────
-- WORKFLOW APPROVER TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_approvers_discipline (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id      TEXT NOT NULL,
  approval_type      TEXT NOT NULL,
  approver_username  TEXT NOT NULL,
  active             INTEGER DEFAULT 1,
  UNIQUE(department_id, approval_type, approver_username)
);

CREATE TABLE IF NOT EXISTS workflow_approvers_maintenance (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  maintenance_strategy TEXT,
  maintenance_days     INTEGER,
  approval_type        TEXT,
  approver_username    TEXT,
  active               INTEGER DEFAULT 1
);
