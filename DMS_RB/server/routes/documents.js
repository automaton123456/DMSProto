const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const router   = express.Router();
const svc      = require('../services/documentService');
const wf       = require('../services/workflowService');
const docRepo  = require('../repositories/documentRepository');
const histRepo = require('../repositories/historyRepository');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage');
const upload = multer({ dest: path.join(STORAGE_DIR, 'tmp') });

// GET /api/documents/:id
router.get('/:id', (req, res) => {
  const doc = svc.getDocumentById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

// POST /api/documents
router.post('/', (req, res) => {
  try {
    const { currentUser, action, ...docData } = req.body;
    if (!currentUser) return res.status(400).json({ error: 'currentUser required' });
    const doc = svc.createDocument(docData, currentUser, action || 'draft');
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/documents/:id
router.put('/:id', (req, res) => {
  try {
    const existing = svc.getDocumentById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Document not found' });
    const { currentUser, action, ...docData } = req.body;
    if (!currentUser) return res.status(400).json({ error: 'currentUser required' });
    if (!svc.canEditDocument(existing, currentUser)) {
      return res.status(403).json({ error: 'Not authorized to edit this document' });
    }
    const doc = svc.updateDocument(req.params.id, docData, currentUser, action);
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', (req, res) => {
  const existing = svc.getDocumentById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Document not found' });
  if (existing.status !== 'Draft') return res.status(403).json({ error: 'Only drafts can be deleted' });
  svc.deleteDocument(req.params.id);
  res.json({ success: true });
});

// POST /api/documents/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    const doc = svc.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const { currentUser } = req.body;
    if (!wf.isApproverForDocument(doc, currentUser)) {
      return res.status(403).json({ error: 'Not authorized to approve this document' });
    }
    await wf.approveStep(doc, currentUser);
    res.json(svc.getDocumentById(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/:id/reject
router.post('/:id/reject', async (req, res) => {
  try {
    const doc = svc.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const { currentUser, reason } = req.body;
    if (!wf.isApproverForDocument(doc, currentUser)) {
      return res.status(403).json({ error: 'Not authorized to reject this document' });
    }
    await wf.rejectStep(doc, currentUser, reason || '');
    res.json(svc.getDocumentById(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/:id/resubmit
router.post('/:id/resubmit', async (req, res) => {
  try {
    const doc = svc.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const { currentUser } = req.body;
    await wf.resubmitWorkflow(doc, currentUser);
    res.json(svc.getDocumentById(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id/history
router.get('/:id/history', (req, res) => {
  const doc = svc.getDocumentById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(histRepo.getForDocument(req.params.id));
});

// POST /api/documents/:id/attachments
router.post('/:id/attachments', upload.array('files', 20), (req, res) => {
  try {
    const doc = svc.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const { currentUser } = req.body;
    if (!currentUser) return res.status(400).json({ error: 'currentUser required' });
    if (!svc.canEditDocument(doc, currentUser)) {
      return res.status(403).json({ error: 'Not authorized to edit attachments for this document' });
    }
    const user = svc.getUserByUsername(currentUser);

    const docDir = path.join(STORAGE_DIR, doc.rig, doc.docType, doc.docGroup, doc.documentId);
    if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });

    const addedFiles = [];
    const existingCount = doc.attachments.length;

    req.files.forEach((file, idx) => {
      const newName = svc.buildAttachmentName(doc, file.originalname, existingCount + idx);
      const dest    = path.join(docDir, newName);
      fs.renameSync(file.path, dest);

      docRepo.addAttachment(doc.documentId, {
        filename:    newName,
        originalName:file.originalname,
        filePath:    dest,
        fileSize:    file.size,
        mimeType:    file.mimetype,
        uploadedBy:  currentUser || 'unknown'
      });
      addedFiles.push(newName);
    });

    const updated = svc.getDocumentById(req.params.id);
    histRepo.add({
      documentId: doc.documentId,
      version: updated.version,
      changedBy: currentUser,
      changedByName: user?.displayName || currentUser,
      changeType: 'attachment_add',
      changeSummary: `Attachments added by ${user?.displayName || currentUser}: ${addedFiles.join(', ')}`,
      previousData: {
        changes: [{
          field: 'attachments',
          label: 'Attachments',
          before: 'No new files',
          after: addedFiles.join(', ')
        }]
      }
    });
    res.json({ attachments: updated.attachments, added: addedFiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:id/attachments/:filename
router.delete('/:id/attachments/:filename', (req, res) => {
  try {
    const doc = svc.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const { currentUser } = req.body || {};
    if (!currentUser) return res.status(400).json({ error: 'currentUser required' });
    if (!svc.canEditDocument(doc, currentUser)) {
      return res.status(403).json({ error: 'Not authorized to edit attachments for this document' });
    }
    const user = svc.getUserByUsername(currentUser);

    const filename = req.params.filename;
    const docDir   = path.join(STORAGE_DIR, doc.rig, doc.docType, doc.docGroup, doc.documentId);
    const filePath = path.join(docDir, filename);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    docRepo.removeAttachment(doc.documentId, filename);

    const updated = svc.getDocumentById(req.params.id);
    histRepo.add({
      documentId: doc.documentId,
      version: updated.version,
      changedBy: currentUser,
      changedByName: user?.displayName || currentUser,
      changeType: 'attachment_remove',
      changeSummary: `Attachment removed by ${user?.displayName || currentUser}: ${filename}`,
      previousData: {
        changes: [{
          field: 'attachments',
          label: 'Attachments',
          before: filename,
          after: 'Removed'
        }]
      }
    });
    res.json({ attachments: updated.attachments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id/attachments/:filename
router.get('/:id/attachments/:filename', (req, res) => {
  const doc = svc.getDocumentById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const docDir   = path.join(STORAGE_DIR, doc.rig, doc.docType, doc.docGroup, doc.documentId);
  const filePath = path.join(docDir, req.params.filename);

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

module.exports = router;
