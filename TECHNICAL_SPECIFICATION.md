# DMS Web Application - Technical Specification

## 1. Overview

Standalone React + Node.js Document Management System replacing the SAP UI5 DMS application. SAP UI5 Fiori look-and-feel. Workflow powered by `bpmn-engine`. All data access wrapped in microservices for future swap to DBs/APIs.

**Tech Stack**: React with [`@ui5/webcomponents-react`](https://github.com/UI5/webcomponents-react) v2.x (SAP Fiori-compliant UI components), Node.js/Express, bpmn-engine, file-based storage (JSON), Microsoft Auth (MSAL) — dropdown user picker for prototype.

**UI Framework**: The application uses `@ui5/webcomponents-react` — the official React wrapper for UI5 Web Components. This provides native SAP Fiori look-and-feel including the ShellBar, Tiles, ObjectPage, Form, Table, Dialog, MessageStrip and other Fiori patterns out of the box. Install via:
```bash
npm install @ui5/webcomponents-react @ui5/webcomponents @ui5/webcomponents-fiori @ui5/webcomponents-icons
```

---

## 2. Data Services (Microservice Layer)

Each data source is a service module with a standard interface, swappable for DB/API later.

| Service | Source (Prototype) | Future |
|---|---|---|
| Rig Service | `Rigs.txt` | DB/API |
| Work Order Service | `workorders.json` | EBS API |
| Equipment Service | `Riq Equipments` file | EBS API |
| Document Service | File system (JSON folders) | DB |
| User Service | Static config JSON | Microsoft AD |
| Workflow Config Service | `ZPM_DMS_DOC_GEN` JSON | DB |
| Field Visibility Service | `ZPM_DMS_CL_OBJ` JSON | DB |
| Approver Service | Department from Work Order | DB/API |
| Attachment Naming Service | `ZPM_DMS_ATT_NAM` JSON | DB |

---

## 3. Screens

### 3.1 Homepage (Dashboard)

SAP Fiori-style shell with 3 tiles:

| Tile | Description | Badge |
|---|---|---|
| Create DMS Document | Opens blank upload form | — |
| DMS Inbox | Items pending your approval | Count |
| My DMS Forms | Your submitted documents | Count |

### 3.2 Create/Edit DMS Document Form

Dynamic form driven by config. Flow:

1. **Select Rig** — Searchable dropdown from Rigs service
2. **Select Document Type** — Dropdown: CAT, CER, GRP, MAN, STC, STU
3. **Select Document Group** — Dropdown filtered by Doc Type (see hierarchy below)
4. **Dynamic Form Fields** — Rendered based on `ZPM_DMS_CL_OBJ` visibility config for selected group

**Classification Fields** (visibility per group):
- Doc Date (date picker)
- Manufacturer Name (text)
- Manufacturer Serial No (text)
- Alert Number (text)
- Certifying Authority (text)
- Certificate Number (text)
- Additional Description (text)
- Doc Location (text — populated from Rig selection)

**Object Links Table** (visibility per group):
- Work Order — searchable, validated against Work Order service
- Equipment — searchable from Equipment service

**Removed from SAP version**: Functional Location, Material (not available outside SAP)

**Validation Rules**:
- Field visibility codes: M=mandatory, O=optional, D=display-only, M\*=multiple entries 1 required, MO=one column per row mandatory, AMO=mandatory for approvers only
- Work orders must have Status="Released" AND WorkOrderType in ("Inspection Opex", "Inspection Capex")
- At least one attachment required

**Attachments Section**: File upload area, drag-and-drop, file list with delete

**Buttons**: Submit, Cancel | Approve, Reject (when opened from Inbox) | Resubmit (when rejected)

### 3.3 DMS Inbox

Table of workflow items pending current user's approval:

| Column | Source |
|---|---|
| Originator | Document creator |
| Doc Type / Group | From document |
| Description | Additional Description field |
| Rig | Rig name |
| Equipment | Equipment text |
| Work Order | Work order number |
| Date Created | Submission date |
| Workflow Step | MSV Approval / E&M Approval |

Click row → opens form in **approval mode** (see 3.5 Approval Screen below).

### 3.4 My DMS Forms

Table of current user's submitted documents:

| Column | Source |
|---|---|
| Document ID | Folder number |
| Doc Type / Group | From document |
| Description | Additional Description |
| Status | Draft / Pending MSV / Pending E&M / Approved / Rejected |
| Date | Created date |

Click row → opens form in view/edit mode depending on status. Rejected documents can be edited and resubmitted.

### 3.5 Approval Screen

When a document is opened from the DMS Inbox, it renders in **read-only approval mode**. The approver can review all details but cannot modify any form fields.

**Layout** (using UI5 `ObjectPage`):

| Section | Content |
|---|---|
| Header | Document ID, Status badge, Originator, Rig, Date Created |
| Classification | All classification fields rendered as read-only `FormItem` display values |
| Object Links | Work Order / Equipment table (read-only) |
| Attachments | List of attached files with download links (read-only, no upload/delete) |
| Workflow Status | Visual workflow tracker showing current step (see §13 Workflow Visualisation) |
| Approval History | Table of previous approval actions: Step, Approver, Decision, Date, Rejection Reason |

**Action Bar** (sticky footer):

| Button | Behaviour |
|---|---|
| **Approve** | Advances workflow to next step. Confirmation dialog before action. |
| **Reject** | Opens a dialog with an **optional** rejection reason text area. The approver may provide a reason but it is not mandatory. On confirm, workflow status is set to Rejected. |
| **Back** | Returns to Inbox |

**Rejection Reason**:
- Displayed in a `Dialog` after clicking Reject
- Text area input is **optional** — the approver can reject without providing a reason
- If provided, the reason is stored in `workflow.rejectionDetails` and visible to the originator on their "My DMS Forms" view
- The originator sees the rejection reason on the form header as a `MessageStrip` of type `Error`

### 3.6 Form Mode Matrix

The form behaviour changes based on how it is opened and the document status:

| Entry Point | Status | Mode | Fields | Actions |
|---|---|---|---|---|
| Create DMS Document (tile) | New | **Edit** | All editable per visibility config | Submit, Cancel |
| My DMS Forms | Draft | **Edit** | All editable | Submit, Cancel, Delete |
| My DMS Forms | Pending Approval | **Read-only** | Display only | Back |
| My DMS Forms | Rejected | **Edit** | All editable | Resubmit, Cancel |
| My DMS Forms | Completed | **Read-only** | Display only | Back |
| DMS Inbox | Pending (your step) | **Read-only + Approval** | Display only | Approve, Reject, Back |
| Deep Link | Any | Per status rules above | Per status rules above | Per status rules above |

---

## 4. Document Type → Group Hierarchy

```
CAT (Catalogs & Brochures)
  └─ CT  Catalogue / Brochures

CER (Certificates)
  ├─ CE  Certification
  ├─ CM  Material Certificate
  ├─ CO  Certificate of Origin
  ├─ ER  EX-Register
  ├─ EX  EX-Certificates
  ├─ IR  Inspection Reports
  ├─ OS  Oil Sample
  ├─ RR  Repair Reports
  ├─ SF  Statement of Facts
  └─ TP  Technical Passports

GRP (General Reports)
  ├─ AC  Asset Cond. Assessment Process
  ├─ AD  Audit
  ├─ CR  Cost Attributes Review
  ├─ CS  Critical Spare Parts List
  ├─ EA  Equipment Alert
  ├─ EC  Equipment Status Report
  ├─ EV  Equipment Validation Process
  ├─ MC  Management of Change
  ├─ RA  Rig Acceptance / Commissioning
  └─ VR  Visit Report

MAN (Manuals & Tech Info)
  ├─ DW  Drawing
  ├─ MA  Manuf. Operation Manual
  ├─ PC  Pictures / Photos
  ├─ SC  Specification & Standards
  └─ SL  Spare Parts List

STC (Static & Calculation)
  └─ CA  Calculation / Static Calculation

STU (Studies)
  ├─ HZ  HAZOP Study
  └─ ST  Study & Test Reports
```

---

## 5. Field Visibility Matrix

Per document group, which fields appear and their mode (M/O/D/M\*/MO/AMO):

| Group | DocDate | ManuName | ManuSN | AlertNum | CertAuth | CertNum | AddDesc | DocLoc | WorkOrder | Equipment |
|-------|---------|----------|--------|----------|----------|---------|---------|--------|-----------|-----------|
| AC | M | | | | | | M | M | M* | D |
| AD | M | O | | | O | | M | M | | MO |
| CA | M | | | | | | M | M | | MO |
| CE | M | M | O | | M | M | O | M | AMO | MO |
| CM | M | M | O | | M | M | O | M | | MO |
| CO | M | M | O | | | M | O | M | AMO | MO |
| CT | M | M | | | | | M | M | | |
| DW | M | M | O | | | | O | M | | MO |
| EA | M | M | | M | | | M | M | | M* |
| EC | M | | | | | | O | M | AMO | MO |
| EV | M | | | | | | M | M | M* | D |
| EX | | M | | | | M | | M | | |
| HZ | M | | | | O | | M | M | | MO |
| IR | M | | | | M | O | M | M | | MO |
| MA | M | M | O | | | | O | M | | MO |
| MC | M | | | | | | M | M | | O |
| OS | M | | O | | M | M | O | M | M | MO |
| PC | M | | O | | | | O | M | | MO |
| RA | M | | | | M | M | M | M | | MO |
| RR | M | | | | M | | O | M | | MO |
| SC | M | M | O | | | | O | M | | MO |
| SF | M | | | | M | O | M | M | | MO |
| SL | M | M | O | | | | O | M | | MO |
| ST | M | | | | O | | M | M | | M* |
| TP | M | M | M | | | O | O | M | O | MO |
| VR | M | | | | M | | M | M | | MO |

---

## 6. Workflow

### 6.1 Workflow Trigger

On form submit, check `ZPM_DMS_DOC_GEN` config for the Doc Type + Doc Group:

**Workflow required** (WORKFLOW_ACTIVE = X):
- CER: CE, CO, ER, OS, TP
- GRP: AC, CR, CS, EC, EV

**No workflow** (direct save to Step 3):
- CAT: CT | CER: CM, EX, IR, RR, SF | GRP: AD, EA, MC, RA, VR | MAN: all | STC: CA | STU: HZ, ST

### 6.2 Workflow Steps (BPMN Process)

```
Submit Form
    │
    ▼
┌─────────────────────┐
│ Workflow Required?   │──── No ───► Step 3: Save Files
│ (check DOC_GEN)     │
└─────────┬───────────┘
          │ Yes
          ▼
┌─────────────────────┐
│ Step 1: MSV Approval│
│ Approver: dept from │──── Reject ───► END (status=Rejected)
│ work order          │
└─────────┬───────────┘
          │ Approve
          ▼
┌─────────────────────┐
│ Step 2: E&M Approval│
│ Approver: dept from │──── Reject ───► END (status=Rejected)
│ work order          │
└─────────┬───────────┘
          │ Approve
          ▼
┌─────────────────────┐
│ Step 3: Save Files  │
│ - Create folder     │
│ - Write attrs JSON  │
│ - Copy attachments  │
│ - Apply naming      │
│ Status = Completed  │
└─────────────────────┘
```

### 6.3 Approver Resolution

Approvers determined by **department** from the work order data (`OwningDepartmentId` field). Configuration maps departments to MSV and E&M approver usernames.

### 6.4 Document Statuses

| Status | Description |
|---|---|
| Draft | Saved but not submitted |
| Pending MSV Approval | Awaiting Step 1 |
| Pending E&M Approval | Awaiting Step 2 |
| Approved / Completed | Workflow done, files saved |
| Rejected | Rejected at Step 1 or 2 (can resubmit) |

### 6.5 Rejection & Resubmit

- Rejector may **optionally** provide a rejection reason (free text)
- If no reason is provided, the rejection is recorded without a reason text
- Originator sees rejected document in "My DMS Forms" with reason (if provided) displayed as an error `MessageStrip`
- Originator can edit and resubmit → workflow restarts at Step 1

---

## 7. File Storage

### 7.1 Folder Structure

```
/storage
  /{Rig}
    /{DocType}
      /{DocGroup}
        /{DocumentID}          ← auto-incrementing number
          /attributes.json     ← all form field values + metadata
          /attachment1.pdf     ← renamed per naming convention
          /attachment2.pdf
```

### 7.2 attributes.json Schema

```json
{
  "documentId": "000001",
  "rig": "T0102",
  "docType": "CER",
  "docGroup": "CE",
  "status": "Completed",
  "originator": "John Smith",
  "originatorUsername": "SMITH_J",
  "createdDate": "2026-03-20",
  "classifications": {
    "docDate": "2026-03-15",
    "manuName": "Cameron",
    "manuSerial": "SN12345",
    "certAuth": "OIS",
    "certNum": "OIS/NDT/001",
    "addDescription": "BOP Inspection",
    "docLocation": "T0102"
  },
  "objectLinks": [
    {
      "workOrder": "RT600.7904980",
      "workOrderText": "Need to replace ADS motor...",
      "equipment": "E0209056",
      "equipmentText": "ROTARY TABLE: 37-1/2IN"
    }
  ],
  "workflow": {
    "required": true,
    "currentStep": "completed",
    "msvApprover": "MANAGER1",
    "msvApprovalDate": "2026-03-18",
    "emApprover": "ENGINEER1",
    "emApprovalDate": "2026-03-19",
    "rejectionDetails": null
  },
  "attachments": [
    "CE_20260315_OIS_BOP-Inspection.pdf"
  ]
}
```

### 7.3 Attachment Naming Convention

Files are renamed on save using the `ZPM_DMS_ATT_NAM` config. Each doc group has numbered positions for fields. The filename is built by joining non-zero fields in position order with underscores.

Example for CE: positions are DocGroup(1), DocDate(2), CertAuth(3), AddDescription(4) → `CE_20260315_OIS_BOP-Inspection.pdf`

---

## 8. Work Order Validation Rules

- Source: `workorders.json` (Work Order microservice)
- **Status** must equal `"Released"`
- **WorkOrderType** must be `"Inspection Opex"` or `"Inspection Capex"`
- Search by WipEntityName or Description (partial match)
- Duplicate work orders not allowed on same document

---

## 9. Equipment Search

- Source: `Riq Equipments` file (Equipment microservice)
- Searchable by Asset Number or Asset Description
- Filtered by selected Rig (Organization field)
- Returns: Asset Number, Description, Serial Number, Parent

---

## 10. Authentication

| Phase | Method |
|---|---|
| Prototype | Dropdown user picker (list of configured users) |
| Production | Microsoft MSAL (Azure AD SSO) |

MSAL integration is straightforward — `@azure/msal-react` library, register app in Azure AD, configure redirect URIs. The user service abstraction means swapping from dropdown to MSAL only changes the auth module.

---

## 11. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/rigs | List all rigs |
| GET | /api/document-types | List doc types |
| GET | /api/document-groups/:docType | Groups for type |
| GET | /api/field-config/:docGroup | Visibility config |
| GET | /api/naming-config/:docGroup | Attachment naming rules |
| GET | /api/workorders?search=X&rig=X | Search work orders |
| GET | /api/equipment?search=X&rig=X | Search equipment |
| POST | /api/documents | Create/submit document |
| GET | /api/documents/:id | Load document |
| PUT | /api/documents/:id | Update document |
| DELETE | /api/documents/:id | Delete document |
| POST | /api/documents/:id/approve | Approve (with step) |
| POST | /api/documents/:id/reject | Reject (with optional reason) |
| GET | /api/inbox | Current user's approval items |
| GET | /api/my-documents | Current user's documents |
| GET | /api/tile-data | Homepage tile counts |
| POST | /api/documents/:id/attachments | Upload attachments |
| GET | /api/documents/:id/workflow | Workflow status and history for visualisation |
| GET | /api/notifications | Current user's unread notifications |
| PUT | /api/notifications/:id/read | Mark notification as read |
| POST | /api/notifications/send-summary | Trigger summary email for user |
| GET | /api/admin/workflow-approvers | List all workflow approver mappings |
| PUT | /api/admin/workflow-approvers | Update approver mappings (triggers workflow regeneration) |
| GET | /api/admin/config | Get application configuration |
| PUT | /api/admin/config | Update application configuration |
| GET | /api/admin/users | List users and their admin roles |
| PUT | /api/admin/users/:id/role | Update user admin role |

---

## 12. Project Structure

```
dms-web/
├── client/                    # React app
│   ├── src/
│   │   ├── components/        # Shared UI components
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── DocumentForm.tsx
│   │   │   ├── ApprovalScreen.tsx   # Read-only approval view
│   │   │   ├── Inbox.tsx
│   │   │   ├── MyDocuments.tsx
│   │   │   └── Admin.tsx            # Administration panel
│   │   ├── components/
│   │   │   ├── WorkflowTracker.tsx  # Visual workflow step indicator
│   │   │   ├── NotificationPopover.tsx
│   │   │   └── ApproverPicker.tsx   # Admin approver selection
│   │   ├── services/          # API client calls
│   │   ├── context/           # Auth, user context
│   │   └── config/            # Field visibility, naming
│   └── package.json
├── server/                    # Node.js Express
│   ├── src/
│   │   ├── routes/            # API routes
│   │   ├── services/          # Microservice layer
│   │   │   ├── rigService.ts
│   │   │   ├── workOrderService.ts
│   │   │   ├── equipmentService.ts
│   │   │   ├── documentService.ts
│   │   │   ├── workflowService.ts
│   │   │   ├── userService.ts
│   │   │   ├── configService.ts
│   │   │   ├── notificationService.ts  # In-app + email notifications
│   │   │   └── adminService.ts         # Admin operations
│   │   ├── workflow/          # BPMN definitions
│   │   ├── notifications/     # Email templates + scheduler
│   │   └── storage/           # File system operations
│   └── package.json
├── data/                      # Source data files
│   ├── rigs.json
│   ├── workorders.json
│   ├── equipment.json
│   └── config/
│       ├── doc-gen.json
│       ├── field-visibility.json
│       ├── attachment-naming.json
│       └── approvers.json        # Department → approver mappings
├── storage/                   # Document storage root
│   └── {Rig}/{DocType}/{DocGroup}/{ID}/
└── templates/                 # Email templates
    └── notification-summary.html
```

---

## 13. Workflow Visualisation

When a document requires workflow approval, the form displays a visual workflow tracker showing the progression through approval steps.

### 13.1 Workflow Tracker Component

Rendered on the Document Form (in both approval mode and view mode) using the UI5 `Timeline` or a custom step indicator component.

**Display**:

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Submitted    │────▶│  MSV Approval    │────▶│  E&M Approval │────▶ Completed
│              │     │                  │     │              │
│ John Smith   │     │ ◉ Approved       │     │ ○ Pending     │
│ 20 Mar 2026  │     │ Jane Doe         │     │ Awaiting:     │
│              │     │ 21 Mar 2026      │     │ Bob Engineer  │
└──────────────┘     └──────────────────┘     └──────────────┘
```

**Step States**:
| State | Icon | Description |
|---|---|---|
| Completed | ✓ (green) | Step approved — shows approver name and date |
| Active/Pending | ◉ (blue) | Current step — shows who can approve |
| Rejected | ✗ (red) | Step was rejected — shows rejector, date, and optional reason |
| Upcoming | ○ (grey) | Future step — shows potential approvers |

### 13.2 Data Shown Per Step

| Field | Description |
|---|---|
| Step Name | "MSV Approval" or "E&M Approval" |
| Possible Approvers | List of users who can approve this step (from approver config) |
| Actual Approver | The user who approved/rejected (if actioned) |
| Decision | Approved / Rejected |
| Decision Date | Timestamp of action |
| Rejection Reason | Displayed if rejected and reason was provided |

### 13.3 Visibility

- **Workflow not required**: Tracker is hidden; a `MessageStrip` of type `Information` states "No workflow approval required for this document type"
- **Workflow required**: Tracker is always visible on the form regardless of mode (edit, read-only, approval)
- The tracker updates in real-time when an approval/rejection action is taken

---

## 14. Notifications

### 14.1 In-App Notifications

The ShellBar displays a notification bell icon with an unread count badge. Clicking opens a `Popover` listing recent notifications.

**Notification Events**:

| Event | Recipient | Message |
|---|---|---|
| New approval required | Assigned approver(s) | "Document {ID} requires your {step} approval" |
| Document approved (step) | Originator | "Document {ID} has been approved at {step}" |
| Document fully approved | Originator | "Document {ID} has been fully approved and filed" |
| Document rejected | Originator | "Document {ID} has been rejected at {step}" |
| Document resubmitted | Assigned approver(s) | "Document {ID} has been resubmitted for approval" |

Each notification includes a **link to the document** — if the document is in an approval status and the recipient is an approver, the link opens the approval screen directly.

### 14.2 Summary Email Notifications

Matching the behaviour of the original SAP DMS application, the system sends **summary email notifications** to users.

**Email Trigger**: A scheduled job (configurable interval, default: daily at 08:00) or triggered on-demand via API.

**Email Content**:

```
Subject: DMS Notification Summary — {Date}

Hello {User Name},

You have the following DMS notifications:

ITEMS REQUIRING YOUR APPROVAL:
─────────────────────────────────
• Document {ID} — {DocType}/{DocGroup} — {Rig} — {Description}
  Submitted by {Originator} on {Date}
  Link: {app-url}/documents/{ID}

• Document {ID} — ...

YOUR DOCUMENTS — STATUS UPDATES:
─────────────────────────────────
• Document {ID} — Approved at MSV Approval by {Approver} on {Date}
  Link: {app-url}/documents/{ID}

• Document {ID} — Rejected at E&M Approval
  Reason: {Rejection reason or "No reason provided"}
  Link: {app-url}/documents/{ID}

──
DMS Web Application
```

**Key Points**:
- Each item in the email includes a **direct link** to the document — the link opens the form at the appropriate screen (approval screen if the user is the approver, read-only view otherwise)
- Only includes notifications since the last summary email was sent
- Users with no pending notifications do not receive an email
- Email delivery via configurable SMTP transport (prototype: console logging / file output)

---

## 15. Deep Linking

### 15.1 URL Routes

All forms are accessible via direct URL, enabling bookmarking, sharing, and external integration.

| Route | Description |
|---|---|
| `/` | Homepage dashboard |
| `/documents/new` | New blank document form |
| `/documents/new?rig={rig}&docType={type}&docGroup={group}&wo={workOrder}&eq={equipment}` | Pre-populated new document |
| `/documents/{id}` | Open existing document (mode determined by status + user role) |
| `/documents/{id}/approve` | Open document in approval mode (redirects to view if not an approver) |
| `/inbox` | DMS Inbox |
| `/my-documents` | My DMS Forms |
| `/admin` | Administration panel (admin users only) |

### 15.2 Form Mode from Deep Link

When a document is opened via deep link, the form mode is determined by:

1. **Document status** — Draft/Rejected = editable (if originator); Pending/Completed = read-only
2. **User role** — If the user is the assigned approver for the current step, approval actions are shown
3. **Ownership** — Only the originator can edit their own documents

If an unauthorized user accesses a link, they see the document in read-only mode (or a "not authorized" message if the document doesn't exist).

### 15.3 External Integration (Flex Work Buttons)

External systems (e.g., Flex) can launch a new DMS document request by navigating to the pre-populated URL:

```
{app-url}/documents/new?rig=T0102&docType=CER&docGroup=CE&wo=RT600.7904980&eq=E0209056
```

**Supported Query Parameters**:

| Parameter | Maps To | Description |
|---|---|---|
| `rig` | Rig selection | Pre-selects the rig (triggers dependent dropdowns) |
| `docType` | Document Type | Pre-selects document type |
| `docGroup` | Document Group | Pre-selects document group (loads field config) |
| `wo` | Work Order | Pre-populates first work order in Object Links |
| `eq` | Equipment | Pre-populates first equipment in Object Links |
| `desc` | Additional Description | Pre-fills the description field |

- Pre-populated fields from query parameters are **editable** — the user can change them before submitting
- If a required parameter is missing or invalid, the form loads with that field empty and the user fills it manually
- The URL is shareable — anyone with access can open and complete the form

---

## 16. Administration

### 16.1 Admin Access

A special **Admin** role controls access to administration screens. Admin users are defined in the user service configuration.

| Role | Permissions |
|---|---|
| User | Create, view, edit own documents; approve assigned items |
| Admin | All user permissions + manage workflow approvers + manage application config |

### 16.2 Administration Screen

Accessible from the ShellBar navigation (visible to Admin users only) at `/admin`. Uses a UI5 `IconTabBar` with the following tabs:

#### Tab 1: Workflow Approver Management

Manage the mapping of departments to approval step approvers.

**Table Columns**:

| Column | Description |
|---|---|
| Department | The owning department ID/name |
| MSV Approver(s) | User(s) assigned to MSV approval for this department |
| E&M Approver(s) | User(s) assigned to E&M approval for this department |

**Actions**:
- **Edit** a row to change MSV or E&M approvers (user picker from User Service)
- **Add** a new department mapping
- **Delete** a department mapping

**Workflow Regeneration**: When an approver mapping is changed, the system automatically scans all **open workflows** (status = Pending MSV Approval or Pending E&M Approval) that reference the affected department. For each affected workflow:
1. The assigned approver for the relevant step is updated to the new approver
2. If the old approver had the item in their inbox, it moves to the new approver's inbox
3. A notification is sent to the new approver
4. An audit log entry is created recording the approver change

This ensures that changing an approver does not leave documents stuck with a person who is no longer responsible.

#### Tab 2: Application Configuration

GUI for managing application settings that were previously hard-coded or in config files.

**Configurable Settings**:

| Setting | Description |
|---|---|
| Document Type/Group definitions | Add, edit, or disable document types and groups |
| Field Visibility rules | Modify which fields appear per document group and their mode (M/O/D) |
| Attachment Naming rules | Change the naming convention per document group |
| Workflow Active flags | Toggle whether a document group requires workflow approval |
| Notification settings | Email schedule, SMTP config |
| General settings | Application title, default rig, etc. |

**Safety**:
- All config changes are validated before saving
- Changes are logged with the admin user and timestamp
- Field visibility changes apply to new documents only (existing documents retain their saved data)
- Workflow Active flag changes apply to new submissions only (in-progress workflows continue under their original rules)

### 16.3 Admin Data Model

```json
{
  "approverMappings": [
    {
      "departmentId": "MSV",
      "departmentName": "Marine & Subsea",
      "msvApprovers": ["MANAGER1", "MANAGER2"],
      "emApprovers": ["ENGINEER1"]
    }
  ],
  "auditLog": [
    {
      "timestamp": "2026-03-20T10:30:00Z",
      "adminUser": "ADMIN1",
      "action": "UPDATE_APPROVER",
      "details": "Changed MSV approver for dept Marine & Subsea from MANAGER1 to MANAGER3",
      "affectedWorkflows": ["DOC-000045", "DOC-000052"]
    }
  ]
}
```
