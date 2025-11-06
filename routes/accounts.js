const { Router } = require('express');
const { db } = require('../db');
const usePg = process.env.USE_POSTGRES === 'true' || !!process.env.DATABASE_URL;

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

  const params = [
    email,
    password,
    smtp_host || null,
    smtp_port || null,
    imap_host || null,
    imap_port || null,
    usePg ? !!use_tls : (use_tls ? 1 : 0),
  ];

  const sql = usePg
    ? `INSERT INTO accounts (email, password, smtp_host, smtp_port, imap_host, imap_port, use_tls)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`
    : `INSERT INTO accounts (email, password, smtp_host, smtp_port, imap_host, imap_port, use_tls)
       VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, params, function (err, result) {
    if (err) return res.status(500).json({ error: err.message });
    const id = usePg ? (result?.rows?.[0]?.id) : this.lastID;
    res.json({ id });
  });
});

router.delete('/:id', (req, res) => {
  const sql = usePg ? 'DELETE FROM accounts WHERE id = $1' : 'DELETE FROM accounts WHERE id = ?';
  const params = [req.params.id];
  db.run(sql, params, function (err, result) {
    if (err) return res.status(500).json({ error: err.message });
    const deleted = usePg ? (result?.rowCount ?? 0) : this.changes;
    res.json({ deleted });
  });
});

module.exports = router;