const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const ds = require('../services/dataStore');
const wf = require('../services/workflowService');
const { v4: uuidv4 } = require('uuid');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage');
const upload = multer({ dest: path.join(STORAGE_DIR, 'tmp') });

// Build attachment filename from naming config
function buildAttachmentName(doc, originalName, index) {
  const namingConfig = ds.getAttachmentNaming();
  const fields = namingConfig[doc.docGroup] || [];
  const ext = path.extname(originalName);
  const fieldMap = {
    docGroup: doc.docGroup,
    docDate: doc.classifications?.docDate?.replace(/-/g, '') || '',
    manuName: doc.classifications?.manuName || '',
    manuSerial: doc.classifications?.manuSerial || '',
    alertNum: doc.classifications?.alertNum || '',
    certAuth: doc.classifications?.certAuth || '',
    certNum: doc.classifications?.certNum || '',
    addDesc: (doc.classifications?.addDesc || '').replace(/\s+/g, '-'),
    docLoc: doc.rig || ''
  };
  const parts = fields.map(f => fieldMap[f]).filter(Boolean);
  if (parts.length === 0) return `attachment_${index + 1}${ext}`;
  return parts.join('_') + (index > 0 ? `_${index + 1}` : '') + ext;
}

// GET /api/documents/:id
router.get('/:id', (req, res) => {
  const doc = ds.getDocumentById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

// POST /api/documents - create new document
router.post('/', (req, res) => {
  try {
    const { currentUser, action, ...docData } = req.body;
    if (!currentUser) return res.status(400).json({ error: 'currentUser required' });

    const user = ds.getUserByUsername(currentUser);
    const docId = ds.getNextDocId();
    const now = new Date().toISOString().split('T')[0];

    const doc = {
      documentId: docId,
      rig: docData.rig,
      docType: docData.docType,
      docGroup: docData.docGroup,
      status: action === 'draft' ? 'Draft' : null,
      originator: user ? user.displayName : currentUser,
      originatorUsername: currentUser,
      createdDate: now,
      lastModified: now,
      classifications: docData.classifications || {},
      objectLinks: docData.objectLinks || [],
      attachments: [],
      workflow: null,
      notifications: []
    };

    if (action === 'submit') {
      const workflowRequired = wf.requiresWorkflow(doc.docGroup);
      if (workflowRequired) {
        doc.workflow = wf.initWorkflow(doc);
        doc.status = 'Pending MSV Approval';
        // Notify MSV approvers
        doc.workflow.steps[0].assignedApprovers.forEach(approver => {
          ds.addNotification({
            recipientUsername: approver,
            type: 'approval_required',
            message: `Document ${doc.documentId} requires your MSV approval`,
            documentId: doc.documentId,
            link: `/documents/${doc.documentId}/approve`
          });
        });
      } else {
        doc.workflow = { required: false, currentStep: 'completed', steps: [] };
        doc.status = 'Approved';
      }
    } else {
      doc.status = 'Draft';
      doc.workflow = { required: false, currentStep: 'draft', steps: [] };
    }

    ds.saveDocument(doc);
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/documents/:id - update document
router.put('/:id', (req, res) => {
  try {
    const existing = ds.getDocumentById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    const { currentUser, action, ...docData } = req.body;
    if (!currentUser) return res.status(400).json({ error: 'currentUser required' });

    const now = new Date().toISOString().split('T')[0];
    const doc = {
      ...existing,
      rig: docData.rig || existing.rig,
      docType: docData.docType || existing.docType,
      docGroup: docData.docGroup || existing.docGroup,
      classifications: docData.classifications || existing.classifications,
      objectLinks: docData.objectLinks !== undefined ? docData.objectLinks : existing.objectLinks,
      lastModified: now
    };

    if (action === 'submit' || action === 'resubmit') {
      const workflowRequired = wf.requiresWorkflow(doc.docGroup);
      if (workflowRequired) {
        if (action === 'resubmit') {
          wf.resubmitWorkflow(doc);
        } else {
          doc.workflow = wf.initWorkflow(doc);
          doc.status = 'Pending MSV Approval';
          doc.workflow.steps[0].assignedApprovers.forEach(approver => {
            ds.addNotification({
              recipientUsername: approver,
              type: 'approval_required',
              message: `Document ${doc.documentId} requires your MSV approval`,
              documentId: doc.documentId,
              link: `/documents/${doc.documentId}/approve`
            });
          });
        }
      } else {
        doc.workflow = { required: false, currentStep: 'completed', steps: [] };
        doc.status = 'Approved';
      }
    } else if (action === 'draft') {
      doc.status = 'Draft';
    }

    ds.saveDocument(doc);
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', (req, res) => {
  const existing = ds.getDocumentById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Document not found' });
  if (existing.status !== 'Draft') return res.status(403).json({ error: 'Only drafts can be deleted' });
  ds.deleteDocument(req.params.id);
  res.json({ success: true });
});

// POST /api/documents/:id/approve
router.post('/:id/approve', (req, res) => {
  try {
    const doc = ds.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const { currentUser } = req.body;
    if (!wf.isApproverForDocument(doc, currentUser)) {
      return res.status(403).json({ error: 'Not authorized to approve this document' });
    }

    const updated = wf.approveStep(doc, currentUser);
    ds.saveDocument(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/:id/reject
router.post('/:id/reject', (req, res) => {
  try {
    const doc = ds.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const { currentUser, reason } = req.body;
    if (!wf.isApproverForDocument(doc, currentUser)) {
      return res.status(403).json({ error: 'Not authorized to reject this document' });
    }

    const updated = wf.rejectStep(doc, currentUser, reason || '');
    ds.saveDocument(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/:id/attachments - upload files
router.post('/:id/attachments', upload.array('files', 20), (req, res) => {
  try {
    const doc = ds.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const docDir = path.join(STORAGE_DIR, doc.rig, doc.docType, doc.docGroup, doc.documentId);
    if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });

    const addedFiles = [];
    req.files.forEach((file, idx) => {
      const newName = buildAttachmentName(doc, file.originalname, doc.attachments.length + idx);
      const dest = path.join(docDir, newName);
      fs.renameSync(file.path, dest);
      doc.attachments.push(newName);
      addedFiles.push(newName);
    });

    ds.saveDocument(doc);
    res.json({ attachments: doc.attachments, added: addedFiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:id/attachments/:filename
router.delete('/:id/attachments/:filename', (req, res) => {
  try {
    const doc = ds.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const filename = req.params.filename;
    const docDir = path.join(STORAGE_DIR, doc.rig, doc.docType, doc.docGroup, doc.documentId);
    const filePath = path.join(docDir, filename);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    doc.attachments = doc.attachments.filter(a => a !== filename);
    ds.saveDocument(doc);
    res.json({ attachments: doc.attachments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id/attachments/:filename - download
router.get('/:id/attachments/:filename', (req, res) => {
  const doc = ds.getDocumentById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const docDir = path.join(STORAGE_DIR, doc.rig, doc.docType, doc.docGroup, doc.documentId);
  const filePath = path.join(docDir, req.params.filename);

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

module.exports = router;
