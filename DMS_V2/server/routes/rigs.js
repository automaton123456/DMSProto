const express = require('express');
const router  = express.Router();
const svc     = require('../services/documentService');

router.get('/', (req, res) => {
  try {
    res.json(svc.getRigs());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
