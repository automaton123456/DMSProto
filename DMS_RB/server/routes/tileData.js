const express   = require('express');
const router    = express.Router();
const svc       = require('../services/documentService');
const notifRepo = require('../repositories/notificationRepository');

router.get('/', (req, res) => {
  const { currentUser } = req.query;
  if (!currentUser) return res.status(400).json({ error: 'currentUser required' });

  const inboxCount    = svc.getInboxForUser(currentUser).length;
  const myDocsCount   = svc.queryDocuments({ originator: currentUser }).length;
  const unreadNotifs  = notifRepo.getForUser(currentUser).filter(n => !n.read).length;

  res.json({ inboxCount, myDocsCount, unreadNotifs });
});

module.exports = router;
