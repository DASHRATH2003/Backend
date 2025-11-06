const { Router } = require('express');
const { db } = require('../db');

const router = Router();

router.get('/', (req, res) => {
  db.all('SELECT * FROM accounts', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { email, password, smtp_host, smtp_port, imap_host, imap_port, use_tls } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  db.run(
    `INSERT INTO accounts (email, password, smtp_host, smtp_port, imap_host, imap_port, use_tls)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [email, password, smtp_host || null, smtp_port || null, imap_host || null, imap_port || null, use_tls ? 1 : 1],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM accounts WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;