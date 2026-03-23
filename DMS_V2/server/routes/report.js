const express = require('express');
const router = express.Router();
const ds = require('../services/dataStore');

router.get('/', (req, res) => {
  const { documentId, rig, docType, docGroup, status, originator, dateFrom, dateTo, workOrder, equipment, description } = req.query;

  const filters = {};
  if (documentId) filters.documentId = documentId;
  if (rig) filters.rig = Array.isArray(rig) ? rig : rig.split(',');
  if (docType) filters.docType = Array.isArray(docType) ? docType : docType.split(',');
  if (docGroup) filters.docGroup = Array.isArray(docGroup) ? docGroup : docGroup.split(',');
  if (status) filters.status = Array.isArray(status) ? status : status.split(',');
  if (originator) filters.originator = originator;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  if (workOrder) filters.workOrder = workOrder;
  if (equipment) filters.equipment = equipment;
  if (description) filters.description = description;

  const docs = ds.queryDocuments(filters);
  res.json(docs.sort((a, b) => b.createdDate.localeCompare(a.createdDate)));
});

// Export as CSV
router.get('/export', (req, res) => {
  const { documentId, rig, docType, docGroup, status, originator, dateFrom, dateTo } = req.query;
  const filters = {};
  if (rig) filters.rig = rig.split(',');
  if (docType) filters.docType = docType.split(',');
  if (status) filters.status = status.split(',');
  if (originator) filters.originator = originator;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  const docs = ds.queryDocuments(filters);

  const headers = ['Document ID', 'Rig', 'Doc Type', 'Doc Group', 'Description', 'Originator', 'Status', 'Date Created', 'Work Order', 'Equipment'];
  const rows = docs.map(d => [
    d.documentId,
    d.rig,
    d.docType,
    d.docGroup,
    d.classifications?.addDesc || '',
    d.originator,
    d.status,
    d.createdDate,
    d.objectLinks?.[0]?.workOrder || '',
    d.objectLinks?.[0]?.equipmentText || ''
  ]);

  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="dms-report-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

module.exports = router;
