const express  = require('express');
const router   = express.Router();
const userRepo = require('../repositories/userRepository');

router.get('/', (req, res) => {
  res.json(userRepo.getAll().map(u => ({
    username:    u.username,
    displayName: u.display_name,
    role:        u.role
  })));
});

router.get('/:username', (req, res) => {
  const user = userRepo.getByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(userRepo.toApiShape(user));
});

module.exports = router;
