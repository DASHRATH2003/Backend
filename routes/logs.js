const { Router } = require('express');
const { db } = require('../db');

const router = Router();

router.get('/', (req, res) => {
  db.all('SELECT * FROM logs ORDER BY id DESC LIMIT 100', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Clear all log entries
router.post('/clear', (req, res) => {
  db.run('DELETE FROM logs', [], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ cleared: true });
  });
});

// RESTful alternative: DELETE /api/logs
router.delete('/', (req, res) => {
  db.run('DELETE FROM logs', [], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ cleared: true });
  });
});

module.exports = router;