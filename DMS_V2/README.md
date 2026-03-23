# DMS V2 — Document Management System

A modern web application replacing the SAP UI5 DMS application, built with React + @ui5/webcomponents-react and Node.js/Express.

## Quick Start

### First-Time Setup
```bash
cd DMS_V2
npm run setup
npm start
```
Then open **http://localhost:3000**

### Development (Hot Reload)
```bash
cd DMS_V2
npm run setup   # only needed once
npm run dev     # starts both server + React dev server
```
Then open **http://localhost:5173** (proxies API to port 3000)

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Install all deps + build client |
| `npm start` | Start production server (serves built React + API) |
| `npm run dev` | Development mode (hot reload on port 5173) |
| `npm run build` | Build React client only |
| `npm run dev:server` | Server only with nodemon |
| `npm run dev:client` | React dev server only |

---

## Architecture

```
DMS_V2/
├── server/              # Node.js Express backend
│   ├── index.js         # Server entry point
│   ├── routes/          # API route handlers
│   └── services/        # Business logic (dataStore, workflowService)
├── client/              # React frontend
│   └── src/
│       ├── pages/       # Page components
│       ├── components/  # Shared components (ShellBar, WorkflowTracker)
│       └── context/     # Auth context
├── data/                # Static data files (rigs, workorders, config)
│   └── config/          # Field visibility, naming, approvers
└── storage/             # Document storage (created at runtime)
    └── documents.json   # All document data
```

## Features

- **Dashboard** with 4 Fiori-style tiles and recent documents
- **Create/Edit DMS Documents** with dynamic fields based on document group
- **File Upload** with drag & drop, auto-rename per naming convention
- **Work Order Search** from workorders.json (searchable, validated)
- **Equipment Search** from equipment data (filtered by rig)
- **Approval Workflow** — MSV then E&M approval steps
- **DMS Inbox** — items pending your approval
- **My Documents** — your submitted documents with status tracking
- **DMS Report** — search all documents with filters + CSV export
- **Workflow Tracker** — visual step indicator on every document
- **In-App Notifications** — real-time notification bell in ShellBar
- **Admin Panel** — manage users, approvers, view stats
- **Deep Linking** — all routes bookmarkable

## Users (Prototype)

| Username | Name | Role |
|----------|------|------|
| SMITH_J | John Smith | user |
| DOE_J | Jane Doe | user (MSV Approver) |
| ENGINEER1 | Bob Engineer | user (E&M Approver) |
| MANAGER1 | Alice Manager | user (MSV Approver) |
| MANAGER2 | Charlie Manager | user (E&M Approver) |
| ADMIN1 | Admin User | admin |

## Configuration

- **Port**: Set `PORT` environment variable (default: 3000)
- **Approvers**: Edit `data/config/approvers.json` or use Admin panel
- **Users**: Edit `data/users.json` or use Admin panel
- **Storage**: Documents stored in `storage/documents.json` + file attachments in `storage/{Rig}/{DocType}/{DocGroup}/{ID}/`

## Requirements

- Node.js 18+
- npm 8+
