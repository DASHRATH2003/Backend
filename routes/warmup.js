const { Router } = require('express');
const { startScheduler, stopScheduler } = require('../scheduler');

const router = Router();

router.post('/start', (req, res) => {
  startScheduler();
  res.json({ active: true });
});

router.post('/stop', (req, res) => {
  stopScheduler();
  res.json({ active: false });
});

module.exports = router;