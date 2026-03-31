const express = require('express');
const router  = express.Router();
const svc     = require('../services/documentService');

router.get('/', (req, res) => {
  const {
    documentId, rig, docType, docGroup, status, originator,
    dateFrom, dateTo, workOrder, equipment, description,
    workOrderDescription, owningDepartmentId,
    docDate, manuName, manuSerial, alertNum, certAuth, certNum, docLoc,
    equipmentDescription, fullText
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
  if (workOrderDescription) filters.workOrderDescription = workOrderDescription;
  if (equipment)    filters.emAssetNumber = equipment;
  if (owningDepartmentId) filters.owningDepartmentId = owningDepartmentId;
  if (description)  filters.description  = description;
  if (docDate)      filters.docDate      = docDate;
  if (manuName)     filters.manuName     = manuName;
  if (manuSerial)   filters.manuSerial   = manuSerial;
  if (alertNum)     filters.alertNum     = alertNum;
  if (certAuth)     filters.certAuth     = certAuth;
  if (certNum)      filters.certNum      = certNum;
  if (docLoc)       filters.docLoc       = docLoc;
  if (equipmentDescription) filters.equipmentDescription = equipmentDescription;
  if (fullText)     filters.fullText     = fullText;

  res.json(svc.queryDocuments(filters));
});

router.get('/export', (req, res) => {
  const {
    documentId, rig, docType, docGroup, status, originator,
    dateFrom, dateTo, workOrder, equipment, description,
    workOrderDescription, owningDepartmentId,
    docDate, manuName, manuSerial, alertNum, certAuth, certNum, docLoc,
    equipmentDescription, fullText
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
  if (workOrderDescription) filters.workOrderDescription = workOrderDescription;
  if (equipment)   filters.emAssetNumber = equipment;
  if (owningDepartmentId) filters.owningDepartmentId = owningDepartmentId;
  if (description) filters.description  = description;
  if (docDate)     filters.docDate      = docDate;
  if (manuName)    filters.manuName     = manuName;
  if (manuSerial)  filters.manuSerial   = manuSerial;
  if (alertNum)    filters.alertNum     = alertNum;
  if (certAuth)    filters.certAuth     = certAuth;
  if (certNum)     filters.certNum      = certNum;
  if (docLoc)      filters.docLoc       = docLoc;
  if (equipmentDescription) filters.equipmentDescription = equipmentDescription;
  if (fullText)    filters.fullText     = fullText;

  const docs = svc.queryDocuments(filters);

  const headers = [
    'Document ID', 'Version', 'Rig', 'Doc Type', 'Doc Group', 'Description',
    'Manufacturer', 'Manufacturer Serial', 'Alert Number', 'Cert Auth', 'Cert No', 'Doc Date',
    'Document Location', 'Originator', 'Status', 'Date Created',
    'Department', 'Work Order', 'Work Order Description', 'Equipment', 'Equipment Description'
  ];
  const rows = docs.map(d => [
    d.documentId,
    d.version || '1.0',
    d.rig,
    d.docType,
    d.docGroup,
    d.classifications?.addDesc || '',
    d.classifications?.manuName || '',
    d.classifications?.manuSerial || '',
    d.classifications?.alertNum || '',
    d.classifications?.certAuth || '',
    d.classifications?.certNum || '',
    d.classifications?.docDate || '',
    d.classifications?.docLoc || '',
    d.originator,
    d.status,
    d.createdDate,
    d.objectLinks?.[0]?.owningDepartmentId || '',
    d.objectLinks?.[0]?.workOrder || '',
    d.objectLinks?.[0]?.workOrderDescription || '',
    d.objectLinks?.[0]?.em_asset_number || '',
    d.objectLinks?.[0]?.equipmentDescription || ''
  ]);

  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="dms-report-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

module.exports = router;
