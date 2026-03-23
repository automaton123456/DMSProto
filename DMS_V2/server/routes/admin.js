const express = require('express');
const router = express.Router();
const ds = require('../services/dataStore');
const fs = require('fs');
const path = require('path');

const APPROVERS_FILE = path.join(__dirname, '..', '..', 'data', 'config', 'approvers.json');
const USERS_FILE = path.join(__dirname, '..', '..', 'data', 'users.json');

// Get approver config
router.get('/workflow-approvers', (req, res) => {
  res.json(ds.getApprovers());
});

// Update approver config
router.put('/workflow-approvers', (req, res) => {
  const config = req.body;
  fs.writeFileSync(APPROVERS_FILE, JSON.stringify(config, null, 2));
  res.json({ success: true });
});

// Get users
router.get('/users', (req, res) => {
  res.json(ds.getUsers());
});

// Update user role
router.put('/users/:username/role', (req, res) => {
  const { role } = req.body;
  const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const user = usersData.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.role = role;
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
  res.json(user);
});

// Get stats
router.get('/stats', (req, res) => {
  const allDocs = ds.getAllDocuments().documents;
  const byStatus = {};
  allDocs.forEach(d => { byStatus[d.status] = (byStatus[d.status] || 0) + 1; });
  res.json({ total: allDocs.length, byStatus });
});

module.exports = router;
