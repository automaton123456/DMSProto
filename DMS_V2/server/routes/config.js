const express  = require('express');
const router   = express.Router();
const cfgRepo  = require('../repositories/configRepository');

router.get('/document-types', (req, res) => {
  const types = cfgRepo.getDocTypes();
  res.json(types.map(t => ({ code: t.code, description: t.description })));
});

router.get('/document-groups/:docType', (req, res) => {
  const groups = cfgRepo.getDocGroups(req.params.docType);
  res.json(groups.map(g => ({ code: g.code, description: g.description })));
});

router.get('/field-config/:docGroup', (req, res) => {
  const config = cfgRepo.getFieldVisibility(req.params.docGroup);
  if (!config || Object.keys(config).length === 0) return res.status(404).json({ error: 'Group not found' });
  res.json(config);
});

router.get('/naming-config/:docGroup', (req, res) => {
  res.json(cfgRepo.getAttachmentNaming(req.params.docGroup));
});

module.exports = router;
