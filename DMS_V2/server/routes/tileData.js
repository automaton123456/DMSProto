const express = require('express');
const router = express.Router();
const ds = require('../services/dataStore');
const wf = require('../services/workflowService');

router.get('/', (req, res) => {
  const { currentUser } = req.query;
  if (!currentUser) return res.status(400).json({ error: 'currentUser required' });

  const allDocs = ds.getAllDocuments().documents;

  const inboxCount = allDocs.filter(d => wf.isApproverForDocument(d, currentUser)).length;
  const myDocsCount = allDocs.filter(d => d.originatorUsername === currentUser).length;
  const unreadNotifs = ds.getNotificationsForUser(currentUser).filter(n => !n.read).length;

  res.json({ inboxCount, myDocsCount, unreadNotifs });
});

module.exports = router;
