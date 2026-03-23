const express = require('express');
const router = express.Router();
const ds = require('../services/dataStore');

router.get('/', (req, res) => {
  const { currentUser } = req.query;
  if (!currentUser) return res.status(400).json({ error: 'currentUser required' });

  const docs = ds.queryDocuments({ originator: currentUser });
  res.json(docs.sort((a, b) => b.createdDate.localeCompare(a.createdDate)));
});

module.exports = router;
