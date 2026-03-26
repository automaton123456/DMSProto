const express = require('express');
const router  = express.Router();
const svc     = require('../services/documentService');

router.get('/', (req, res) => {
  const {
    documentId, rig, docType, docGroup, status, originator,
    dateFrom, dateTo, workOrder, equipment, description,
    manuName, certAuth, certNum, fullText
  } = req.query;

  const filters = {};
  if (documentId)   filters.documentId = documentId;
  if (rig)          filters.rig        = Array.isArray(rig)      ? rig      : rig.split(',');
  if (docType)      filters.docType    = Array.isArray(docType)  ? docType  : docType.split(',');
  if (docGroup)     filters.docGroup   = Array.isArray(docGroup) ? docGroup : docGroup.split(',');
  if (status)       filters.status     = Array.isArray(status)   ? status   : status.split(',');
  if (originator)   filters.originator  = originator;
  if (dateFrom)     filters.dateFrom    = dateFrom;
  if (dateTo)       filters.dateTo      = dateTo;
  if (workOrder)    filters.workOrder   = workOrder;
  if (equipment)    filters.emAssetNumber = equipment;
  if (description)  filters.description  = description;
  if (manuName)     filters.manuName     = manuName;
  if (certAuth)     filters.certAuth     = certAuth;
  if (certNum)      filters.certNum      = certNum;
  if (fullText)     filters.fullText     = fullText;

  res.json(svc.queryDocuments(filters));
});

router.get('/export', (req, res) => {
  const {
    documentId, rig, docType, docGroup, status, originator,
    dateFrom, dateTo, workOrder, equipment, description, fullText
  } = req.query;

  const filters = {};
  if (documentId)  filters.documentId = documentId;
  if (rig)         filters.rig        = rig.split(',');
  if (docType)     filters.docType    = docType.split(',');
  if (docGroup)    filters.docGroup   = docGroup.split(',');
  if (status)      filters.status     = status.split(',');
  if (originator)  filters.originator  = originator;
  if (dateFrom)    filters.dateFrom    = dateFrom;
  if (dateTo)      filters.dateTo      = dateTo;
  if (workOrder)   filters.workOrder   = workOrder;
  if (equipment)   filters.emAssetNumber = equipment;
  if (description) filters.description  = description;
  if (fullText)    filters.fullText     = fullText;

  const docs = svc.queryDocuments(filters);

  const headers = [
    'Document ID', 'Version', 'Rig', 'Doc Type', 'Doc Group', 'Description',
    'Manufacturer', 'Cert Auth', 'Cert No', 'Doc Date',
    'Originator', 'Status', 'Date Created', 'Work Order', 'E&M Asset Number'
  ];
  const rows = docs.map(d => [
    d.documentId,
    d.version || '1.0',
    d.rig,
    d.docType,
    d.docGroup,
    d.classifications?.addDesc || '',
    d.classifications?.manuName || '',
    d.classifications?.certAuth || '',
    d.classifications?.certNum || '',
    d.classifications?.docDate || '',
    d.originator,
    d.status,
    d.createdDate,
    d.objectLinks?.[0]?.workOrder || '',
    d.objectLinks?.[0]?.em_asset_number || ''
  ]);

  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="dms-report-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

module.exports = router;
