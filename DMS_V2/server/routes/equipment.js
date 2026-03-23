const express = require('express');
const router = express.Router();
const ds = require('../services/dataStore');

router.get('/', (req, res) => {
  try {
    const { search, rig } = req.query;
    res.json(ds.getEquipment(search, rig));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
