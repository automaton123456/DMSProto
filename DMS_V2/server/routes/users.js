const express = require('express');
const router = express.Router();
const ds = require('../services/dataStore');

router.get('/', (req, res) => {
  res.json(ds.getUsers().map(u => ({ username: u.username, displayName: u.displayName, role: u.role })));
});

router.get('/:username', (req, res) => {
  const user = ds.getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
