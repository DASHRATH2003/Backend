const { Router } = require('express');
const { setSettings } = require('../db');

const router = Router();

router.post('/', (req, res) => {
  const { dailyVolume, maxVolume } = req.body;
  setSettings({ daily_volume: dailyVolume, max_volume: maxVolume }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

module.exports = router;