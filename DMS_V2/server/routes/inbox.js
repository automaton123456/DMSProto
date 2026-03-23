const express = require('express');
const router = express.Router();
const ds = require('../services/dataStore');
const wf = require('../services/workflowService');

router.get('/', (req, res) => {
  const { currentUser } = req.query;
  if (!currentUser) return res.status(400).json({ error: 'currentUser required' });

  const allDocs = ds.getAllDocuments().documents;
  const inboxItems = allDocs.filter(doc => wf.isApproverForDocument(doc, currentUser));

  res.json(inboxItems);
});

module.exports = router;
