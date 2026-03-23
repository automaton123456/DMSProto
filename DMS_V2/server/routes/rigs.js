const express = require('express');
const router = express.Router();
const ds = require('../services/dataStore');

router.get('/', (req, res) => {
  try {
    res.json(ds.getRigs());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
