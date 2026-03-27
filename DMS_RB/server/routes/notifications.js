const express   = require('express');
const router    = express.Router();
const notifRepo = require('../repositories/notificationRepository');

router.get('/', (req, res) => {
  const { currentUser } = req.query;
  if (!currentUser) return res.status(400).json({ error: 'currentUser required' });
  res.json(notifRepo.getForUser(currentUser));
});

router.put('/:id/read', (req, res) => {
  notifRepo.markRead(req.params.id);
  res.json({ success: true });
});

router.put('/read-all', (req, res) => {
  const { currentUser } = req.body;
  if (!currentUser) return res.status(400).json({ error: 'currentUser required' });
  notifRepo.markAllReadForUser(currentUser);
  res.json({ success: true });
});

module.exports = router;
