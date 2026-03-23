const express = require('express');
const router = express.Router();
const ds = require('../services/dataStore');

router.get('/document-types', (req, res) => {
  const config = ds.getDocGen();
  res.json(config.docTypes);
});

router.get('/document-groups/:docType', (req, res) => {
  const config = ds.getDocGen();
  const groups = config.docGroups[req.params.docType] || [];
  res.json(groups);
});

router.get('/field-config/:docGroup', (req, res) => {
  const config = ds.getFieldVisibility();
  const groupConfig = config[req.params.docGroup];
  if (!groupConfig) return res.status(404).json({ error: 'Group not found' });
  res.json(groupConfig);
});

router.get('/naming-config/:docGroup', (req, res) => {
  const config = ds.getAttachmentNaming();
  const namingConfig = config[req.params.docGroup] || [];
  res.json(namingConfig);
});

module.exports = router;
