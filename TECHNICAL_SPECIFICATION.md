# DMS Web Application - Technical Specification

## 1. Overview

Standalone React + Node.js Document Management System replacing the SAP UI5 DMS application. SAP UI5 Fiori look-and-feel. Workflow powered by `bpmn-engine`. All data access wrapped in microservices for future swap to DBs/APIs.

**Tech Stack**: React (UI5 Web Components for React), Node.js/Express, bpmn-engine, file-based storage (JSON), Microsoft Auth (MSAL) — dropdown user picker for prototype.

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

Click row → opens form in approval mode (read-only fields + Approve/Reject buttons + rejection reason text box).

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

- Rejector must provide rejection reason (mandatory text)
- Originator sees rejected document in "My DMS Forms" with reason
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
| POST | /api/documents/:id/reject | Reject (with reason) |
| GET | /api/inbox | Current user's approval items |
| GET | /api/my-documents | Current user's documents |
| GET | /api/tile-data | Homepage tile counts |
| POST | /api/documents/:id/attachments | Upload attachments |

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
│   │   │   ├── Inbox.tsx
│   │   │   └── MyDocuments.tsx
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
│   │   │   └── configService.ts
│   │   ├── workflow/          # BPMN definitions
│   │   └── storage/           # File system operations
│   └── package.json
├── data/                      # Source data files
│   ├── rigs.json
│   ├── workorders.json
│   ├── equipment.json
│   └── config/
│       ├── doc-gen.json
│       ├── field-visibility.json
│       └── attachment-naming.json
└── storage/                   # Document storage root
    └── {Rig}/{DocType}/{DocGroup}/{ID}/
```
