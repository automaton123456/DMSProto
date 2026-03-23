const express = require('express');
const router = express.Router();
const ds = require('../services/dataStore');

router.get('/', (req, res) => {
  const { currentUser } = req.query;
  if (!currentUser) return res.status(400).json({ error: 'currentUser required' });
  const notifs = ds.getNotificationsForUser(currentUser);
  res.json(notifs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

router.put('/:id/read', (req, res) => {
  const notif = ds.markNotificationRead(req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });
  res.json(notif);
});

router.put('/read-all', (req, res) => {
  const { currentUser } = req.body;
  if (!currentUser) return res.status(400).json({ error: 'currentUser required' });
  const notifs = ds.getNotificationsForUser(currentUser);
  notifs.forEach(n => ds.markNotificationRead(n.id));
  res.json({ success: true });
});

module.exports = router;
