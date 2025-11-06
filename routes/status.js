const { Router } = require('express');
const { getSettings, db } = require('../db');
const { isSchedulerActive } = require('../scheduler');

const router = Router();

router.get('/', (req, res) => {
  getSettings((err, settings) => {
    if (err || !settings) return res.status(500).json({ error: err?.message || 'settings missing' });
    db.get('SELECT COUNT(*) as accountCount FROM accounts', (accErr, countRow) => {
      if (accErr) return res.status(500).json({ error: accErr.message });
      res.json({
        schedulerActive: isSchedulerActive(),
        dailyVolume: settings.daily_volume,
        maxVolume: settings.max_volume,
        accountCount: countRow.accountCount,
      });
    });
  });
});

module.exports = router;