const express = require('express');
const router  = express.Router();
const svc     = require('../services/documentService');

router.get('/', (req, res) => {
  const { currentUser } = req.query;
  if (!currentUser) return res.status(400).json({ error: 'currentUser required' });
  res.json(svc.getInboxForUser(currentUser));
});

module.exports = router;
