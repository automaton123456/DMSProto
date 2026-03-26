const express = require('express');
const router  = express.Router();
const svc     = require('../services/documentService');

router.get('/', (req, res) => {
  try {
    const { search, rig } = req.query;
    let results = svc.getWorkOrders(search, rig);
    if (req.query.validate) {
      results = results.filter(wo =>
        wo.Status === 'Released' &&
        (wo.WorkOrderTypeDisp === 'Inspection Opex' || wo.WorkOrderTypeDisp === 'Inspection Capex')
      );
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
