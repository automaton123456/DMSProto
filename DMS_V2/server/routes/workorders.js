const express = require('express');
const router = express.Router();
const ds = require('../services/dataStore');

router.get('/', (req, res) => {
  try {
    const { search, rig } = req.query;
    let results = ds.getWorkOrders(search, rig);
    // Only released inspection work orders for validation
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
